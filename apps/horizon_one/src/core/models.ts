export type OsRole = 'ceo' | 'manager' | 'employee' | 'finance' | 'support' | 'customer' | 'partner';

export const ALL_ROLES: OsRole[] = ['ceo', 'manager', 'employee', 'finance', 'support', 'customer', 'partner'];

export const ROLE_TITLES: Record<OsRole, string> = {
  ceo: 'CEO & Founder',
  manager: 'Operations Manager',
  employee: 'Travel Consultant',
  finance: 'Finance & Accounts',
  support: 'Support Desk',
  customer: 'Traveler / Client',
  partner: 'B2B Partner Agency',
};

export const ROLE_DEFAULT_EMAILS: Record<OsRole, string> = {
  ceo: 'ceo@albahrtravels.com',
  manager: 'manager@albahrtravels.com',
  employee: 'amina@albahrtravels.com',
  finance: 'finance@albahrtravels.com',
  support: 'support@albahrtravels.com',
  customer: 'tariq.mahmood@client.albahrtravels.com',
  partner: 'alnoor.b2b@partner.albahrtravels.com',
};

export type SocialPlatform =
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'linkedin'
  | 'telegram';

export interface SocialConnectorRecord {
  id: string;
  platform: SocialPlatform;
  name: string;
  handle: string;
  accountOrPageId: string;
  webhookUrl: string;
  accessTokenMasked: string;
  connected: boolean;
  autoCaptureLeads: boolean;
  autoPublishPackages: boolean;
  leadsCapturedCount: number;
  messagesSyncedCount: number;
  lastSyncedAt: string;
  externalUrl: string;
}

export interface SocialPostRecord {
  id: string;
  title: string;
  caption: string;
  platforms: SocialPlatform[];
  imageUrl: string;
  status: 'published' | 'scheduled';
  publishedAt: string;
  reachCount: number;
  clicksCount: number;
  leadsGenerated: number;
}

export type AppNavModule =
  | 'dashboard'
  | 'socialMedia'
  | 'inbox'
  | 'customers'
  | 'cases'
  | 'flights'
  | 'umrah'
  | 'visas'
  | 'appointments'
  | 'hotels'
  | 'studyAbroad'
  | 'quotes'
  | 'invoices'
  | 'payments'
  | 'ledger'
  | 'bookings'
  | 'myTrips'
  | 'documents'
  | 'employees'
  | 'partners'
  | 'suppliers'
  | 'websiteCms'
  | 'campaigns'
  | 'subscribers'
  | 'chat'
  | 'support'
  | 'notifications'
  | 'seo'
  | 'languages'
  | 'reviews'
  | 'analytics'
  | 'websiteHealth'
  | 'reports'
  | 'referrals'
  | 'activityAudit'
  | 'rulesStudio'
  | 'assignmentWorkload'
  | 'backupsDr'
  | 'integrations'
  | 'settings';

export const ALL_MODULES: AppNavModule[] = [
  'dashboard',
  'socialMedia',
  'inbox',
  'customers',
  'cases',
  'flights',
  'umrah',
  'visas',
  'appointments',
  'hotels',
  'studyAbroad',
  'quotes',
  'invoices',
  'payments',
  'ledger',
  'bookings',
  'myTrips',
  'documents',
  'employees',
  'partners',
  'suppliers',
  'websiteCms',
  'campaigns',
  'subscribers',
  'chat',
  'support',
  'notifications',
  'seo',
  'languages',
  'reviews',
  'analytics',
  'websiteHealth',
  'reports',
  'referrals',
  'activityAudit',
  'rulesStudio',
  'assignmentWorkload',
  'backupsDr',
  'integrations',
  'settings',
];

export const MODULE_TITLES: Record<AppNavModule, string> = {
  dashboard: 'Dashboard',
  socialMedia: 'Social Media Connectors',
  inbox: 'Inbox & Leads',
  customers: 'Customers',
  cases: 'Cases & Tasks',
  flights: 'Flights',
  umrah: 'Umrah & Hajj',
  visas: 'Visas',
  appointments: 'Appointments',
  hotels: 'Hotels & Transfers',
  studyAbroad: 'Study Abroad',
  quotes: 'Quotes',
  invoices: 'Invoices',
  payments: 'Payments',
  ledger: 'Ledger',
  bookings: 'Bookings',
  myTrips: 'My Trips',
  documents: 'Documents',
  employees: 'Employees & HR',
  partners: 'Partners B2B',
  suppliers: 'Suppliers',
  websiteCms: 'Website CMS',
  campaigns: 'Campaigns',
  subscribers: 'Subscribers',
  chat: 'Omnichannel Chat',
  support: 'Support Desk',
  notifications: 'Notifications',
  seo: 'SEO',
  languages: 'Languages',
  reviews: 'Reviews',
  analytics: 'Analytics',
  websiteHealth: 'Website Health',
  reports: 'Reports & BI',
  referrals: 'Referrals',
  activityAudit: 'Activity & Audit',
  rulesStudio: 'Workflow Rules',
  assignmentWorkload: 'Assignment',
  backupsDr: 'Backups & DR',
  integrations: 'Integrations & APIs',
  settings: 'Settings',
};

