CREATE TABLE IF NOT EXISTS supplier_document_ai_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES supplier_documents(id) ON DELETE CASCADE,
  recommended_status TEXT NOT NULL CHECK (recommended_status IN ('pending', 'verified', 'rejected', 'expired')),
  confidence NUMERIC(5,2) NOT NULL DEFAULT 0,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  provider TEXT NOT NULL DEFAULT 'local-rules',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  document_id UUID REFERENCES supplier_documents(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app')),
  recipient TEXT,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_supplier_document_ai_validations_supplier
  ON supplier_document_ai_validations(supplier_id);

CREATE INDEX IF NOT EXISTS idx_supplier_document_ai_validations_document
  ON supplier_document_ai_validations(document_id);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_supplier
  ON notification_outbox(supplier_id);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
  ON notification_outbox(status);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_created
  ON notification_outbox(created_at DESC);
