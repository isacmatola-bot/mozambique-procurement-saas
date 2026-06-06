import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db.js';
import { audit } from '../services/audit.js';
import type { AuthedRequest } from '../types.js';

const router = Router();

const tenderSchema = z.object({
  title: z.string().min(3),
  reference_number: z.string().min(2),
  procurement_method: z.enum(['public_tender','limited_tender','direct_award','quotation']),
  category: z.string().default('goods'),
  description: z.string().optional().nullable(),
  budget: z.coerce.number().nonnegative(),
  currency: z.string().default('MZN'),
  deadline: z.string(),
  status: z.enum(['draft','published','evaluation','awarded','cancelled','closed']).default('draft'),
  evaluation_criteria: z.array(z.object({ name: z.string(), weight: z.number() })).default([])
});

const bidSchema = z.object({
  supplier_id: z.string().uuid(),
  amount: z.coerce.number().nonnegative(),
  currency: z.string().default('MZN'),
  technical_score: z.coerce.number().min(0).max(100).default(0),
  financial_score: z.coerce.number().min(0).max(100).default(0),
  local_preference_applied: z.boolean().default(false),
  status: z.enum(['submitted','under_review','qualified','disqualified','winner','rejected']).default('submitted'),
  notes: z.string().optional().nullable()
});

function totalScore(technical: number, financial: number, localPreference: boolean) {
  const base = technical * 0.6 + financial * 0.4;
  return Math.min(100, Number((base + (localPreference ? 5 : 0)).toFixed(2)));
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(2))));
}

function autoScoreBid(tender: any, supplier: any, amount: number) {
  const reasons: string[] = [];
  const tenderCategory = normalizeText(tender.category);
  const supplierCategory = normalizeText(supplier.category);
  const supplierStatus = normalizeText(supplier.status || 'active');
  const budget = Number(tender.budget || 0);
  const bidAmount = Number(amount || 0);

  let technical = 55;

  if (tenderCategory && supplierCategory && tenderCategory === supplierCategory) {
    technical += 30;
    reasons.push('Supplier category exactly matches the tender category.');
  } else if (
    tenderCategory &&
    supplierCategory &&
    (supplierCategory.includes(tenderCategory) || tenderCategory.includes(supplierCategory))
  ) {
    technical += 18;
    reasons.push('Supplier category partially matches the tender category.');
  } else {
    technical -= 25;
    reasons.push('Supplier category does not match the tender category.');
  }

  if (supplierStatus === 'active') {
    technical += 10;
    reasons.push('Supplier status is active.');
  } else {
    technical -= 30;
    reasons.push(`Supplier status is ${supplierStatus}, which reduces technical confidence.`);
  }

  if (supplier.beneficial_ownership_disclosed) {
    technical += 5;
    reasons.push('Beneficial ownership is disclosed.');
  } else {
    technical -= 10;
    reasons.push('Beneficial ownership is not disclosed.');
  }

  if (supplier.local_supplier) {
    technical += 5;
    reasons.push('Local supplier preference considered.');
  }

  const riskScore = Number(supplier.risk_score || 0);
  if (riskScore > 0) {
    const riskPenalty = Math.min(25, riskScore * 0.25);
    technical -= riskPenalty;
    reasons.push(`Supplier risk score penalty applied: ${riskScore}.`);
  }

  let financial = 60;

  if (budget <= 0 || bidAmount <= 0) {
    financial = 0;
    reasons.push('Tender budget or bid amount is missing, so financial score is zero.');
  } else {
    const ratio = bidAmount / budget;

    if (ratio > 1.25) {
      financial = 25;
      reasons.push('Bid amount is more than 25% above tender budget.');
    } else if (ratio > 1.1) {
      financial = 45;
      reasons.push('Bid amount is more than 10% above tender budget.');
    } else if (ratio > 1) {
      financial = 65;
      reasons.push('Bid amount is slightly above tender budget.');
    } else if (ratio >= 0.75) {
      financial = 95;
      reasons.push('Bid amount is within an acceptable competitive range.');
    } else if (ratio >= 0.5) {
      financial = 75;
      reasons.push('Bid amount is low compared with the tender budget; underpricing risk considered.');
    } else if (ratio >= 0.35) {
      financial = 55;
      reasons.push('Bid amount is very low compared with the tender budget; stronger underpricing risk applied.');
    } else {
      financial = 30;
      reasons.push('Bid amount is extremely low compared with the tender budget; severe underpricing risk applied.');
    }
  }

  const technicalScore = clampScore(technical);
  const financialScore = clampScore(financial);

  return {
    technicalScore,
    financialScore,
    totalScore: totalScore(technicalScore, financialScore, Boolean(supplier.local_supplier)),
    reasons
  };
}

