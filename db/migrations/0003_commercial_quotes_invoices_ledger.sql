-- Migration 0003: Quotes, Sequential Invoices, Manual Bank Payments & Append-Only Ledger

CREATE SEQUENCE IF NOT EXISTS os_quote_seq START 1001;
CREATE SEQUENCE IF NOT EXISTS os_invoice_seq START 1001;

CREATE TABLE IF NOT EXISTS os_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  quote_number TEXT NOT NULL UNIQUE,
  case_id UUID REFERENCES os_cases(id),
  customer_id UUID NOT NULL REFERENCES os_customers(id),
  partner_id UUID,
  currency TEXT NOT NULL DEFAULT 'PKR',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  active_version INTEGER NOT NULL DEFAULT 1,
  valid_until TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES os_users(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_quote_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES os_quotes(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  supplier_cost_minor BIGINT NOT NULL DEFAULT 0, -- Hidden from customer API & PDF
  markup_minor BIGINT NOT NULL DEFAULT 0,
  tax_minor BIGINT NOT NULL DEFAULT 0,
  total_selling_minor BIGINT NOT NULL DEFAULT 0,
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  frozen_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quote_id, version_no)
);

CREATE TABLE IF NOT EXISTS os_quote_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES os_quotes(id),
  quote_version_id UUID NOT NULL UNIQUE REFERENCES os_quote_versions(id),
  accepted_by UUID NOT NULL REFERENCES os_users(id),
  on_behalf_reason TEXT,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  invoice_number TEXT NOT NULL UNIQUE,
  quote_id UUID REFERENCES os_quotes(id),
  quote_version_id UUID UNIQUE REFERENCES os_quote_versions(id), -- Prevents duplicate invoice on replay
  case_id UUID REFERENCES os_cases(id),
  customer_id UUID NOT NULL REFERENCES os_customers(id),
  partner_id UUID,
  currency TEXT NOT NULL DEFAULT 'PKR',
  total_minor BIGINT NOT NULL CHECK (total_minor >= 0),
  verified_paid_minor BIGINT NOT NULL DEFAULT 0 CHECK (verified_paid_minor >= 0),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void')),
  due_date DATE,
  issued_at TIMESTAMPTZ,
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  invoice_id UUID NOT NULL REFERENCES os_invoices(id),
  customer_id UUID NOT NULL REFERENCES os_customers(id),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'PKR',
  bank_name TEXT NOT NULL,
  bank_reference TEXT NOT NULL,
  evidence_document_id UUID REFERENCES os_documents(id),
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('evidence_uploaded', 'pending_review', 'verified', 'rejected', 'refunded')),
  submitted_by UUID NOT NULL REFERENCES os_users(id),
  reviewed_by UUID REFERENCES os_users(id),
  review_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Immutable Append-Only Financial Ledger (Sec. 43)
CREATE TABLE IF NOT EXISTS os_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  account_code TEXT NOT NULL, -- receivable, bank_cleared, supplier_payable, operating_expense, commission_payable, refund
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'PKR',
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  reversal_of_id UUID REFERENCES os_ledger_entries(id),
  posted_by UUID NOT NULL REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_ledger_immutable ON os_ledger_entries;
CREATE TRIGGER trg_ledger_immutable
  BEFORE UPDATE OR DELETE ON os_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION os_prevent_immutable_mutation();

CREATE TABLE IF NOT EXISTS os_accounting_periods (
  period_ym TEXT PRIMARY KEY, -- YYYY-MM
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES os_users(id),
  locked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS os_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  category TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'PKR',
  receipt_document_id UUID REFERENCES os_documents(id),
  description TEXT NOT NULL,
  recorded_by UUID NOT NULL REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE os_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_ledger_entries ENABLE ROW LEVEL SECURITY;
