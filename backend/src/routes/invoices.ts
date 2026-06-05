import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { one, query } from '../db.js';
import { audit } from '../services/audit.js';
import type { AuthedRequest } from '../types.js';

const router = Router();

const itemSchema = z.object({
  description: z.string().min(2),
  quantity: z.coerce.number().positive(),
  unit_price: z.coerce.number().nonnegative()
});

const invoiceSchema = z.object({
  supplier_id: z.string().uuid(),
  contract_id: z.string().uuid().optional().nullable(),
  due_date: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  notes: z.string().optional().nullable()
});

function invoiceNumber() {
  const stamp = new Date().toISOString().slice(0,10).replaceAll('-', '');
  return `IFPI-INV-${stamp}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

router.get('/', async (req: AuthedRequest, res) => {
  const rows = await query(
    `select i.*, s.name as supplier_name, c.contract_number
     from invoices i
     left join suppliers s on s.id=i.supplier_id
     left join contracts c on c.id=i.contract_id
     where i.organization_id=$1
     order by i.created_at desc`,
    [req.user!.organization_id]
  );
  res.json(rows);
});

router.post('/generate', async (req: AuthedRequest, res) => {
  const body = invoiceSchema.parse(req.body);
  const supplier = await one<any>('select * from suppliers where id=$1 and organization_id=$2', [body.supplier_id, req.user!.organization_id]);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  if (body.contract_id) {
    const contract = await one('select id from contracts where id=$1 and organization_id=$2', [body.contract_id, req.user!.organization_id]);
    if (!contract) return res.status(404).json({ error: 'Contract not found' });
  }
  const subtotal = body.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const vatAmount = Number((subtotal * config.vatRate).toFixed(2));
  const total = Number((subtotal + vatAmount).toFixed(2));
  const row = await one(
    `insert into invoices (organization_id,supplier_id,contract_id,invoice_number,due_date,subtotal,vat_rate,vat_amount,total,currency,status,items,notes,created_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'MZN','issued',$10,$11,$12) returning *`,
    [req.user!.organization_id, body.supplier_id, body.contract_id ?? null, invoiceNumber(), body.due_date ?? null, subtotal, config.vatRate, vatAmount, total, JSON.stringify(body.items), body.notes ?? null, req.user!.id]
  );
  await audit(req.user, 'generate', 'invoice', row.id, { invoice_number: row.invoice_number, total }, req.ip);
  res.status(201).json(row);
});

router.get('/:id', async (req: AuthedRequest, res) => {
  const row = await one('select * from invoices where id=$1 and organization_id=$2', [req.params.id, req.user!.organization_id]);
  if (!row) return res.status(404).json({ error: 'Invoice not found' });
  res.json(row);
});

router.patch('/:id/status', async (req: AuthedRequest, res) => {
  const body = z.object({ status: z.enum(['draft','issued','paid','overdue','cancelled']) }).parse(req.body);
  const row = await one('update invoices set status=$3 where id=$1 and organization_id=$2 returning *', [req.params.id, req.user!.organization_id, body.status]);
  if (!row) return res.status(404).json({ error: 'Invoice not found' });
  await audit(req.user, 'status_change', 'invoice', row.id, { status: body.status }, req.ip);
  res.json(row);
});

export default router;
