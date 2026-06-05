import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { one, query } from '../db.js';
import { audit } from '../services/audit.js';
import type { AuthedRequest } from '../types.js';

const router = Router();

const generateSchema = z.object({
  tender_id: z.string().uuid().optional().nullable(),
  supplier_id: z.string().uuid(),
  bid_id: z.string().uuid().optional().nullable(),
  title: z.string().min(3),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  special_terms: z.string().optional().nullable()
});

function contractNumber() {
  const stamp = new Date().toISOString().slice(0,10).replaceAll('-', '');
  return `IFPI-CON-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

function buildContractContent(args: any) {
  const flags = args.compliance_flags;
  return `CONTRATO DE FORNECIMENTO / PRESTAÇÃO DE SERVIÇOS

ENTIDADE CONTRATANTE: Instituto de Formação de Professores de Inhamizua
FORNECEDOR: ${args.supplier.name}
NIF DO FORNECEDOR: ${args.supplier.nif ?? 'Não informado'}
REFERÊNCIA DO CONCURSO: ${args.tender?.reference_number ?? 'Não aplicável'}
VALOR CONTRATUAL: ${Number(args.value).toLocaleString('pt-MZ')} ${args.currency}

1. OBJETO
O presente contrato regula a aquisição/fornecimento relacionado com: ${args.title}.

2. BASE DO PROCESSO
O processo fica registado para efeitos de transparência, rastreabilidade, avaliação de fornecedores e auditoria interna, em alinhamento com os procedimentos de contratação pública aplicáveis.

3. PRAZO
Data de início: ${args.start_date ?? 'A definir'}
Data de fim: ${args.end_date ?? 'A definir'}

4. OBRIGAÇÕES DO FORNECEDOR
O fornecedor deve entregar os bens ou serviços contratados de acordo com as especificações, qualidade, prazo e preço aprovados.

5. OBRIGAÇÕES DA ENTIDADE CONTRATANTE
A entidade contratante deve validar a conformidade da entrega, processar a documentação de pagamento e manter registos de auditoria.

6. CONFORMIDADE
- Divulgação de beneficiário efectivo requerida: ${flags.beneficialOwnershipRequired ? 'Sim' : 'Não'}
- Divulgação registada no fornecedor: ${args.supplier.beneficial_ownership_disclosed ? 'Sim' : 'Não'}
- Preferência local aplicável: ${flags.localPreferenceRelevant ? 'Sim' : 'Não'}

7. TERMOS ESPECIAIS
${args.special_terms ?? 'Sem termos especiais adicionais.'}

8. ASSINATURAS
Pela Entidade Contratante: ___________________________
Pelo Fornecedor: ___________________________

Gerado automaticamente pelo Sistema de Procurement do IFP Inhamizua.`;
}

router.get('/', async (req: AuthedRequest, res) => {
  const rows = await query(
    `select c.*, s.name as supplier_name, t.reference_number as tender_reference
     from contracts c
     left join suppliers s on s.id=c.supplier_id
     left join tenders t on t.id=c.tender_id
     where c.organization_id=$1
     order by c.created_at desc`,
    [req.user!.organization_id]
  );
  res.json(rows);
});

router.post('/generate', async (req: AuthedRequest, res) => {
  const body = generateSchema.parse(req.body);
  const supplier = await one<any>('select * from suppliers where id=$1 and organization_id=$2', [body.supplier_id, req.user!.organization_id]);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const tender = body.tender_id ? await one<any>('select * from tenders where id=$1 and organization_id=$2', [body.tender_id, req.user!.organization_id]) : null;
  const bid = body.bid_id ? await one<any>('select * from bids where id=$1', [body.bid_id]) : null;
  const value = bid?.amount ?? tender?.budget ?? 0;
  const currency = bid?.currency ?? tender?.currency ?? 'MZN';
  const compliance_flags = {
    beneficialOwnershipRequired: Number(value) >= config.beneficialOwnershipThreshold,
    localPreferenceRelevant: Boolean(supplier.local_supplier),
    retentionYears: config.invoiceRetentionYears
  };
  const content = buildContractContent({ ...body, supplier, tender, bid, value, currency, compliance_flags });
  const row = await one(
    `insert into contracts (organization_id,tender_id,supplier_id,bid_id,contract_number,title,value,currency,start_date,end_date,status,content,compliance_flags,created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,$12,$13) returning *`,
    [req.user!.organization_id, body.tender_id ?? null, body.supplier_id, body.bid_id ?? null, contractNumber(), body.title, value, currency, body.start_date ?? null, body.end_date ?? null, content, JSON.stringify(compliance_flags), req.user!.id]
  );
  await audit(req.user, 'generate', 'contract', row.id, { contract_number: row.contract_number }, req.ip);
  res.status(201).json(row);
});

router.get('/:id', async (req: AuthedRequest, res) => {
  const row = await one('select * from contracts where id=$1 and organization_id=$2', [req.params.id, req.user!.organization_id]);
  if (!row) return res.status(404).json({ error: 'Contract not found' });
  res.json(row);
});

router.patch('/:id/status', async (req: AuthedRequest, res) => {
  const body = z.object({ status: z.enum(['draft','under_review','approved','signed','active','completed','terminated']) }).parse(req.body);
  const row = await one('update contracts set status=$3, updated_at=now() where id=$1 and organization_id=$2 returning *', [req.params.id, req.user!.organization_id, body.status]);
  if (!row) return res.status(404).json({ error: 'Contract not found' });
  await audit(req.user, 'status_change', 'contract', row.id, { status: body.status }, req.ip);
  res.json(row);
});

export default router;
