import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { one, query } from '../db.js';
import { audit } from '../services/audit.js';
import type { AuthedRequest } from '../types.js';

const router = Router();

const uploadRoot = path.resolve(process.cwd(), 'uploads', 'suppliers');
fs.mkdirSync(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadRoot),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      return cb(new Error('Unsupported file type. Upload PDF, JPG, PNG, DOC, DOCX, XLS, or XLSX files only.'));
    }
    cb(null, true);
  }
});

const documentSchema = z.object({
  document_type: z.string().min(2).default('other'),
  notes: z.string().optional().nullable()
});

const documentStatusSchema = z.object({
  verification_status: z.enum(['pending', 'verified', 'rejected', 'expired']),
  notes: z.string().optional().nullable()
});

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


type SupplierDocumentAiRecommendation = {
  document_id: string;
  supplier_id: string;
  supplier_name: string;
  original_filename: string;
  document_type: string;
  current_status: string;
  recommended_status: 'verified' | 'rejected' | 'expired';
  confidence: number;
  reasons: string[];
  warnings: string[];
  model: string;
  provider: string;
};

function buildSupplierDocumentAiRecommendation(doc: any): SupplierDocumentAiRecommendation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let recommendedStatus: 'verified' | 'rejected' | 'expired' = 'verified';
  let confidence = 70;

  const filename = String(doc.original_filename || '').toLowerCase();
  const documentType = String(doc.document_type || '').toLowerCase();
  const mimeType = String(doc.mime_type || '').toLowerCase();
  const sizeBytes = Number(doc.size_bytes || 0);

  if (!fs.existsSync(doc.file_path)) {
    recommendedStatus = 'rejected';
    confidence = 95;
    reasons.push('Stored file is missing from the server.');
  } else {
    reasons.push('Document file exists in storage.');
  }

  if (sizeBytes <= 0) {
    recommendedStatus = 'rejected';
    confidence = Math.max(confidence, 95);
    reasons.push('Document file is empty.');
  } else if (sizeBytes < 1024) {
    if (recommendedStatus !== 'rejected') recommendedStatus = 'rejected';
    confidence = Math.max(confidence, 75);
    warnings.push('File is very small; it may be a test file, placeholder, or incomplete document.');
  } else {
    reasons.push('Document file size looks acceptable for review.');
  }

  if (filename.includes('expired') || filename.includes('vencido') || filename.includes('expirado')) {
    recommendedStatus = 'expired';
    confidence = Math.max(confidence, 85);
    reasons.push('Filename suggests the document may be expired.');
  }

  if (filename.includes('wrong') || filename.includes('incorrect') || filename.includes('invalid')) {
    recommendedStatus = 'rejected';
    confidence = Math.max(confidence, 85);
    reasons.push('Filename suggests the document may be invalid or incorrect.');
  }

  if (documentType.includes('nif') || documentType.includes('nuit')) {
    reasons.push('Document type is related to supplier tax identification.');
    if (doc.supplier_nif) {
      reasons.push('Supplier has a tax identification number recorded in the system.');
    } else {
      warnings.push('Supplier does not have a NUIT/NIF recorded in the system.');
      confidence = Math.min(confidence, 65);
    }
  }

  if (documentType.includes('tax_clearance')) {
    reasons.push('Tax clearance documents normally require validity-date review.');
    warnings.push('AI could not confirm expiry date from metadata alone; officer should confirm document validity date.');
    confidence = Math.min(confidence, 72);
  }

  if (!allowedMimeTypes.has(mimeType)) {
    recommendedStatus = 'rejected';
    confidence = Math.max(confidence, 90);
    reasons.push('Unsupported or suspicious file type detected.');
  } else {
    reasons.push('File type is allowed by the procurement system.');
  }

  if (Number(doc.risk_score || 0) >= 70) {
    warnings.push('Supplier has a high risk score; officer should review this document carefully.');
    confidence = Math.min(confidence, 68);
  }

  if (recommendedStatus === 'verified') {
    warnings.push('This is an AI pre-validation only. Final approval should remain with the procurement officer.');
  }

  return {
    document_id: doc.id,
    supplier_id: doc.supplier_id,
    supplier_name: doc.supplier_name,
    original_filename: doc.original_filename,
    document_type: doc.document_type,
    current_status: doc.verification_status,
    recommended_status: recommendedStatus,
    confidence,
    reasons,
    warnings,
    model: 'supplier-document-validator-v1',
    provider: 'local-rules'
  };
}

