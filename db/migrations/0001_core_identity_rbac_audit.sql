-- Migration 0001: Core Identity, RBAC, Sessions, Invitations, Settings & Append-Only Audit
-- Data Preservation Note: Purely additive on new OS schema; does not alter existing website tables.
-- Rollback Note: Drop tables in reverse dependency order only in non-production environments.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Single-organization container (future-proofed per Sec. 25/63; Release 1 restricted to 1 org)
CREATE TABLE IF NOT EXISTS os_organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  legal_name_verified BOOLEAN NOT NULL DEFAULT false,
  legal_suffix TEXT,
  is_private_edition BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Users & Profiles
CREATE TABLE IF NOT EXISTS os_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'en' CHECK (preferred_locale IN ('en', 'ur')),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret_enc TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'deactivated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_roles (
  id TEXT PRIMARY KEY, -- ceo, manager, employee, finance, support, customer, partner
  display_name TEXT NOT NULL,
  requires_mfa BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_permissions (
  code TEXT PRIMARY KEY,
  module_code TEXT NOT NULL,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS os_role_permissions (
  role_id TEXT NOT NULL REFERENCES os_roles(id) ON DELETE CASCADE,
  permission_code TEXT NOT NULL REFERENCES os_permissions(code) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS os_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  user_id UUID NOT NULL REFERENCES os_users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES os_roles(id),
  team_id TEXT,
  partner_id UUID,
  delegated_scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  granted_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS os_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES os_users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  aal_level TEXT NOT NULL DEFAULT 'aal1' CHECK (aal_level IN ('aal1', 'aal2')),
  device_label TEXT,
  ip_address TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cryptographically random one-time invite tokens (hashed in DB, Sec. 23)
CREATE TABLE IF NOT EXISTS os_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  target_role TEXT NOT NULL REFERENCES os_roles(id),
  team_id TEXT,
  skill_codes JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_active INTEGER NOT NULL DEFAULT 10 CHECK (max_active >= 0),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL REFERENCES os_users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL UNIQUE REFERENCES os_organizations(id),
  brand_name TEXT NOT NULL DEFAULT 'AL-BAHR HORIZON TRAVELS & CONSULTANTS',
  app_display_name TEXT NOT NULL DEFAULT 'HORIZON ONE',
  public_website_url TEXT NOT NULL DEFAULT 'https://www.albahrtravels.com/',
  os_portal_url TEXT NOT NULL DEFAULT 'https://os.albahrtravels.com/',
  support_phone TEXT NOT NULL DEFAULT '+92 325 7938125',
  support_email TEXT NOT NULL DEFAULT 'albahrtravelconsultants@gmail.com',
  office_address TEXT NOT NULL DEFAULT '78 E Block, Architect Engineering Housing Society, Lahore, Pakistan',
  whatsapp_verified BOOLEAN NOT NULL DEFAULT false,
  legal_suffix_verified BOOLEAN NOT NULL DEFAULT false,
  default_flight_markup_pkr BIGINT NOT NULL DEFAULT 2000 CHECK (default_flight_markup_pkr >= 0),
  refund_dual_approval_threshold_pkr BIGINT NOT NULL DEFAULT 1 CHECK (refund_dual_approval_threshold_pkr >= 0),
  logo_asset_url TEXT,
  logo_asset_verified BOOLEAN NOT NULL DEFAULT false,
  theme_tokens JSONB NOT NULL DEFAULT '{"navy":"#0A192F","gold":"#D9AD32","teal":"#0A8C98","surface":"#FFFFFF","background":"#F6F8FB"}'::jsonb,
  updated_by UUID REFERENCES os_users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable Append-Only Audit Log (Sec. 57)
CREATE TABLE IF NOT EXISTS os_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  actor_user_id UUID REFERENCES os_users(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  before_redacted JSONB,
  after_redacted JSONB,
  reason TEXT,
  request_id TEXT NOT NULL,
  rule_version_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION os_prevent_immutable_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Append-only table % cannot be updated or deleted', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_immutable ON os_audit_events;
CREATE TRIGGER trg_audit_immutable
  BEFORE UPDATE OR DELETE ON os_audit_events
  FOR EACH ROW EXECUTE FUNCTION os_prevent_immutable_mutation();

CREATE TABLE IF NOT EXISTS os_security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  audit_event_id UUID REFERENCES os_audit_events(id),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
  flagged_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_idempotency_keys (
  key TEXT NOT NULL,
  actor_scope TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key, actor_scope, endpoint)
);

-- Enable RLS (deny-by-default; server handlers enforce object-level ACLs)
ALTER TABLE os_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS os_users_self_select ON os_users;
CREATE POLICY os_users_self_select ON os_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());