export const PERMITTED_MODULES: Record<OsRole, AppNavModule[]> = {
  ceo: ALL_MODULES,
  manager: [
    'dashboard',
    'socialMedia',
    'inbox',
    'customers',
    'cases',
    'flights',
    'umrah',
    'visas',
    'appointments',
    'hotels',
    'studyAbroad',
    'quotes',
    'invoices',
    'bookings',
    'documents',
    'employees',
    'suppliers',
    'websiteCms',
    'campaigns',
    'chat',
    'support',
    'notifications',
    'languages',
    'reviews',
    'analytics',
    'websiteHealth',
    'reports',
    'activityAudit',
    'rulesStudio',
    'assignmentWorkload',
    'integrations',
  ],
  employee: [
    'dashboard',
    'socialMedia',
    'inbox',
    'customers',
    'cases',
    'flights',
    'umrah',
    'visas',
    'appointments',
    'hotels',
    'studyAbroad',
    'quotes',
    'bookings',
    'documents',
    'employees',
    'chat',
    'support',
    'notifications',
    'languages',
  ],
  finance: [
    'dashboard',
    'invoices',
    'payments',
    'ledger',
    'quotes',
    'partners',
    'suppliers',
    'referrals',
    'reports',
    'notifications',
    'activityAudit',
  ],
  support: [
    'dashboard',
    'socialMedia',
    'inbox',
    'customers',
    'cases',
    'chat',
    'support',
    'notifications',
    'languages',
    'reviews',
  ],
  customer: [
    'dashboard',
    'myTrips',
    'umrah',
    'flights',
    'visas',
    'quotes',
    'invoices',
    'payments',
    'documents',
    'chat',
    'support',
    'notifications',
    'languages',
    'reviews',
  ],
  partner: [
    'dashboard',
    'socialMedia',
    'inbox',
    'cases',
    'umrah',
    'quotes',
    'invoices',
    'myTrips',
    'partners',
    'referrals',
    'support',
    'notifications',
    'languages',
  ],
};

export interface StaffRecord {
  id: string;
  name: string;
  email: string;
  role: OsRole;
  skills: string[];
  activeLoad: number;
  maxActive: number;
  autoAssignEnabled: boolean;
  leaveStatus: 'available' | 'on_leave';
  lastAssignedAt?: number;
  active: boolean;
  checkedInToday: boolean;
}

export interface LeadRecord {
  id: string;
  fullName: string;
  phone: string;
  serviceType: string;
  source: string;
  socialPlatform?: SocialPlatform;
  assignedEmployeeId?: string;
  partnerId?: string;
  status: string;
  followUpNote?: string;
  createdAt: number;
}

export interface CustomerRecord {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  ownerUserId?: string;
  partnerId?: string;
  kycVerified: boolean;
  archived: boolean;
  internalNotes: string[];
  customerSafeEvents: string[];
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  dependsOnId?: string;
}

export interface CaseRecord {
  id: string;
  caseNumber: string;
  customerId: string;
  serviceType: string;
  title: string;
  assignedEmployeeId?: string;
  partnerId?: string;
  status: string;
  escalated: boolean;
  tasks: TaskItem[];
}

export interface UmrahPackageRecord {
  id: string;
  pkgNo: string;
  title: string;
  departureCity: string;
  airline: string;
  makkahHotel: string;
  makkahDistanceM: number;
  madinahHotel: string;
  madinahDistanceM: number;
  totalNights: number;
  priceQuadPkr: number;
  status: string;
}

export interface QuoteRecord {
  id: string;
  quoteNumber: string;
  customerId: string;
  partnerId?: string;
  title: string;
  supplierCostPkr: number;
  sellingPricePkr: number;
  versionNo: number;
  status: string;
  validUntil: number;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  quoteId: string;
  customerId: string;
  partnerId?: string;
  totalPkr: number;
  verifiedPaidPkr: number;
  status: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  customerId: string;
  amountPkr: number;
  bankName: string;
  bankRef: string;
  status: 'pending_review' | 'verified' | 'rejected' | 'refunded';
  reviewReason?: string;
}

export interface BookingRecord {
  id: string;
  bookingNumber: string;
  customerId: string;
  partnerId?: string;
  invoiceId?: string;
  title: string;
  supplierRef?: string;
  ticketOrVoucherFile?: string;
  status: string;
}

export interface DocumentRecord {
  id: string;
  customerId: string;
  category: string;
  fileName: string;
  reviewStatus: string;
  reason?: string;
  versionNo: number;
}

export interface RuleRecord {
  id: string;
  name: string;
  triggerEvent: string;
  conditionSummary: string;
  actionSummary: string;
  versionNo: number;
  enabled: boolean;
}

export interface AuditEntry {
  id: string;
  actorRole: OsRole;
  action: string;
  resource: string;
  summary: string;
  at: number;
}