async function recordSupplierDocumentAiValidation(doc: any, recommendation: SupplierDocumentAiRecommendation) {
  return one(
    `insert into supplier_document_ai_validations
     (organization_id, supplier_id, document_id, recommended_status, confidence, reasons, warnings, provider)
     values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)
     returning id, supplier_id, document_id, recommended_status, confidence, reasons, warnings, provider, created_at`,
    [
      doc.organization_id,
      doc.supplier_id,
      doc.id,
      recommendation.recommended_status,
      recommendation.confidence,
      JSON.stringify(recommendation.reasons),
      JSON.stringify(recommendation.warnings),
      recommendation.provider
    ]
  );
}

async function createSupplierDocumentNotification(doc: any, recommendation: SupplierDocumentAiRecommendation) {
  const subject = `Document AI pre-validation completed: ${doc.document_type}`;
  const message =
    `Your document "${doc.original_filename}" was pre-validated by AI. ` +
    `Recommended status: ${recommendation.recommended_status}. ` +
    `Confidence: ${recommendation.confidence}%. ` +
    `Final approval remains subject to procurement officer review.`;

  return one(
    `insert into notification_outbox
     (organization_id, supplier_id, document_id, channel, recipient, subject, message, provider)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning id, supplier_id, document_id, channel, recipient, subject, message, status, provider, created_at`,
    [
      doc.organization_id,
      doc.supplier_id,
      doc.id,
      'in_app',
      doc.supplier_email || null,
      subject,
      message,
      'local-rules'
    ]
  );
}

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


router.get('/:id/documents', async (req: AuthedRequest, res) => {
  const supplier = await one(
    'select id from suppliers where id=$1 and organization_id=$2',
    [req.params.id, req.user!.organization_id]
  );
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

  const rows = await query(
    `select id, supplier_id, document_type, original_filename, mime_type, size_bytes,
            verification_status, notes, created_at, updated_at
     from supplier_documents
     where supplier_id=$1 and organization_id=$2
     order by created_at desc`,
    [req.params.id, req.user!.organization_id]
  );

  res.json(rows);
});

router.post('/:id/documents', upload.single('document'), async (req: AuthedRequest, res) => {
  const supplier = await one(
    'select id, name, nif, status, risk_score, email, phone from suppliers where id=$1 and organization_id=$2',
    [req.params.id, req.user!.organization_id]
  );
  if (!supplier) {
    if (req.file) fs.rmSync(req.file.path, { force: true });
    return res.status(404).json({ error: 'Supplier not found' });
  }

  if (!req.file) return res.status(400).json({ error: 'Document file is required' });

  const body = documentSchema.parse(req.body);

  const row = await one(
    `insert into supplier_documents
     (organization_id, supplier_id, document_type, original_filename, stored_filename, file_path,
      mime_type, size_bytes, uploaded_by, notes)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     returning id, organization_id, supplier_id, document_type, original_filename, stored_filename, file_path,
               mime_type, size_bytes, verification_status, notes, created_at, updated_at`,
    [
      req.user!.organization_id,
      req.params.id,
      body.document_type,
      req.file.originalname,
      req.file.filename,
      req.file.path,
      req.file.mimetype,
      req.file.size,
      req.user!.id,
      body.notes
    ]
  );

  await audit(req.user, 'upload', 'supplier_document', row.id, {
    supplier_id: req.params.id,
    supplier_name: supplier.name,
    filename: row.original_filename,
    document_type: row.document_type
  }, req.ip);

  const validationDoc = {
    ...row,
    supplier_name: supplier.name,
    supplier_nif: supplier.nif,
    supplier_status: supplier.status,
    risk_score: supplier.risk_score,
    supplier_email: supplier.email,
    supplier_phone: supplier.phone
  };

  const recommendation = buildSupplierDocumentAiRecommendation(validationDoc);
  const aiValidation = await recordSupplierDocumentAiValidation(validationDoc, recommendation);
  const notification = await createSupplierDocumentNotification(validationDoc, recommendation);

  await audit(req.user, 'ai_prevalidate', 'supplier_document', row.id, {
    supplier_id: req.params.id,
    supplier_name: supplier.name,
    filename: row.original_filename,
    recommended_status: recommendation.recommended_status,
    confidence: recommendation.confidence,
    notification_id: notification.id
  }, req.ip);

  res.status(201).json({
    ...row,
    ai_recommendation: recommendation,
    ai_validation: aiValidation,
    notification
  });
});

