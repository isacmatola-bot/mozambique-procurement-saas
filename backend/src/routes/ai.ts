import { Router } from 'express';
import { z } from 'zod';
import { one } from '../db.js';
import { extractContract } from '../services/openai.js';
import { audit } from '../services/audit.js';
import type { AuthedRequest } from '../types.js';

const router = Router();

router.post('/extract-contract', async (req: AuthedRequest, res) => {
  const body = z.object({ documentText: z.string().min(20), sourceName: z.string().optional().nullable() }).parse(req.body);
  const result = await extractContract(body.documentText);
  const row = await one(
    `insert into document_extractions (organization_id, source_name, document_text, extraction, model, created_by)
     values ($1,$2,$3,$4,$5,$6) returning id, extraction, model, created_at`,
    [req.user!.organization_id, body.sourceName ?? null, body.documentText, JSON.stringify(result.extraction), result.model, req.user!.id]
  );
  await audit(req.user, 'extract', 'document_extraction', row.id, { provider: result.provider, model: result.model }, req.ip);
  res.status(201).json({ ...row, provider: result.provider });
});

export default router;
