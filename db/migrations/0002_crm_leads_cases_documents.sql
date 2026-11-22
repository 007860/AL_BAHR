-- Migration 0002: CRM Customers, Leads, Cases, Tasks & Private Documents
-- Preserves existing global-wayfinder-40 country_leads without altering or deleting existing rows.

CREATE TABLE IF NOT EXISTS os_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  user_id UUID REFERENCES os_users(id),
  partner_id UUID,
  full_name TEXT NOT NULL,
  primary_phone TEXT NOT NULL,
  primary_email TEXT,
  city TEXT,
  nationality TEXT DEFAULT 'Pakistan',
  passport_number_enc TEXT, -- Collected only during active visa/booking processing, never marketing inquiry
  passport_expiry DATE,
  kyc_verified BOOLEAN NOT NULL DEFAULT false,
  processing_restricted BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_os_customers_phone_active
  ON os_customers (organization_id, primary_phone) WHERE archived_at IS NULL;

CREATE TABLE IF NOT EXISTS os_customer_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES os_customers(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES os_users(id),
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer_safe')),
  event_type TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('lead', 'customer', 'subscriber', 'employee')),
  subject_id UUID NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('portal', 'email', 'whatsapp', 'phone', 'terms')),
  consented BOOLEAN NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  customer_id UUID REFERENCES os_customers(id),
  partner_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service_type TEXT NOT NULL CHECK (service_type IN ('umrah', 'flight', 'visa', 'appointment', 'hotel', 'study', 'work_demand', 'b2b', 'general')),
  source_channel TEXT NOT NULL, -- website_form, manual, partner, referral, chat
  source_campaign TEXT,
  external_source_id TEXT, -- Bridge reference to global-wayfinder-40 country_leads.id
  assigned_employee_id UUID REFERENCES os_users(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'assigned', 'contacted', 'converted', 'closed', 'spam')),
  close_reason TEXT,
  follow_up_at TIMESTAMPTZ,
  notes TEXT,
  archived_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_os_leads_external_dedupe
  ON os_leads (organization_id, source_channel, external_source_id) WHERE external_source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS os_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  case_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL REFERENCES os_customers(id),
  lead_id UUID REFERENCES os_leads(id),
  partner_id UUID,
  service_type TEXT NOT NULL CHECK (service_type IN ('umrah', 'flight', 'visa', 'appointment', 'hotel', 'study')),
  title TEXT NOT NULL,
  assigned_employee_id UUID REFERENCES os_users(id),
  team_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'assigned', 'processing', 'waiting_customer', 'waiting_supplier', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  sla_due_at TIMESTAMPTZ,
  draft_payload JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  case_id UUID REFERENCES os_cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assigned_employee_id UUID REFERENCES os_users(id),
  depends_on_task_id UUID REFERENCES os_tasks(id),
  priority_weight INTEGER NOT NULL DEFAULT 1 CHECK (priority_weight >= 1),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES os_cases(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES os_users(id),
  visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer_safe')),
  from_status TEXT,
  to_status TEXT,
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  customer_id UUID REFERENCES os_customers(id),
  case_id UUID REFERENCES os_cases(id),
  booking_id UUID,
  doc_category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  storage_key TEXT NOT NULL UNIQUE, -- Private bucket only; never public URL
  scan_status TEXT NOT NULL DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'quarantined')),
  review_status TEXT NOT NULL DEFAULT 'received' CHECK (review_status IN ('missing', 'received', 'approved', 'rejected', 'expired')),
  review_reason TEXT,
  reviewed_by UUID REFERENCES os_users(id),
  version_no INTEGER NOT NULL DEFAULT 1,
  parent_document_id UUID REFERENCES os_documents(id),
  expires_at DATE,
  retention_hold BOOLEAN NOT NULL DEFAULT false,
  archived_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE os_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_customers_own ON os_customers;
CREATE POLICY os_customers_own ON os_customers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS os_cases_own_or_assigned ON os_cases;
CREATE POLICY os_cases_own_or_assigned ON os_cases
  FOR SELECT TO authenticated
  USING (
    assigned_employee_id = auth.uid()
    OR EXISTS (SELECT 1 FROM os_customers c WHERE c.id = os_cases.customer_id AND c.user_id = auth.uid())
  );
