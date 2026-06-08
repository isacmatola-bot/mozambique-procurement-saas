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
    'select id, name from suppliers where id=$1 and organization_id=$2',
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
     returning id, supplier_id, document_type, original_filename, mime_type, size_bytes,
               verification_status, notes, created_at, updated_at`,
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

  res.status(201).json(row);
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

router.delete('/:id', async (req: AuthedRequest, res) => {
  const row = await one('delete from suppliers where id=$1 and organization_id=$2 returning id,name', [req.params.id, req.user!.organization_id]);
  if (!row) return res.status(404).json({ error: 'Supplier not found' });
  await audit(req.user, 'delete', 'supplier', row.id, { name: row.name }, req.ip);
  res.status(204).send();
});

export default router;
