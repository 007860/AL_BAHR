-- Migration 0005: Website CMS Bridge, Campaigns, Subscribers, Chat, Support, Notifications, SEO, i18n, Reviews & Health

CREATE TABLE IF NOT EXISTS os_cms_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  content_type TEXT NOT NULL CHECK (content_type IN ('package_slot', 'poster', 'page_field', 'blog')),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  alt_text TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'published', 'unpublished')),
  version_no INTEGER NOT NULL DEFAULT 1,
  scheduled_for TIMESTAMPTZ,
  approved_by UUID REFERENCES os_users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  email TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  topics_json JSONB NOT NULL DEFAULT '["umrah","visas"]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_verify' CHECK (status IN ('pending_verify', 'subscribed', 'unsubscribed')),
  unsubscribe_token TEXT NOT NULL UNIQUE,
  verified_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE TABLE IF NOT EXISTS os_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  title TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'banner', 'in_app')),
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'scheduled', 'sending', 'completed', 'stopped')),
  scheduled_for TIMESTAMPTZ,
  approved_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  customer_id UUID REFERENCES os_customers(id),
  assigned_agent_id UUID REFERENCES os_users(id),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES os_conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES os_users(id),
  sender_role TEXT NOT NULL,
  body TEXT NOT NULL,
  attachment_document_id UUID REFERENCES os_documents(id),
  delivery_status TEXT NOT NULL DEFAULT 'persisted' CHECK (delivery_status IN ('persisted', 'queued', 'delivered', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES os_customers(id),
  partner_id UUID,
  case_id UUID REFERENCES os_cases(id),
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  assigned_to UUID REFERENCES os_users(id),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'assigned', 'waiting_customer', 'resolved', 'reopened')),
  sla_due_at TIMESTAMPTZ,
  satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  recipient_user_id UUID NOT NULL REFERENCES os_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  deep_link TEXT,
  read_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  muted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  translation_key TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('en', 'ur')),
  text_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published')),
  UNIQUE (organization_id, translation_key, locale)
);

CREATE TABLE IF NOT EXISTS os_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  customer_id UUID NOT NULL REFERENCES os_customers(id),
  booking_id UUID NOT NULL REFERENCES os_bookings(id), -- Guarantees only real completed-service customers
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'submitted', 'approved', 'published', 'rejected')),
  moderated_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_health_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  component TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'critical')),
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
