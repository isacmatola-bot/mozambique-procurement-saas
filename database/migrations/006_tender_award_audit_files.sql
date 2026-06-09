CREATE TABLE IF NOT EXISTS tender_award_audit_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  winning_supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  winning_bid_id UUID REFERENCES bids(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES ai_supplier_recommendations(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES procurement_approvals(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  size_bytes BIGINT,
  generated_by TEXT,
  decision_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tender_award_audit_files_tender
  ON tender_award_audit_files (tender_id);

CREATE INDEX IF NOT EXISTS idx_tender_award_audit_files_supplier
  ON tender_award_audit_files (winning_supplier_id);

CREATE INDEX IF NOT EXISTS idx_tender_award_audit_files_approval
  ON tender_award_audit_files (approval_id);

CREATE INDEX IF NOT EXISTS idx_tender_award_audit_files_created
  ON tender_award_audit_files (created_at);