router.get('/', async (req: AuthedRequest, res) => {
  const rows = await query(
    `select t.*, count(b.id)::int as bid_count
     from tenders t
     left join bids b on b.tender_id = t.id
     where t.organization_id = $1
     group by t.id
     order by t.created_at desc`,
    [req.user!.organization_id]
  );
  res.json(rows);
});

router.post('/', async (req: AuthedRequest, res) => {
  const body = tenderSchema.parse(req.body);
  const row = await one(
    `insert into tenders (organization_id,title,reference_number,procurement_method,category,description,budget,currency,deadline,status,evaluation_criteria,created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning *`,
    [req.user!.organization_id, body.title, body.reference_number, body.procurement_method, body.category, body.description, body.budget, body.currency, body.deadline, body.status, JSON.stringify(body.evaluation_criteria), req.user!.id]
  );
  await audit(req.user, 'create', 'tender', row.id, { reference_number: row.reference_number }, req.ip);
  res.status(201).json(row);
});

router.get('/:id', async (req: AuthedRequest, res) => {
  const row = await one('select * from tenders where id=$1 and organization_id=$2', [req.params.id, req.user!.organization_id]);
  if (!row) return res.status(404).json({ error: 'Tender not found' });
  res.json(row);
});

router.patch('/:id', async (req: AuthedRequest, res) => {
  const body = tenderSchema.partial().parse(req.body);
  const current = await one('select * from tenders where id=$1 and organization_id=$2', [req.params.id, req.user!.organization_id]);
  if (!current) return res.status(404).json({ error: 'Tender not found' });
  const merged = { ...current, ...body };
  const row = await one(
    `update tenders set title=$3,reference_number=$4,procurement_method=$5,category=$6,description=$7,budget=$8,currency=$9,deadline=$10,status=$11,evaluation_criteria=$12,updated_at=now()
     where id=$1 and organization_id=$2 returning *`,
    [req.params.id, req.user!.organization_id, merged.title, merged.reference_number, merged.procurement_method, merged.category, merged.description, merged.budget, merged.currency, merged.deadline, merged.status, JSON.stringify(merged.evaluation_criteria)]
  );
  await audit(req.user, 'update', 'tender', row.id, { reference_number: row.reference_number }, req.ip);
  res.json(row);
});

router.get('/:id/bids', async (req: AuthedRequest, res) => {
  const rows = await query(
    `select b.*, s.name as supplier_name, s.local_supplier
     from bids b join suppliers s on s.id=b.supplier_id
     join tenders t on t.id=b.tender_id
     where b.tender_id=$1 and t.organization_id=$2
     order by b.total_score desc, b.amount asc`,
    [req.params.id, req.user!.organization_id]
  );
  res.json(rows);
});

router.post('/:id/bids', async (req: AuthedRequest, res) => {
  const body = bidSchema.parse(req.body);
  const tender = await one(
    'select id,title,category,budget,procurement_method from tenders where id=$1 and organization_id=$2',
    [req.params.id, req.user!.organization_id]
  );
  if (!tender) return res.status(404).json({ error: 'Tender not found' });

  const supplier = await one(
    `select id,name,category,status,risk_score,local_supplier,beneficial_ownership_disclosed
     from suppliers
     where id=$1 and organization_id=$2`,
    [body.supplier_id, req.user!.organization_id]
  );
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const autoScore = autoScoreBid(tender, supplier, body.amount);
  const autoNotes = [
    body.notes,
    `Auto scoring applied. Technical score: ${autoScore.technicalScore}. Financial score: ${autoScore.financialScore}. Reasons: ${autoScore.reasons.join(' ')}`
  ].filter(Boolean).join('\n\n');

  const row = await one(
    `insert into bids (tender_id,supplier_id,amount,currency,technical_score,financial_score,local_preference_applied,total_score,status,notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (tender_id, supplier_id) do update set amount=excluded.amount,currency=excluded.currency,technical_score=excluded.technical_score,financial_score=excluded.financial_score,local_preference_applied=excluded.local_preference_applied,total_score=excluded.total_score,status=excluded.status,notes=excluded.notes
     returning *`,
    [
      req.params.id,
      body.supplier_id,
      body.amount,
      body.currency,
      autoScore.technicalScore,
      autoScore.financialScore,
      Boolean(supplier.local_supplier),
      autoScore.totalScore,
      body.status,
      autoNotes
    ]
  );
  await audit(req.user, 'upsert', 'bid', row.id, { tender_id: req.params.id, supplier: supplier.name }, req.ip);
  res.status(201).json(row);
});

export default router;
