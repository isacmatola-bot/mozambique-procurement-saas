CREATE TABLE IF NOT EXISTS supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'other',
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT supplier_documents_verification_status_check
    CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired'))
);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_org
  ON supplier_documents (organization_id);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_supplier
  ON supplier_documents (supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_type
  ON supplier_documents (document_type);

CREATE INDEX IF NOT EXISTS idx_supplier_documents_status
  ON supplier_documents (verification_status);
