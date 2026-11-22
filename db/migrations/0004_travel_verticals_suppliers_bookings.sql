-- Migration 0004: Travel Verticals, Suppliers, Flights, Umrah, Visas, Appointments, Hotels, Study & Bookings

CREATE TABLE IF NOT EXISTS os_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('airline', 'hotel', 'umrah_ground', 'visa_center', 'transport', 'university', 'other')),
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  verified BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  contract_terms TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_supplier_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES os_suppliers(id),
  service_code TEXT NOT NULL,
  title TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PKR',
  net_cost_minor BIGINT NOT NULL CHECK (net_cost_minor >= 0),
  valid_until TIMESTAMPTZ NOT NULL,
  inclusions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_flight_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES os_cases(id) ON DELETE CASCADE,
  origin_iata TEXT NOT NULL,
  destination_iata TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passenger_count INTEGER NOT NULL CHECK (passenger_count >= 1),
  cabin_class TEXT NOT NULL DEFAULT 'economy',
  baggage_kg INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_fare_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_request_id UUID NOT NULL REFERENCES os_flight_requests(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES os_suppliers(id),
  currency TEXT NOT NULL DEFAULT 'PKR',
  net_fare_minor BIGINT NOT NULL CHECK (net_fare_minor > 0),
  markup_per_pax_minor BIGINT NOT NULL DEFAULT 200000 CHECK (markup_per_pax_minor >= 0), -- PKR 2,000 in minor units (paisa) or configured
  valid_until TIMESTAMPTZ NOT NULL,
  fare_rules TEXT,
  created_by UUID NOT NULL REFERENCES os_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_umrah_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  external_website_pkg_id UUID, -- Bridge ID matching existing global-wayfinder-40 umrah_packages.id
  pkg_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  departure_city TEXT NOT NULL,
  airline TEXT NOT NULL,
  route TEXT NOT NULL,
  total_nights INTEGER NOT NULL CHECK (total_nights >= 1),
  makkah_hotel TEXT NOT NULL,
  makkah_distance_m INTEGER NOT NULL CHECK (makkah_distance_m >= 0), -- Captured separately per Sec. 8
  makkah_nights INTEGER NOT NULL CHECK (makkah_nights >= 0),
  madinah_hotel TEXT NOT NULL,
  madinah_distance_m INTEGER NOT NULL CHECK (madinah_distance_m >= 0), -- Captured separately per Sec. 8
  madinah_nights INTEGER NOT NULL CHECK (madinah_nights >= 0),
  price_sharing_pkr BIGINT NOT NULL CHECK (price_sharing_pkr >= 0),
  price_quad_pkr BIGINT NOT NULL CHECK (price_quad_pkr >= 0),
  price_triple_pkr BIGINT NOT NULL CHECK (price_triple_pkr >= 0),
  price_double_pkr BIGINT NOT NULL CHECK (price_double_pkr >= 0),
  inclusions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'published', 'expired', 'unpublished')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_umrah_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES os_cases(id),
  customer_id UUID NOT NULL REFERENCES os_customers(id),
  departure_city TEXT NOT NULL,
  total_nights INTEGER NOT NULL,
  travelers_count INTEGER NOT NULL CHECK (travelers_count >= 1),
  makkah_distance_pref TEXT NOT NULL,
  madinah_distance_pref TEXT NOT NULL,
  room_type TEXT NOT NULL,
  transport_type TEXT NOT NULL,
  ziyarat_included BOOLEAN NOT NULL DEFAULT true,
  budget_pkr BIGINT,
  draft_step INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'quoted', 'booked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_visa_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES os_cases(id) ON DELETE CASCADE,
  destination_country TEXT NOT NULL,
  visa_category TEXT NOT NULL,
  preferred_travel_date DATE,
  checklist_version TEXT NOT NULL DEFAULT 'v1',
  checklist_validated BOOLEAN NOT NULL DEFAULT false,
  embassy_status TEXT NOT NULL DEFAULT 'preparing' CHECK (embassy_status IN ('preparing', 'submitted', 'waiting', 'decided_approved', 'decided_refused', 'cancelled')),
  confirmation_document_id UUID REFERENCES os_documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  case_id UUID NOT NULL REFERENCES os_cases(id),
  provider_name TEXT NOT NULL,
  center_city TEXT NOT NULL,
  preferred_window TEXT NOT NULL,
  slot_datetime TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'internal_reserved', 'confirmed', 'rescheduled', 'cancelled')),
  external_ref TEXT,
  evidence_document_id UUID REFERENCES os_documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_hotel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES os_cases(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  rooms INTEGER NOT NULL CHECK (rooms >= 1),
  guests INTEGER NOT NULL CHECK (guests >= 1),
  meal_plan TEXT,
  transfer_needed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_study_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES os_cases(id) ON DELETE CASCADE,
  destination_country TEXT NOT NULL,
  target_program TEXT NOT NULL,
  target_intake TEXT NOT NULL,
  academic_summary TEXT,
  university_name TEXT,
  application_ref TEXT,
  offer_document_id UUID REFERENCES os_documents(id),
  status TEXT NOT NULL DEFAULT 'shortlisting' CHECK (status IN ('shortlisting', 'submitted', 'offer_received', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES os_organizations(id),
  booking_number TEXT NOT NULL UNIQUE,
  case_id UUID NOT NULL REFERENCES os_cases(id),
  quote_id UUID REFERENCES os_quotes(id),
  invoice_id UUID REFERENCES os_invoices(id),
  customer_id UUID NOT NULL REFERENCES os_customers(id),
  partner_id UUID,
  supplier_id UUID REFERENCES os_suppliers(id),
  supplier_pnr_ref TEXT,
  package_snapshot_json JSONB, -- Preserved even if public package later expires (E2E-05)
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'supplier_pending', 'confirmed', 'documents_issued', 'completed', 'cancelled')),
  confirmed_by UUID REFERENCES os_users(id),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS os_travelers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES os_bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  passport_last4 TEXT,
  ticket_number TEXT, -- Real issued ticket number only; never invented
  voucher_document_id UUID REFERENCES os_documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
