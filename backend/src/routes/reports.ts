import { Router } from 'express';
import { query, one } from '../db.js';
import type { AuthedRequest } from '../types.js';

const router = Router();

router.get('/dashboard', async (req: AuthedRequest, res) => {
  const org = req.user!.organization_id;
  const counts = await one<any>(
    `select
      (select count(*)::int from suppliers where organization_id=$1) as suppliers,
      (select count(*)::int from tenders where organization_id=$1) as tenders,
      (select count(*)::int from contracts where organization_id=$1) as contracts,
      (select count(*)::int from invoices where organization_id=$1) as invoices,
      (select coalesce(sum(total),0)::numeric from invoices where organization_id=$1) as invoice_total`,
    [org]
  );
  const tendersByStatus = await query('select status, count(*)::int from tenders where organization_id=$1 group by status order by status', [org]);
  const invoicesByStatus = await query('select status, count(*)::int, coalesce(sum(total),0)::numeric as total from invoices where organization_id=$1 group by status order by status', [org]);
  const recentAudit = await query('select action, entity_type, metadata, created_at from audit_logs where organization_id=$1 order by created_at desc limit 8', [org]);
  res.json({ counts, tendersByStatus, invoicesByStatus, recentAudit });
});

export default router;
