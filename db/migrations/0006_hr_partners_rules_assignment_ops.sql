-- Migration 0006: HR, Smart Assignment, Partners, Referrals, Deterministic Rules Engine, Outbox, Backups & Integrations

CREATE TABLE IF NOT EXISTS os_employees (
  user_id UUID PRIMARY KEY REFERENCES os_users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  team_id TEXT NOT NULL DEFAULT 'general',
  max_active_tasks INTEGER NOT NULL DEFAULT 10 CHECK (max_active_tasks >= 0),
  active_weighted_load INTEGER NOT NULL DEFAULT 0 CHECK (active_weighted_load >= 0),
  auto_assign_enabled BOOLEAN NOT NULL DEFAULT true,
  leave_status TEXT NOT NULL DEFAULT 'available' CHECK (leave_status IN ('available', 'on_leave', 'off_shift')),
  last_assigned_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_staff_skills (
  employee_user_id UUID NOT NULL REFERENCES os_employees(user_id) ON DELETE CASCADE,
  service_code TEXT NOT NULL,
  proficiency INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (employee_user_id, service_code)
);

CREATE TABLE IF NOT EXISTS os_attendance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL REFERENCES os_employees(user_id),
  work_date DATE NOT NULL,
  checked_in_at TIMESTAMPTZ NOT NULL,
  checked_out_at TIMESTAMPTZ,
  UNIQUE (employee_user_id, work_date)
);

CREATE TABLE IF NOT EXISTS os_leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL REFERENCES os_employees(user_id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_user_id UUID NOT NULL REFERENCES os_employees(user_id),
  report_date DATE NOT NULL,
  summary TEXT NOT NULL,
  linked_case_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_user_id, report_date)
);

CREATE TABLE IF NOT EXISTS os_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  agency_name TEXT NOT NULL,
  contact_email TEXT NOT NULL UNIQUE,
  verified BOOLEAN NOT NULL DEFAULT false,
  commission_rate_bps INTEGER NOT NULL DEFAULT 500 CHECK (commission_rate_bps >= 0), -- 5.00%
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_partner_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES os_partners(id),
  booking_id UUID NOT NULL UNIQUE REFERENCES os_bookings(id),
  invoice_id UUID NOT NULL REFERENCES os_invoices(id),
  amount_pkr BIGINT NOT NULL CHECK (amount_pkr >= 0),
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'paid', 'disputed', 'reversed')),
  approved_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  code TEXT NOT NULL UNIQUE,
  referrer_user_id UUID NOT NULL REFERENCES os_users(id),
  referred_lead_id UUID REFERENCES os_leads(id),
  status TEXT NOT NULL DEFAULT 'tracked' CHECK (status IN ('tracked', 'qualified', 'approved', 'settled', 'reversed', 'fraud_blocked')),
  reward_pkr BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deterministic Zero-AI Rule Engine (Sec. 22, 26, 59)
CREATE TABLE IF NOT EXISTS os_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
  current_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS os_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID NOT NULL REFERENCES os_automation_rules(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  conditions_json JSONB NOT NULL,
  actions_json JSONB NOT NULL,
  created_by UUID NOT NULL REFERENCES os_users(id),
  approved_by UUID REFERENCES os_users(id),
  effective_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rule_id, version_no)
);

CREATE TABLE IF NOT EXISTS os_decision_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  event_id TEXT NOT NULL,
  rule_version_id UUID REFERENCES os_rule_versions(id),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  result TEXT NOT NULL,
  reason_code TEXT NOT NULL,
  redacted_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_assignment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('lead', 'case', 'task', 'ticket')),
  subject_id UUID NOT NULL,
  employee_user_id UUID REFERENCES os_users(id),
  algorithm_version TEXT NOT NULL DEFAULT 'deterministic-least-load-v1',
  decision_log_id UUID REFERENCES os_decision_logs(id),
  override_reason TEXT,
  assigned_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'dead_letter')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  run_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  action_type TEXT NOT NULL, -- refund, payout, cms_publish, rule_activate, restore_prod
  object_type TEXT NOT NULL,
  object_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES os_users(id),
  reviewer_id UUID REFERENCES os_users(id),
  second_reviewer_id UUID REFERENCES os_users(id),
  requires_dual_control BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'first_approved', 'approved', 'rejected')),
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('scheduled', 'manual', 'pre_migration')),
  encrypted BOOLEAN NOT NULL DEFAULT true,
  checksum TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'verified', 'failed')),
  restore_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  last_health_status TEXT NOT NULL DEFAULT 'not_configured',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
