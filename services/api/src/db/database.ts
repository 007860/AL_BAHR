import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";

export type OsDatabase = DatabaseSync;

export function createDatabase(dbPath = ":memory:"): DatabaseSync {
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS os_organizations (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      legal_name_verified INTEGER NOT NULL DEFAULT 0,
      legal_suffix TEXT,
      is_private_edition INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_roles (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      requires_mfa INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS os_users (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      preferred_locale TEXT NOT NULL DEFAULT 'en' CHECK (preferred_locale IN ('en', 'ur')),
      mfa_enabled INTEGER NOT NULL DEFAULT 0,
      mfa_secret TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited', 'active', 'suspended', 'deactivated')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_memberships (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      user_id TEXT NOT NULL REFERENCES os_users(id) ON DELETE CASCADE,
      role_id TEXT NOT NULL REFERENCES os_roles(id),
      team_id TEXT,
      partner_id TEXT,
      delegated_scopes_json TEXT NOT NULL DEFAULT '[]',
      granted_by TEXT REFERENCES os_users(id),
      created_at TEXT NOT NULL,
      UNIQUE (organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS os_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES os_users(id) ON DELETE CASCADE,
      aal_level TEXT NOT NULL DEFAULT 'aal1' CHECK (aal_level IN ('aal1', 'aal2')),
      device_label TEXT,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_invitations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      target_role TEXT NOT NULL REFERENCES os_roles(id),
      team_id TEXT,
      skill_codes_json TEXT NOT NULL DEFAULT '[]',
      max_active INTEGER NOT NULL DEFAULT 10,
      token_hash TEXT NOT NULL UNIQUE,
      invited_by TEXT NOT NULL REFERENCES os_users(id),
      expires_at TEXT NOT NULL,
      redeemed_at TEXT,
      revoked_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_company_settings (
      organization_id TEXT PRIMARY KEY REFERENCES os_organizations(id),
      brand_name TEXT NOT NULL,
      app_display_name TEXT NOT NULL,
      public_website_url TEXT NOT NULL,
      os_portal_url TEXT NOT NULL,
      support_phone TEXT NOT NULL,
      support_email TEXT NOT NULL,
      office_address TEXT NOT NULL,
      whatsapp_verified INTEGER NOT NULL DEFAULT 0,
      legal_suffix_verified INTEGER NOT NULL DEFAULT 0,
      default_flight_markup_pkr INTEGER NOT NULL DEFAULT 2000,
      refund_dual_approval_threshold_pkr INTEGER NOT NULL DEFAULT 1,
      logo_asset_url TEXT,
      logo_asset_verified INTEGER NOT NULL DEFAULT 0,
      automation_paused_categories_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_audit_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      actor_user_id TEXT REFERENCES os_users(id),
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      before_redacted TEXT,
      after_redacted TEXT,
      reason TEXT,
      request_id TEXT NOT NULL,
      rule_version_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TRIGGER IF NOT EXISTS trg_audit_no_update BEFORE UPDATE ON os_audit_events
    BEGIN
      SELECT RAISE(ABORT, 'os_audit_events is append-only');
    END;
    CREATE TRIGGER IF NOT EXISTS trg_audit_no_delete BEFORE DELETE ON os_audit_events
    BEGIN
      SELECT RAISE(ABORT, 'os_audit_events is append-only');
    END;

    CREATE TABLE IF NOT EXISTS os_security_alerts (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      audit_event_id TEXT REFERENCES os_audit_events(id),
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      flagged_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_idempotency_keys (
      idem_key TEXT NOT NULL,
      actor_scope TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      response_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (idem_key, actor_scope, endpoint)
    );

    CREATE TABLE IF NOT EXISTS os_employees (
      user_id TEXT PRIMARY KEY REFERENCES os_users(id) ON DELETE CASCADE,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      team_id TEXT NOT NULL DEFAULT 'general',
      max_active_tasks INTEGER NOT NULL DEFAULT 10,
      active_weighted_load INTEGER NOT NULL DEFAULT 0,
      auto_assign_enabled INTEGER NOT NULL DEFAULT 1,
      leave_status TEXT NOT NULL DEFAULT 'available' CHECK (leave_status IN ('available', 'on_leave', 'off_shift')),
      last_assigned_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_staff_skills (
      employee_user_id TEXT NOT NULL REFERENCES os_employees(user_id) ON DELETE CASCADE,
      service_code TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (employee_user_id, service_code)
    );

    CREATE TABLE IF NOT EXISTS os_customers (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      user_id TEXT REFERENCES os_users(id),
      partner_id TEXT,
      full_name TEXT NOT NULL,
      primary_phone TEXT NOT NULL,
      primary_email TEXT,
      city TEXT,
      passport_number_redacted TEXT,
      kyc_verified INTEGER NOT NULL DEFAULT 0,
      processing_restricted INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cust_phone_active
      ON os_customers(organization_id, primary_phone) WHERE archived_at IS NULL;

    CREATE TABLE IF NOT EXISTS os_customer_events (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES os_customers(id) ON DELETE CASCADE,
      actor_user_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer_safe')),
      event_type TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_consent_events (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      consented INTEGER NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_leads (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      customer_id TEXT REFERENCES os_customers(id),
      partner_id TEXT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      service_type TEXT NOT NULL,
      source_channel TEXT NOT NULL,
      source_campaign TEXT,
      external_source_id TEXT,
      assigned_employee_id TEXT REFERENCES os_users(id),
      status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'triaged', 'assigned', 'contacted', 'converted', 'closed', 'spam')),
      close_reason TEXT,
      follow_up_at TEXT,
      notes TEXT,
      archived_at TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_external_dedupe
      ON os_leads(organization_id, source_channel, external_source_id) WHERE external_source_id IS NOT NULL;

    CREATE TABLE IF NOT EXISTS os_cases (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      case_number TEXT NOT NULL UNIQUE,
      customer_id TEXT NOT NULL REFERENCES os_customers(id),
      lead_id TEXT REFERENCES os_leads(id),
      partner_id TEXT,
      service_type TEXT NOT NULL,
      title TEXT NOT NULL,
      assigned_employee_id TEXT REFERENCES os_users(id),
      team_id TEXT,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'assigned', 'processing', 'waiting_customer', 'waiting_supplier', 'completed', 'cancelled')),
      priority TEXT NOT NULL DEFAULT 'normal',
      escalated_at TEXT,
      escalation_reason TEXT,
      sla_due_at TEXT,
      draft_payload_json TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_tasks (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      case_id TEXT REFERENCES os_cases(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      assigned_employee_id TEXT REFERENCES os_users(id),
      depends_on_task_id TEXT REFERENCES os_tasks(id),
      priority_weight INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'blocked', 'completed', 'cancelled')),
      due_at TEXT,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_case_events (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES os_cases(id) ON DELETE CASCADE,
      actor_user_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'customer_safe')),
      from_status TEXT,
      to_status TEXT,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_documents (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      customer_id TEXT REFERENCES os_customers(id),
      case_id TEXT REFERENCES os_cases(id),
      booking_id TEXT,
      doc_category TEXT NOT NULL,
      file_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      storage_key TEXT NOT NULL UNIQUE,
      content_b64 TEXT,
      scan_status TEXT NOT NULL DEFAULT 'clean',
      review_status TEXT NOT NULL DEFAULT 'received' CHECK (review_status IN ('missing', 'received', 'approved', 'rejected', 'expired')),
      review_reason TEXT,
      reviewed_by TEXT,
      version_no INTEGER NOT NULL DEFAULT 1,
      parent_document_id TEXT,
      retention_hold INTEGER NOT NULL DEFAULT 0,
      archived_at TEXT,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_suppliers (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      contact_email TEXT,
      verified INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_supplier_rates (
      id TEXT PRIMARY KEY,
      supplier_id TEXT NOT NULL REFERENCES os_suppliers(id),
      service_code TEXT NOT NULL,
      title TEXT NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PKR',
      net_cost_pkr INTEGER NOT NULL,
      valid_until TEXT NOT NULL,
      inclusions_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_umrah_packages (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      pkg_no TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      departure_city TEXT NOT NULL,
      airline TEXT NOT NULL,
      route TEXT NOT NULL,
      total_nights INTEGER NOT NULL,
      makkah_hotel TEXT NOT NULL,
      makkah_distance_m INTEGER NOT NULL,
      makkah_nights INTEGER NOT NULL,
      madinah_hotel TEXT NOT NULL,
      madinah_distance_m INTEGER NOT NULL,
      madinah_nights INTEGER NOT NULL,
      price_sharing_pkr INTEGER NOT NULL,
      price_quad_pkr INTEGER NOT NULL,
      price_triple_pkr INTEGER NOT NULL,
      price_double_pkr INTEGER NOT NULL,
      inclusions_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'expired', 'unpublished')),
      expires_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_umrah_requests (
      id TEXT PRIMARY KEY,
      case_id TEXT,
      customer_id TEXT NOT NULL REFERENCES os_customers(id),
      departure_city TEXT NOT NULL,
      total_nights INTEGER NOT NULL,
      travelers_count INTEGER NOT NULL,
      makkah_distance_pref TEXT NOT NULL,
      madinah_distance_pref TEXT NOT NULL,
      room_type TEXT NOT NULL,
      transport_type TEXT NOT NULL,
      ziyarat_included INTEGER NOT NULL DEFAULT 1,
      budget_pkr INTEGER,
      draft_step INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_flight_requests (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES os_cases(id) ON DELETE CASCADE,
      origin_iata TEXT NOT NULL,
      destination_iata TEXT NOT NULL,
      departure_date TEXT NOT NULL,
      return_date TEXT,
      passenger_count INTEGER NOT NULL,
      cabin_class TEXT NOT NULL,
      baggage_kg INTEGER NOT NULL DEFAULT 20,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_fare_quotes (
      id TEXT PRIMARY KEY,
      flight_request_id TEXT NOT NULL REFERENCES os_flight_requests(id) ON DELETE CASCADE,
      supplier_id TEXT NOT NULL REFERENCES os_suppliers(id),
      net_fare_per_pax_pkr INTEGER NOT NULL,
      markup_per_pax_pkr INTEGER NOT NULL,
      total_selling_pkr INTEGER NOT NULL,
      valid_until TEXT NOT NULL,
      pnr_ref TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_visa_cases (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL UNIQUE REFERENCES os_cases(id) ON DELETE CASCADE,
      destination_country TEXT NOT NULL,
      visa_category TEXT NOT NULL,
      checklist_version TEXT NOT NULL DEFAULT 'v1',
      checklist_validated INTEGER NOT NULL DEFAULT 0,
      embassy_status TEXT NOT NULL DEFAULT 'preparing',
      confirmation_document_id TEXT REFERENCES os_documents(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_appointments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      case_id TEXT NOT NULL REFERENCES os_cases(id),
      provider_name TEXT NOT NULL,
      center_city TEXT NOT NULL,
      preferred_window TEXT NOT NULL,
      slot_datetime TEXT,
      status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'internal_reserved', 'confirmed', 'rescheduled', 'cancelled')),
      external_ref TEXT,
      evidence_document_id TEXT REFERENCES os_documents(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_hotel_requests (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES os_cases(id) ON DELETE CASCADE,
      destination TEXT NOT NULL,
      check_in TEXT NOT NULL,
      check_out TEXT NOT NULL,
      rooms INTEGER NOT NULL,
      guests INTEGER NOT NULL,
      meal_plan TEXT,
      transfer_needed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_study_cases (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL UNIQUE REFERENCES os_cases(id) ON DELETE CASCADE,
      destination_country TEXT NOT NULL,
      target_program TEXT NOT NULL,
      target_intake TEXT NOT NULL,
      university_name TEXT,
      application_ref TEXT,
      offer_document_id TEXT REFERENCES os_documents(id),
      status TEXT NOT NULL DEFAULT 'shortlisting',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_quotes (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      quote_number TEXT NOT NULL UNIQUE,
      case_id TEXT REFERENCES os_cases(id),
      customer_id TEXT NOT NULL REFERENCES os_customers(id),
      partner_id TEXT,
      currency TEXT NOT NULL DEFAULT 'PKR',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
      active_version INTEGER NOT NULL DEFAULT 1,
      valid_until TEXT NOT NULL,
      created_by TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_quote_versions (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL REFERENCES os_quotes(id) ON DELETE CASCADE,
      version_no INTEGER NOT NULL,
      supplier_cost_pkr INTEGER NOT NULL DEFAULT 0,
      markup_pkr INTEGER NOT NULL DEFAULT 0,
      tax_pkr INTEGER NOT NULL DEFAULT 0,
      total_selling_pkr INTEGER NOT NULL DEFAULT 0,
      lines_json TEXT NOT NULL DEFAULT '[]',
      frozen_at TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (quote_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS os_quote_acceptances (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL REFERENCES os_quotes(id),
      quote_version_id TEXT NOT NULL UNIQUE REFERENCES os_quote_versions(id),
      accepted_by TEXT NOT NULL,
      accepted_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_sequences (
      name TEXT PRIMARY KEY,
      next_val INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO os_sequences(name, next_val) VALUES ('quote', 1001), ('invoice', 1001), ('case', 1001), ('booking', 1001), ('ticket', 1001);

    CREATE TABLE IF NOT EXISTS os_invoices (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      invoice_number TEXT NOT NULL UNIQUE,
      quote_id TEXT REFERENCES os_quotes(id),
      quote_version_id TEXT UNIQUE REFERENCES os_quote_versions(id),
      case_id TEXT REFERENCES os_cases(id),
      customer_id TEXT NOT NULL REFERENCES os_customers(id),
      partner_id TEXT,
      currency TEXT NOT NULL DEFAULT 'PKR',
      total_pkr INTEGER NOT NULL,
      verified_paid_pkr INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'issued' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void')),
      due_date TEXT,
      issued_at TEXT NOT NULL,
      void_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS os_payments (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      invoice_id TEXT NOT NULL REFERENCES os_invoices(id),
      customer_id TEXT NOT NULL REFERENCES os_customers(id),
      amount_pkr INTEGER NOT NULL CHECK (amount_pkr > 0),
      bank_name TEXT NOT NULL,
      bank_reference TEXT NOT NULL,
      evidence_document_id TEXT REFERENCES os_documents(id),
      status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('evidence_uploaded', 'pending_review', 'verified', 'rejected', 'refunded')),
      submitted_by TEXT NOT NULL,
      reviewed_by TEXT,
      review_reason TEXT,
      reviewed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_ledger_entries (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      entry_ym TEXT NOT NULL,
      account_code TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
      amount_pkr INTEGER NOT NULL CHECK (amount_pkr > 0),
      reference_type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      reversal_of_id TEXT,
      posted_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TRIGGER IF NOT EXISTS trg_ledger_no_update BEFORE UPDATE ON os_ledger_entries
    BEGIN
      SELECT RAISE(ABORT, 'os_ledger_entries is append-only');
    END;
    CREATE TRIGGER IF NOT EXISTS trg_ledger_no_delete BEFORE DELETE ON os_ledger_entries
    BEGIN
      SELECT RAISE(ABORT, 'os_ledger_entries is append-only');
    END;

    CREATE TABLE IF NOT EXISTS os_accounting_periods (
      period_ym TEXT PRIMARY KEY,
      locked INTEGER NOT NULL DEFAULT 0,
      locked_by TEXT,
      locked_at TEXT
    );

    CREATE TABLE IF NOT EXISTS os_expenses (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      category TEXT NOT NULL,
      amount_pkr INTEGER NOT NULL CHECK (amount_pkr > 0),
      description TEXT NOT NULL,
      receipt_document_id TEXT REFERENCES os_documents(id),
      recorded_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_bookings (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      booking_number TEXT NOT NULL UNIQUE,
      case_id TEXT NOT NULL REFERENCES os_cases(id),
      quote_id TEXT REFERENCES os_quotes(id),
      invoice_id TEXT REFERENCES os_invoices(id),
      customer_id TEXT NOT NULL REFERENCES os_customers(id),
      partner_id TEXT,
      supplier_id TEXT REFERENCES os_suppliers(id),
      supplier_pnr_ref TEXT,
      package_snapshot_json TEXT,
      status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'supplier_pending', 'confirmed', 'documents_issued', 'completed', 'cancelled')),
      confirmed_by TEXT,
      confirmed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_travelers (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES os_bookings(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      ticket_number TEXT,
      voucher_document_id TEXT REFERENCES os_documents(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_cms_drafts (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      content_type TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'unpublished')),
      version_no INTEGER NOT NULL DEFAULT 1,
      approved_by TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_subscribers (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      email TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('pending_verify', 'subscribed', 'unsubscribed')),
      unsubscribe_token TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_campaigns (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      title TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_template TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'sending', 'completed', 'stopped')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_campaign_deliveries (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES os_campaigns(id),
      subscriber_id TEXT NOT NULL REFERENCES os_subscribers(id),
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (campaign_id, subscriber_id)
    );

    CREATE TABLE IF NOT EXISTS os_support_tickets (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      ticket_number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES os_customers(id),
      partner_id TEXT,
      category TEXT NOT NULL,
      subject TEXT NOT NULL,
      description TEXT NOT NULL,
      assigned_to TEXT,
      status TEXT NOT NULL DEFAULT 'submitted',
      satisfaction_rating INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_conversations (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      customer_id TEXT REFERENCES os_customers(id),
      assigned_agent_id TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES os_conversations(id) ON DELETE CASCADE,
      sender_user_id TEXT NOT NULL,
      sender_role TEXT NOT NULL,
      body TEXT NOT NULL,
      delivery_status TEXT NOT NULL DEFAULT 'persisted',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_notifications (
      id TEXT PRIMARY KEY,
      recipient_user_id TEXT NOT NULL REFERENCES os_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      deep_link TEXT,
      read_at TEXT,
      muted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_reviews (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES os_customers(id),
      booking_id TEXT NOT NULL REFERENCES os_bookings(id),
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('invited', 'submitted', 'published', 'rejected')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_attendance_events (
      id TEXT PRIMARY KEY,
      employee_user_id TEXT NOT NULL REFERENCES os_employees(user_id),
      work_date TEXT NOT NULL,
      checked_in_at TEXT NOT NULL,
      checked_out_at TEXT,
      UNIQUE (employee_user_id, work_date)
    );

    CREATE TABLE IF NOT EXISTS os_leave_requests (
      id TEXT PRIMARY KEY,
      employee_user_id TEXT NOT NULL REFERENCES os_employees(user_id),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      decided_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_daily_reports (
      id TEXT PRIMARY KEY,
      employee_user_id TEXT NOT NULL REFERENCES os_employees(user_id),
      report_date TEXT NOT NULL,
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (employee_user_id, report_date)
    );

    CREATE TABLE IF NOT EXISTS os_partners (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      agency_name TEXT NOT NULL,
      contact_email TEXT NOT NULL UNIQUE,
      verified INTEGER NOT NULL DEFAULT 1,
      commission_rate_bps INTEGER NOT NULL DEFAULT 500,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_partner_commissions (
      id TEXT PRIMARY KEY,
      partner_id TEXT NOT NULL REFERENCES os_partners(id),
      booking_id TEXT NOT NULL UNIQUE REFERENCES os_bookings(id),
      invoice_id TEXT NOT NULL REFERENCES os_invoices(id),
      amount_pkr INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending_approval',
      approved_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_referrals (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      referrer_user_id TEXT NOT NULL REFERENCES os_users(id),
      referred_lead_id TEXT REFERENCES os_leads(id),
      status TEXT NOT NULL DEFAULT 'tracked',
      reward_pkr INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_automation_rules (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      name TEXT NOT NULL UNIQUE,
      trigger_event TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 100,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
      current_version_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_rule_versions (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL REFERENCES os_automation_rules(id) ON DELETE CASCADE,
      version_no INTEGER NOT NULL,
      conditions_json TEXT NOT NULL,
      actions_json TEXT NOT NULL,
      created_by TEXT NOT NULL,
      approved_by TEXT,
      created_at TEXT NOT NULL,
      UNIQUE (rule_id, version_no)
    );

    CREATE TABLE IF NOT EXISTS os_decision_logs (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      rule_version_id TEXT,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      result TEXT NOT NULL,
      reason_code TEXT NOT NULL,
      redacted_context_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_assignment_events (
      id TEXT PRIMARY KEY,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      employee_user_id TEXT,
      algorithm_version TEXT NOT NULL DEFAULT 'deterministic-least-load-v1',
      decision_log_id TEXT,
      override_reason TEXT,
      assigned_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_outbox_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      dedupe_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dead_letter')),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_approval_requests (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES os_organizations(id),
      action_type TEXT NOT NULL,
      object_type TEXT NOT NULL,
      object_id TEXT NOT NULL,
      requested_by TEXT NOT NULL,
      reviewer_id TEXT,
      second_reviewer_id TEXT,
      requires_dual_control INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'first_approved', 'approved', 'rejected')),
      decision_reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_health_incidents (
      id TEXT PRIMARY KEY,
      component TEXT NOT NULL,
      severity TEXT NOT NULL,
      summary TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      acknowledged_by TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_backup_jobs (
      id TEXT PRIMARY KEY,
      backup_type TEXT NOT NULL,
      checksum TEXT NOT NULL,
      status TEXT NOT NULL,
      restore_tested_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 0,
      last_health_status TEXT NOT NULL DEFAULT 'not_configured',
      updated_at TEXT NOT NULL
    );
  `);

  seedBaseSystem(db);
  return db;
}

export function nextSequence(db: DatabaseSync, seqName: string, prefix: string): string {
  const row = db.prepare("SELECT next_val FROM os_sequences WHERE name = ?").get(seqName) as { next_val: number } | undefined;
  const val = row ? row.next_val : 1001;
  db.prepare("UPDATE os_sequences SET next_val = ? WHERE name = ?").run(val + 1, seqName);
  return `${prefix}-${new Date().getUTCFullYear()}-${String(val).padStart(4, "0")}`;
}

function seedBaseSystem(db: DatabaseSync): void {
  const now = new Date().toISOString();
  const orgId = "00000000-0000-4000-8000-000000000001";
  db.prepare(
    `INSERT OR IGNORE INTO os_organizations (id, slug, display_name, legal_name_verified, is_private_edition, created_at)
     VALUES (?, 'al-bahr-horizon', 'AL-BAHR HORIZON TRAVELS & CONSULTANTS', 0, 1, ?)`
  ).run(orgId, now);

  const roles = [
    ["ceo", "CEO / Owner", 1],
    ["manager", "Operations Manager", 1],
    ["employee", "Travel Consultant", 0],
    ["finance", "Finance Reviewer", 1],
    ["support", "Support Agent", 0],
    ["customer", "Customer", 0],
    ["partner", "B2B Partner Agency", 0],
  ] as const;
  for (const [id, name, mfa] of roles) {
    db.prepare("INSERT OR IGNORE INTO os_roles (id, display_name, requires_mfa) VALUES (?, ?, ?)").run(id, name, mfa);
  }

  db.prepare(
    `INSERT OR IGNORE INTO os_company_settings (
      organization_id, brand_name, app_display_name, public_website_url, os_portal_url,
      support_phone, support_email, office_address, whatsapp_verified, legal_suffix_verified,
      default_flight_markup_pkr, refund_dual_approval_threshold_pkr, logo_asset_verified, updated_at
    ) VALUES (?, 'AL-BAHR HORIZON TRAVELS & CONSULTANTS', 'HORIZON ONE', 'https://www.albahrtravels.com/', 'https://os.albahrtravels.com/',
      '+92 325 7938125', 'albahrtravelconsultants@gmail.com', '78 E Block, Architect Engineering Housing Society, Lahore, Pakistan',
      0, 0, 2000, 1, 0, ?)`
  ).run(orgId, now);

  // Seed default integrations status (redacted, zero credentials)
  const integrations = [
    ["int-website", "www.albahrtravels.com Bridge", "website", 0, "awaiting_owner_credentials"],
    ["int-smtp", "Outbound Email (SPF/DKIM)", "email", 0, "not_configured"],
    ["int-whatsapp", "WhatsApp Business Desk", "messaging", 0, "unverified_phone"],
    ["int-storage", "Private Encrypted Object Bucket", "storage", 1, "local_private_store_ready"],
  ] as const;
  for (const [id, name, cat, enabled, status] of integrations) {
    db.prepare(
      `INSERT OR IGNORE INTO os_integrations (id, name, category, enabled, last_health_status, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, name, cat, enabled, status, now);
  }
}

export function newId(): string {
  return crypto.randomUUID();
}
