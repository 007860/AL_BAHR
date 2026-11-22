-- NON-PRODUCTION SYNTHETIC SEED DATA ONLY (Blueprint Sec. 17 & 29)
-- Contains ZERO real customer PII, ZERO live credentials, and synthetic placeholder records for QA/Dev.

INSERT INTO os_organizations (id, slug, display_name, legal_name_verified, is_private_edition)
VALUES ('00000000-0000-4000-8000-000000000001', 'al-bahr-horizon', 'AL-BAHR HORIZON TRAVELS & CONSULTANTS', false, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO os_roles (id, display_name, requires_mfa) VALUES
  ('ceo', 'CEO / Owner', true),
  ('manager', 'Operations Manager', true),
  ('employee', 'Travel Consultant', false),
  ('finance', 'Finance Reviewer', true),
  ('support', 'Support Agent', false),
  ('customer', 'Customer', false),
  ('partner', 'B2B Partner Agency', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO os_company_settings (
  organization_id, brand_name, app_display_name, public_website_url, os_portal_url,
  support_phone, support_email, office_address, whatsapp_verified, legal_suffix_verified,
  default_flight_markup_pkr, logo_asset_verified
)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'AL-BAHR HORIZON TRAVELS & CONSULTANTS',
  'HORIZON ONE',
  'https://www.albahrtravels.com/',
  'https://os.albahrtravels.com/',
  '+92 325 7938125',
  'albahrtravelconsultants@gmail.com',
  '78 E Block, Architect Engineering Housing Society, Lahore, Pakistan',
  false,
  false,
  2000,
  false
)
ON CONFLICT (organization_id) DO NOTHING;
