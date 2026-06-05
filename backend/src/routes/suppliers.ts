import { Router } from 'express';
import { z } from 'zod';
import { one, query } from '../db.js';
import { audit } from '../services/audit.js';
import type { AuthedRequest } from '../types.js';

const router = Router();

const supplierSchema = z.object({
  name: z.string().min(2),
  nif: z.string().optional().nullable(),
  registration_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  category: z.string().default('goods'),
  local_supplier: z.boolean().default(false),
  beneficial_ownership_disclosed: z.boolean().default(false),
  status: z.enum(['active','inactive','suspended']).default('active'),
  risk_score: z.number().min(0).max(100).default(0),
  notes: z.string().optional().nullable()
});

router.get('/', async (req: AuthedRequest, res) => {
  const search = String(req.query.search ?? '').trim();
  const rows = await query(
    `select * from suppliers
     where organization_id = $1
       and ($2 = '' or name ilike '%' || $2 || '%' or coalesce(nif,'') ilike '%' || $2 || '%')
     order by created_at desc`,
    [req.user!.organization_id, search]
  );
  res.json(rows);
});

router.post('/', async (req: AuthedRequest, res) => {
  const body = supplierSchema.parse(req.body);
  const row = await one(
    `insert into suppliers
     (organization_id,name,nif,registration_number,address,contact_person,email,phone,category,local_supplier,beneficial_ownership_disclosed,status,risk_score,notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     returning *`,
    [req.user!.organization_id, body.name, body.nif, body.registration_number, body.address, body.contact_person, body.email, body.phone, body.category, body.local_supplier, body.beneficial_ownership_disclosed, body.status, body.risk_score, body.notes]
  );
  await audit(req.user, 'create', 'supplier', row.id, { name: row.name }, req.ip);
  res.status(201).json(row);
});

router.get('/:id', async (req: AuthedRequest, res) => {
  const row = await one('select * from suppliers where id=$1 and organization_id=$2', [req.params.id, req.user!.organization_id]);
  if (!row) return res.status(404).json({ error: 'Supplier not found' });
  res.json(row);
});

router.patch('/:id', async (req: AuthedRequest, res) => {
  const body = supplierSchema.partial().parse(req.body);
  const current = await one('select * from suppliers where id=$1 and organization_id=$2', [req.params.id, req.user!.organization_id]);
  if (!current) return res.status(404).json({ error: 'Supplier not found' });
  const merged = { ...current, ...body };
  const row = await one(
    `update suppliers set name=$3,nif=$4,registration_number=$5,address=$6,contact_person=$7,email=$8,phone=$9,category=$10,
      local_supplier=$11,beneficial_ownership_disclosed=$12,status=$13,risk_score=$14,notes=$15,updated_at=now()
     where id=$1 and organization_id=$2 returning *`,
    [req.params.id, req.user!.organization_id, merged.name, merged.nif, merged.registration_number, merged.address, merged.contact_person, merged.email, merged.phone, merged.category, merged.local_supplier, merged.beneficial_ownership_disclosed, merged.status, merged.risk_score, merged.notes]
  );
  await audit(req.user, 'update', 'supplier', row.id, { name: row.name }, req.ip);
  res.json(row);
});

router.delete('/:id', async (req: AuthedRequest, res) => {
  const row = await one('delete from suppliers where id=$1 and organization_id=$2 returning id,name', [req.params.id, req.user!.organization_id]);
  if (!row) return res.status(404).json({ error: 'Supplier not found' });
  await audit(req.user, 'delete', 'supplier', row.id, { name: row.name }, req.ip);
  res.status(204).send();
});

export default router;