router.post('/:id/documents/:documentId/ai-validate', async (req: AuthedRequest, res) => {
  const doc = await one(
    `select sd.*, s.name as supplier_name, s.nif as supplier_nif, s.status as supplier_status, s.risk_score, s.email as supplier_email, s.phone as supplier_phone
     from supplier_documents sd
     join suppliers s on s.id = sd.supplier_id
     where sd.id=$1
       and sd.supplier_id=$2
       and sd.organization_id=$3
       and s.organization_id=$3`,
    [req.params.documentId, req.params.id, req.user!.organization_id]
  );

  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const recommendation = buildSupplierDocumentAiRecommendation(doc);
  const aiValidation = await recordSupplierDocumentAiValidation(doc, recommendation);

  await audit(req.user, 'ai_validate', 'supplier_document', doc.id, {
    supplier_id: req.params.id,
    supplier_name: doc.supplier_name,
    filename: doc.original_filename,
    current_status: doc.verification_status,
    recommended_status: recommendation.recommended_status,
    confidence: recommendation.confidence
  }, req.ip);

  res.json({ recommendation, ai_validation: aiValidation });
});

router.get('/:id/documents/:documentId/download', async (req: AuthedRequest, res) => {
  const doc = await one(
    `select sd.*
     from supplier_documents sd
     join suppliers s on s.id = sd.supplier_id
     where sd.id=$1
       and sd.supplier_id=$2
       and sd.organization_id=$3
       and s.organization_id=$3`,
    [req.params.documentId, req.params.id, req.user!.organization_id]
  );

  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!fs.existsSync(doc.file_path)) return res.status(404).json({ error: 'Stored file not found' });

  res.download(doc.file_path, doc.original_filename);
});

router.patch('/:id/documents/:documentId/status', async (req: AuthedRequest, res) => {
  const body = documentStatusSchema.parse(req.body);

  const current = await one(
    `select sd.*, s.name as supplier_name
     from supplier_documents sd
     join suppliers s on s.id = sd.supplier_id
     where sd.id=$1
       and sd.supplier_id=$2
       and sd.organization_id=$3
       and s.organization_id=$3`,
    [req.params.documentId, req.params.id, req.user!.organization_id]
  );

  if (!current) return res.status(404).json({ error: 'Document not found' });

  const row = await one(
    `update supplier_documents
     set verification_status=$4,
         notes=coalesce($5, notes),
         updated_at=now()
     where id=$1 and supplier_id=$2 and organization_id=$3
     returning id, organization_id, supplier_id, document_type, original_filename, stored_filename, file_path,
               mime_type, size_bytes, verification_status, notes, created_at, updated_at`,
    [
      req.params.documentId,
      req.params.id,
      req.user!.organization_id,
      body.verification_status,
      body.notes
    ]
  );

  await audit(req.user, 'update_status', 'supplier_document', row.id, {
    supplier_id: req.params.id,
    supplier_name: current.supplier_name,
    filename: current.original_filename,
    old_status: current.verification_status,
    new_status: row.verification_status
  }, req.ip);

  res.json(row);
});

router.delete('/:id', async (req: AuthedRequest, res) => {
  const row = await one('delete from suppliers where id=$1 and organization_id=$2 returning id,name', [req.params.id, req.user!.organization_id]);
  if (!row) return res.status(404).json({ error: 'Supplier not found' });
  await audit(req.user, 'delete', 'supplier', row.id, { name: row.name }, req.ip);
  res.status(204).send();
});

export default router;
