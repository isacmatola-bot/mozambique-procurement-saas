create extension if not exists pgcrypto;

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  nif text,
  address text,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('admin','procurement_officer','finance_officer','evaluator','viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  nif text,
  registration_number text,
  address text,
  contact_person text,
  email text,
  phone text,
  category text not null default 'goods',
  local_supplier boolean not null default false,
  beneficial_ownership_disclosed boolean not null default false,
  status text not null default 'active' check (status in ('active','inactive','suspended')),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(organization_id, nif)
);

create table if not exists tenders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  reference_number text not null unique,
  procurement_method text not null check (procurement_method in ('public_tender','limited_tender','direct_award','quotation')),
  category text not null default 'goods',
  description text,
  budget numeric(14,2) not null default 0,
  currency text not null default 'MZN',
  deadline date not null,
  status text not null default 'draft' check (status in ('draft','published','evaluation','awarded','cancelled','closed')),
  evaluation_criteria jsonb not null default '[]'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bids (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references tenders(id) on delete cascade,
  supplier_id uuid not null references suppliers(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null default 'MZN',
  technical_score numeric(5,2) not null default 0,
  financial_score numeric(5,2) not null default 0,
  local_preference_applied boolean not null default false,
  total_score numeric(5,2) not null default 0,
  status text not null default 'submitted' check (status in ('submitted','under_review','qualified','disqualified','winner','rejected')),
  submitted_at timestamptz not null default now(),
  notes text,
  unique(tender_id, supplier_id)
);

create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  tender_id uuid references tenders(id),
  supplier_id uuid references suppliers(id),
  bid_id uuid references bids(id),
  contract_number text not null unique,
  title text not null,
  value numeric(14,2) not null default 0,
  currency text not null default 'MZN',
  start_date date,
  end_date date,
  status text not null default 'draft' check (status in ('draft','under_review','approved','signed','active','completed','terminated')),
  content text not null,
  compliance_flags jsonb not null default '{}'::jsonb,
  created_by uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  supplier_id uuid references suppliers(id),
  contract_id uuid references contracts(id),
  invoice_number text not null unique,
  issue_date date not null default current_date,
  due_date date,
  subtotal numeric(14,2) not null,
  vat_rate numeric(5,4) not null default 0.17,
  vat_amount numeric(14,2) not null,
  total numeric(14,2) not null,
  currency text not null default 'MZN',
  status text not null default 'draft' check (status in ('draft','issued','paid','overdue','cancelled')),
  items jsonb not null default '[]'::jsonb,
  notes text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists document_extractions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  source_name text,
  document_text text not null,
  extraction jsonb not null,
  model text,
  created_by uuid references users(id),
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_org on suppliers(organization_id);
create index if not exists idx_tenders_org on tenders(organization_id);
create index if not exists idx_bids_tender on bids(tender_id);
create index if not exists idx_contracts_org on contracts(organization_id);
create index if not exists idx_invoices_org on invoices(organization_id);
create index if not exists idx_audit_org on audit_logs(organization_id, created_at desc);
