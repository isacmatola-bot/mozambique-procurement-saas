CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS ai_supplier_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tender_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  supplier_name TEXT,
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'medium',
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_used TEXT NOT NULL DEFAULT 'rules-ai-v1',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS procurement_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES ai_supplier_recommendations(id) ON DELETE CASCADE,
  tender_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  officer_id TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'manual_review')),
  officer_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT NOT NULL,
  tender_id TEXT,
  contract_id TEXT,
  delivery_score INTEGER NOT NULL DEFAULT 0 CHECK (delivery_score BETWEEN 0 AND 100),
  quality_score INTEGER NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  compliance_score INTEGER NOT NULL DEFAULT 0 CHECK (compliance_score BETWEEN 0 AND 100),
  timeliness_score INTEGER NOT NULL DEFAULT 0 CHECK (timeliness_score BETWEEN 0 AND 100),
  final_rating NUMERIC(5,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_risk_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT NOT NULL,
  risk_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_recommendations_tender_id
  ON ai_supplier_recommendations(tender_id);

CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id
  ON supplier_performance(supplier_id);
