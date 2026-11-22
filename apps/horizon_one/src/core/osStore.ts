import type { LocaleCode } from './l10n.ts';
import {
  ALL_ROLES,
  MODULE_TITLES,
  PERMITTED_MODULES,
  ROLE_DEFAULT_EMAILS,
  ROLE_TITLES,
} from './models.ts';
import type {
  AppNavModule,
  AuditEntry,
  BookingRecord,
  CaseRecord,
  CustomerRecord,
  DocumentRecord,
  InvoiceRecord,
  LeadRecord,
  OsRole,
  PaymentRecord,
  QuoteRecord,
  RuleRecord,
  SocialConnectorRecord,
  SocialPlatform,
  SocialPostRecord,
  StaffRecord,
  UmrahPackageRecord,
} from './models.ts';

export interface ActionResult {
  ok: boolean;
  message: string;
  requestId?: string;
}

export class HorizonOsEngine {
  // Bootstrap & Auth
  splashComplete = false;
  bootstrapProgress = 1.0;
  bootstrapStage = 'AL-BAHR HORIZON Cloud Workspace Ready';
  bootstrapFailed = false;

  authenticated = false;
  mfaVerified = false;
  currentRole: OsRole = 'ceo';
  currentUserId = 'usr-ceo';
  currentUserName = 'Muhammad Usman';
  currentPartnerId: string | null = null;
  locale: LocaleCode = 'en';

  // Connection & UI State
  isOffline = false;
  simulateSkeletonLoading = false;
  lastErrorMessage: string | null = null;
  lastErrorRequestId: string | null = null;
  searchQuery = '';
  activeModule: AppNavModule = 'dashboard';

  // Live Server Config
  serverBaseUrl = 'https://os.albahrtravels.com';
  useLiveServer = false;
  authToken: string | null = null;

  // Company Settings
  whatsappVerified = true;
  whatsappBusinessNumber = '+923008442100';
  legalSuffixVerified = false;
  logoAssetVerified = true;
  defaultFlightMarkupPkr = 2000;
  automationEmergencyPaused = false;

  // Multi-step Umrah Draft Autosave State
  umrahDraftStep = 1;
  umrahDraftCity = 'Lahore';
  umrahDraftNights = 14;
  umrahDraftPax = 2;
  umrahDraftMakkahDist = 'Within 400m Haram';
  umrahDraftMadinahDist = 'Within 200m Markazia';
  umrahDraftRoom = 'Quad';
  umrahDraftTransport = 'Shared Bus';
  umrahDraftZiyarat = true;
  draftSyncStatus = 'Saved';

  // Operational & Social Collections
  staff: StaffRecord[] = [];
  leads: LeadRecord[] = [];
  customers: CustomerRecord[] = [];
  cases: CaseRecord[] = [];
  umrahPackages: UmrahPackageRecord[] = [];
  quotes: QuoteRecord[] = [];
  invoices: InvoiceRecord[] = [];
  payments: PaymentRecord[] = [];
  bookings: BookingRecord[] = [];
  documents: DocumentRecord[] = [];
  rules: RuleRecord[] = [];
  auditLog: AuditEntry[] = [];
  socialConnectors: SocialConnectorRecord[] = [];
  socialPosts: SocialPostRecord[] = [];
  supportTickets: Array<Record<string, string>> = [];
  cmsDrafts: Array<Record<string, string>> = [];
  campaigns: Array<Record<string, string>> = [];
  subscribers: Array<Record<string, string>> = [];
  suppliers: Array<Record<string, string>> = [];
  partners: Array<Record<string, string>> = [];
  visas: Array<Record<string, string>> = [];
  appointments: Array<Record<string, string>> = [];
  hotels: Array<Record<string, string>> = [];
  studyCases: Array<Record<string, string>> = [];
  chatMessages: Array<Record<string, string>> = [];
  notifications: Array<Record<string, string>> = [];
  reviews: Array<Record<string, string>> = [];
  backups: Array<Record<string, string>> = [];
  ledger: Array<Record<string, string>> = [];
  pendingInvites: Array<Record<string, string>> = [];

  private idempotencyKeys = new Set<string>();
  private listeners = new Set<() => void>();

  constructor() {
    this.seedWorkspaceData();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  skipSplash(): void {
    this.splashComplete = true;
    this.notify();
  }

  showSplashPreview(): void {
    this.splashComplete = false;
    this.notify();
  }

  async signIn(params: { email: string; password: string; role?: OsRole }): Promise<ActionResult> {
    const email = params.email.trim();
    const password = params.password;
    const role = params.role ?? this.currentRole;

    if (!email || !password) {
      return { ok: false, message: 'Email and password are required.' };
    }

    if (this.useLiveServer) {
      try {
        const targetUrl = `${this.serverBaseUrl.replace(/\/+$/, '')}/api/v1/auth/login`;
        const resp = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (resp.status === 200) {
          const parsed = (await resp.json()) as {
            token?: string;
            user: { id: string; fullName: string; role: string; partnerId?: string };
          };
          this.authToken = parsed.token ?? null;
          this.currentUserId = parsed.user.id;
          this.currentUserName = parsed.user.fullName;
          this.currentRole = ALL_ROLES.includes(parsed.user.role as OsRole)
            ? (parsed.user.role as OsRole)
            : 'employee';
          this.currentPartnerId = parsed.user.partnerId ?? null;
          this.authenticated = true;
          this.splashComplete = true;
          this.activeModule = 'dashboard';
          this.notify();
          return { ok: true, message: 'Signed in to AL-BAHR HORIZON server.' };
        }
        return { ok: false, message: `Authentication failed (HTTP ${resp.status}).` };
      } catch (err) {
        return { ok: false, message: `Server connection error: ${String(err)}` };
      }
    }

    this.currentRole = role;
    switch (role) {
      case 'ceo':
        this.currentUserId = 'usr-ceo';
        this.currentUserName = 'Muhammad Usman';
        this.currentPartnerId = null;
        break;
      case 'manager':
        this.currentUserId = 'usr-mgr';
        this.currentUserName = 'Salman Farooq';
        this.currentPartnerId = null;
        break;
      case 'employee':
        this.currentUserId = 'emp-1';
        this.currentUserName = 'Amina Tariq';
        this.currentPartnerId = null;
        break;
      case 'finance':
        this.currentUserId = 'usr-fin';
        this.currentUserName = 'Zainab Raza';
        this.currentPartnerId = null;
        break;
      case 'support':
        this.currentUserId = 'usr-sup';
        this.currentUserName = 'Hassan Ali';
        this.currentPartnerId = null;
        break;
      case 'customer':
        this.currentUserId = 'usr-cust-1';
        this.currentUserName = 'Tariq Mahmood';
        this.currentPartnerId = null;
        break;
      case 'partner':
        this.currentUserId = 'usr-part-1';
        this.currentUserName = 'Al-Noor Travels (B2B)';
        this.currentPartnerId = 'partner-1';
        break;
    }

    this.authenticated = true;
    this.mfaVerified = role !== 'ceo' && role !== 'finance';
    this.splashComplete = true;
    this.activeModule = 'dashboard';
    this.lastErrorMessage = null;
    this.logAudit(
      'auth.login',
      'session',
      this.currentUserId,
      `Signed in as ${this.currentUserName} (${ROLE_TITLES[this.currentRole]})`,
    );
    this.notify();
    return { ok: true, message: `Welcome back, ${this.currentUserName}.` };
  }

  switchAccountRole(role: OsRole): void {
    if (this.useLiveServer) return;
    void this.signIn({
      email: ROLE_DEFAULT_EMAILS[role],
      password: 'albahr-role-switch',
      role,
    });
  }

  verifyMfa(code: string): boolean {
    const cleaned = code.trim();
    if (/^\d{6}$/.test(cleaned)) {
      this.mfaVerified = true;
      this.logAudit('auth.mfa_verified', 'session', this.currentUserId, '2FA verification completed');
      this.notify();
      return true;
    }
    return false;
  }

  signOut(): void {
    this.authenticated = false;
    this.mfaVerified = false;
    this.authToken = null;
    this.logAudit('auth.logout', 'session', this.currentUserId, 'Session signed out');
    this.notify();
  }

  setLocale(nextLocale: LocaleCode): void {
    if (nextLocale === 'en' || nextLocale === 'ur') {
      this.locale = nextLocale;
      this.notify();
    }
  }

  setModule(mod: AppNavModule): boolean {
    const permitted = PERMITTED_MODULES[this.currentRole];
    if (!permitted.includes(mod)) {
      this.lastErrorMessage = `Access denied (403): ${ROLE_TITLES[this.currentRole]} cannot access ${MODULE_TITLES[mod]}`;
      this.lastErrorRequestId = `req_rbac_${Date.now()}`;
      this.notify();
      return false;
    }
    this.activeModule = mod;
    this.lastErrorMessage = null;
    this.notify();
    return true;
  }

  dismissError(): void {
    this.lastErrorMessage = null;
    this.notify();
  }

  toggleOffline(offline: boolean): void {
    this.isOffline = offline;
    this.draftSyncStatus = offline ? 'Offline / Sync Pending' : `Synced at ${this.hhmm()}`;
    this.notify();
  }

  updateUmrahDraft(patch: {
    step?: number;
    city?: string;
    nights?: number;
    pax?: number;
    makkahDist?: string;
    madinahDist?: string;
    room?: string;
    transport?: string;
    ziyarat?: boolean;
  }): void {
    if (patch.step !== undefined) this.umrahDraftStep = Math.max(1, Math.min(4, patch.step));
    if (patch.city !== undefined) this.umrahDraftCity = patch.city;
    if (patch.nights !== undefined) this.umrahDraftNights = patch.nights;
    if (patch.pax !== undefined) this.umrahDraftPax = patch.pax;
    if (patch.makkahDist !== undefined) this.umrahDraftMakkahDist = patch.makkahDist;
    if (patch.madinahDist !== undefined) this.umrahDraftMadinahDist = patch.madinahDist;
    if (patch.room !== undefined) this.umrahDraftRoom = patch.room;
    if (patch.transport !== undefined) this.umrahDraftTransport = patch.transport;
    if (patch.ziyarat !== undefined) this.umrahDraftZiyarat = patch.ziyarat;
    this.draftSyncStatus = this.isOffline ? 'Offline / Sync Pending' : `Saved at ${this.hhmm()}`;
    this.notify();
  }

  // ---------------------------------------------------------------------------
  // SOCIAL MEDIA CONNECTORS & OMNICHANNEL HUB
  // ---------------------------------------------------------------------------
  toggleSocialConnector(platform: SocialPlatform): ActionResult {
    const conn = this.socialConnectors.find((c) => c.platform === platform);
    if (!conn) return { ok: false, message: 'Connector not found.' };
    conn.connected = !conn.connected;
    conn.lastSyncedAt = conn.connected ? `Connected ${this.hhmm()}` : 'Paused';
    this.logAudit(
      conn.connected ? 'social.connected' : 'social.paused',
      'social_connector',
      conn.platform,
      `${conn.name} (${conn.handle}) ${conn.connected ? 'connected' : 'paused'}`,
    );
    this.notify();
    return {
      ok: true,
      message: `${conn.name} is now ${conn.connected ? 'Connected & Syncing' : 'Paused'}.`,
    };
  }

  configureSocialConnector(params: {
    platform: SocialPlatform;
    handle: string;
    accountOrPageId: string;
    accessToken: string;
    autoCaptureLeads: boolean;
    autoPublishPackages: boolean;
  }): ActionResult {
    const conn = this.socialConnectors.find((c) => c.platform === params.platform);
    if (!conn) return { ok: false, message: 'Connector not found.' };
    if (!params.handle.trim() || !params.accountOrPageId.trim()) {
      return { ok: false, message: 'Handle and Account/Page ID are required.' };
    }
    conn.handle = params.handle.trim();
    conn.accountOrPageId = params.accountOrPageId.trim();
    if (params.accessToken.trim()) {
      const tok = params.accessToken.trim();
      conn.accessTokenMasked =
        tok.length > 8 ? `${tok.slice(0, 4)}••••••••${tok.slice(-4)}` : '••••••••';
    }
    conn.autoCaptureLeads = params.autoCaptureLeads;
    conn.autoPublishPackages = params.autoPublishPackages;
    conn.connected = true;
    conn.lastSyncedAt = `Verified ${this.hhmm()}`;
    this.logAudit(
      'social.configured',
      'social_connector',
      conn.platform,
      `Updated API credentials & webhook config for ${conn.name} (${conn.handle})`,
    );
    this.notify();
    return {
      ok: true,
      message: `${conn.name} credentials saved and webhook verified.`,
    };
  }

  testSocialConnector(platform: SocialPlatform): ActionResult {
    if (this.isOffline) {
      return { ok: false, message: 'Cannot test live social webhook while offline.' };
    }
    const conn = this.socialConnectors.find((c) => c.platform === platform);
    if (!conn) return { ok: false, message: 'Connector not found.' };
    conn.connected = true;
    conn.lastSyncedAt = `Webhook OK (${this.hhmm()})`;
    this.logAudit(
      'social.webhook_ping',
      'social_connector',
      conn.platform,
      `Webhook handshake 200 OK on ${conn.webhookUrl}`,
    );
    this.notify();
    return {
      ok: true,
      message: `${conn.name} Webhook handshake succeeded (200 OK · ${conn.handle}).`,
    };
  }

  ingestSocialLead(params: {
    platform: SocialPlatform;
    fullName: string;
    phone: string;
    serviceType: string;
    inquiryText?: string;
  }): ActionResult {
    const conn = this.socialConnectors.find((c) => c.platform === params.platform);
    const sourceLabel = conn ? `${conn.name} (${conn.handle})` : params.platform.toUpperCase();

    const res = this.createAndAssignLead({
      fullName: params.fullName,
      phone: params.phone,
      serviceType: params.serviceType,
      source: sourceLabel,
      socialPlatform: params.platform,
      consentGiven: true,
    });

    if (res.ok && conn) {
      conn.leadsCapturedCount += 1;
      conn.messagesSyncedCount += 1;
      conn.lastSyncedAt = `Lead synced ${this.hhmm()}`;
      if (params.inquiryText?.trim()) {
        this.chatMessages.unshift({
          sender: `${params.fullName} via ${conn.name}`,
          channel: conn.platform.toUpperCase(),
          body: params.inquiryText.trim(),
        });
      }
      this.notify();
    }
    return res;
  }

  publishSocialPost(params: {
    title: string;
    caption: string;
    platforms: SocialPlatform[];
    imageUrl?: string;
  }): ActionResult {
    if (this.isOffline) {
      return { ok: false, message: 'Offline mode: social media publishing requires internet.' };
    }
    if (!params.title.trim() || !params.caption.trim()) {
      return { ok: false, message: 'Post title and caption are required.' };
    }
    if (params.platforms.length === 0) {
      return { ok: false, message: 'Select at least one connected social network.' };
    }

    const post: SocialPostRecord = {
      id: `sp-${this.socialPosts.length + 101}`,
      title: params.title.trim(),
      caption: params.caption.trim(),
      platforms: params.platforms,
      imageUrl: params.imageUrl ?? './assets/images/travel-istanbul.jpg',
      status: 'published',
      publishedAt: `Today at ${this.hhmm()}`,
      reachCount: 1420 + params.platforms.length * 640,
      clicksCount: 84 + params.platforms.length * 29,
      leadsGenerated: params.platforms.length * 3,
    };
    this.socialPosts.unshift(post);

    for (const plat of params.platforms) {
      const conn = this.socialConnectors.find((c) => c.platform === plat);
      if (conn) {
        conn.lastSyncedAt = `Published ${this.hhmm()}`;
      }
    }

    this.logAudit(
      'social.post_published',
      'social_post',
      post.id,
      `Published "${post.title}" to ${params.platforms.join(', ')}`,
    );
    this.notify();
    return {
      ok: true,
      message: `Published "${post.title}" across ${params.platforms.map((p) => p.toUpperCase()).join(', ')}.`,
    };
  }

  // Smart Least-Load Lead Assignment
  createAndAssignLead(params: {
    fullName: string;
    phone: string;
    serviceType: string;
    source: string;
    socialPlatform?: SocialPlatform;
    consentGiven: boolean;
    idempotencyKey?: string;
  }): ActionResult {
    if (!params.fullName.trim() || !params.phone.trim()) {
      return { ok: false, message: 'Name and phone are required.' };
    }
    if (!params.consentGiven) {
      return { ok: false, message: 'Explicit consent is required.' };
    }
    if (params.idempotencyKey && this.idempotencyKeys.has(params.idempotencyKey)) {
      return { ok: true, message: 'Duplicate submit prevented (Idempotency-Key reused).' };
    }
    if (params.idempotencyKey) {
      this.idempotencyKeys.add(params.idempotencyKey);
    }

    let assignedId: string | undefined;
    let status = 'triaged';
    let reason = 'EMERGENCY_PAUSE_ACTIVE';

    if (!this.automationEmergencyPaused) {
      const eligible = this.staff
        .filter(
          (s) =>
            s.active &&
            s.autoAssignEnabled &&
            s.leaveStatus === 'available' &&
            s.activeLoad < s.maxActive &&
            (s.skills.includes(params.serviceType) || s.skills.includes('general')),
        )
        .sort((a, b) => {
          const ratioA = a.activeLoad / a.maxActive;
          const ratioB = b.activeLoad / b.maxActive;
          if (ratioA !== ratioB) return ratioA - ratioB;
          if (a.activeLoad !== b.activeLoad) return a.activeLoad - b.activeLoad;
          const timeA = a.lastAssignedAt ?? 0;
          const timeB = b.lastAssignedAt ?? 0;
          if (timeA !== timeB) return timeA - timeB;
          return a.id.localeCompare(b.id);
        });

      if (eligible.length > 0) {
        const chosen = eligible[0];
        const prevLoad = chosen.activeLoad;
        chosen.activeLoad += 1;
        chosen.lastAssignedAt = Date.now();
        assignedId = chosen.id;
        status = 'assigned';
        reason = `Assigned to ${chosen.name} (lowest workload ${prevLoad}/${chosen.maxActive})`;
      } else {
        reason = 'No eligible staff available -> Manager Triage Queue';
      }
    }

    const lead: LeadRecord = {
      id: `ld-${this.leads.length + 101}`,
      fullName: params.fullName.trim(),
      phone: params.phone.trim(),
      serviceType: params.serviceType,
      source: params.source,
      socialPlatform: params.socialPlatform,
      assignedEmployeeId: assignedId,
      partnerId: this.currentRole === 'partner' ? (this.currentPartnerId ?? undefined) : undefined,
      status,
      createdAt: Date.now(),
    };
    this.leads.unshift(lead);
    this.logAudit('lead.created', 'lead', lead.id, reason);
    this.notify();
    return { ok: true, message: reason };
  }

  convertLeadToCase(leadId: string): ActionResult {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) return { ok: false, message: 'Lead not found.' };
    if (lead.status === 'converted') {
      return { ok: true, message: 'Lead already converted to case.' };
    }

    let cust = this.customers.find((c) => c.phone === lead.phone && !c.archived);
    if (!cust) {
      cust = {
        id: `cust-${this.customers.length + 101}`,
        fullName: lead.fullName,
        phone: lead.phone,
        email: `${lead.fullName.toLowerCase().replace(/\s+/g, '.')}@client.albahrtravels.com`,
        partnerId: lead.partnerId,
        kycVerified: false,
        archived: false,
        internalNotes: [],
        customerSafeEvents: ['Customer profile created from lead'],
      };
      this.customers.unshift(cust);
    }

    const c: CaseRecord = {
      id: `cs-${this.cases.length + 101}`,
      caseNumber: `CASE-2026-${1010 + this.cases.length}`,
      customerId: cust.id,
      serviceType: lead.serviceType,
      title: `${lead.serviceType.toUpperCase()} — ${lead.fullName}`,
      assignedEmployeeId: lead.assignedEmployeeId,
      partnerId: lead.partnerId,
      status: 'assigned',
      escalated: false,
      tasks: [
        { id: `tk-${Date.now()}-1`, title: 'Collect & verify passport & documents', completed: false },
        { id: `tk-${Date.now()}-2`, title: 'Prepare supplier-verified quote', completed: false },
      ],
    };
    this.cases.unshift(c);
    lead.status = 'converted';
    this.logAudit('lead.converted', 'case', c.caseNumber, `Converted lead ${lead.id} reusing customer ${cust.id}`);
    this.notify();
    return { ok: true, message: `Converted to ${c.caseNumber} using single customer profile.` };
  }

  uploadBankSlip(params: {
    invoiceId: string;
    amountPkr: number;
    bankName: string;
    bankRef: string;
  }): ActionResult {
    if (params.amountPkr <= 0 || !params.bankRef.trim()) {
      return { ok: false, message: 'Positive amount and bank reference required.' };
    }
    const inv = this.invoices.find((i) => i.id === params.invoiceId);
    if (!inv) return { ok: false, message: 'Invoice not found.' };

    const pay: PaymentRecord = {
      id: `pay-${this.payments.length + 201}`,
      invoiceId: params.invoiceId,
      customerId: inv.customerId,
      amountPkr: params.amountPkr,
      bankName: params.bankName,
      bankRef: params.bankRef.trim(),
      status: 'pending_review',
    };
    this.payments.unshift(pay);
    this.logAudit(
      'payment.slip_uploaded',
      'payment',
      pay.id,
      `Bank slip uploaded (${params.bankRef}) -> pending_review`,
    );
    this.notify();
    return {
      ok: true,
      message: 'Bank slip uploaded as Pending Review. Finance verification is required before ticket issuance.',
    };
  }

  verifyOrRejectPayment(params: {
    paymentId: string;
    approve: boolean;
    reason: string;
  }): ActionResult {
    if (this.isOffline) {
      return {
        ok: false,
        message: 'Offline mode: payment verification is strictly disabled offline.',
      };
    }
    if (this.currentRole !== 'ceo' && this.currentRole !== 'finance') {
      return {
        ok: false,
        message: `403 Forbidden: ${ROLE_TITLES[this.currentRole]} cannot verify payments (Finance/CEO only).`,
      };
    }
    const pay = this.payments.find((p) => p.id === params.paymentId);
    if (!pay) return { ok: false, message: 'Payment not found.' };
    if (pay.status !== 'pending_review') {
      return { ok: false, message: `Payment already ${pay.status}.` };
    }
    if (!params.approve && !params.reason.trim()) {
      return { ok: false, message: 'Rejection reason is mandatory.' };
    }

    if (!params.approve) {
      pay.status = 'rejected';
      pay.reviewReason = params.reason.trim();
      this.logAudit('payment.rejected', 'payment', pay.id, `Rejected: ${pay.reviewReason}`);
      this.notify();
      return {
        ok: true,
        message: 'Payment rejected. Invoice remains unpaid & tickets blocked.',
      };
    }

    const inv = this.invoices.find((i) => i.id === pay.invoiceId);
    if (inv) {
      inv.verifiedPaidPkr += pay.amountPkr;
      inv.status = inv.verifiedPaidPkr >= inv.totalPkr ? 'paid' : 'partially_paid';
    }
    pay.status = 'verified';
    pay.reviewReason = params.reason.trim() || 'Reconciled against bank statement';
    this.ledger.unshift({
      id: `led-${this.ledger.length + 1}`,
      account: 'bank_cleared (DR) / receivable (CR)',
      amount: `PKR ${pay.amountPkr.toLocaleString()}`,
      ref: `${pay.id} (${pay.bankRef})`,
    });
    this.logAudit(
      'payment.verified',
      'payment',
      pay.id,
      `Finance verified PKR ${pay.amountPkr}; ledger appended`,
    );
    this.notify();
    return {
      ok: true,
      message: 'Payment verified and append-only ledger entry posted.',
    };
  }

  issueTicketOrVoucher(params: {
    bookingId: string;
    supplierRef: string;
    documentName: string;
  }): ActionResult {
    if (this.isOffline) {
      return {
        ok: false,
        message: 'Offline mode: ticket/voucher confirmation disabled offline.',
      };
    }
    if (
      this.currentRole === 'customer' ||
      this.currentRole === 'partner' ||
      this.currentRole === 'support'
    ) {
      return {
        ok: false,
        message: '403 Forbidden: Only authorized Operations staff can issue tickets.',
      };
    }
    if (!params.supplierRef.trim() || !params.documentName.trim()) {
      return {
        ok: false,
        message: 'Real supplier PNR/reference and uploaded voucher/e-ticket PDF are required.',
      };
    }
    const bk = this.bookings.find((b) => b.id === params.bookingId);
    if (!bk) return { ok: false, message: 'Booking not found.' };
    if (!bk.invoiceId) {
      return { ok: false, message: 'Blocked: No linked invoice found for booking.' };
    }
    const hasVerifiedPay = this.payments.some(
      (p) => p.invoiceId === bk.invoiceId && p.status === 'verified',
    );
    if (!hasVerifiedPay) {
      return {
        ok: false,
        message: 'Blocked: Payment must be verified by Finance before issuing ticket/voucher.',
      };
    }

    bk.supplierRef = params.supplierRef.trim();
    bk.ticketOrVoucherFile = params.documentName.trim();
    bk.status = 'documents_issued';
    this.logAudit(
      'booking.documents_issued',
      'booking',
      bk.bookingNumber,
      `Confirmed with ref ${params.supplierRef} & file ${params.documentName}`,
    );
    this.notify();
    return {
      ok: true,
      message: 'Verified ticket/voucher issued to Customer My Trips & WhatsApp notification queued.',
    };
  }

  createFlightQuoteWithMarkup(params: {
    customerId: string;
    route: string;
    pax: number;
    netFarePerPax: number;
    overrideMarkupPerPax?: number;
  }): ActionResult {
    if (params.pax <= 0 || params.netFarePerPax <= 0) {
      return {
        ok: false,
        message: 'Passengers and supplier net fare must be positive.',
      };
    }
    let markup = this.defaultFlightMarkupPkr;
    if (
      params.overrideMarkupPerPax !== undefined &&
      params.overrideMarkupPerPax !== markup
    ) {
      if (this.currentRole !== 'ceo') {
        return {
          ok: false,
          message:
            '403 Forbidden: Only CEO can override default PKR 2,000/pax flight markup.',
        };
      }
      markup = params.overrideMarkupPerPax;
    }
    const totalCost = params.pax * params.netFarePerPax;
    const totalSell = params.pax * (params.netFarePerPax + markup);
    const q: QuoteRecord = {
      id: `qt-${this.quotes.length + 101}`,
      quoteNumber: `QT-2026-${1010 + this.quotes.length}`,
      customerId: params.customerId,
      title: `Flight ${params.route} (${params.pax} Pax)`,
      supplierCostPkr: totalCost,
      sellingPricePkr: totalSell,
      versionNo: 1,
      status: 'sent',
      validUntil: Date.now() + 2 * 24 * 3600 * 1000,
    };
    this.quotes.unshift(q);
    this.logAudit(
      'flight.quote_created',
      'quote',
      q.quoteNumber,
      `Markup PKR ${markup}/pax -> Selling PKR ${totalSell}`,
    );
    this.notify();
    return {
      ok: true,
      message: `${q.quoteNumber} created (Selling PKR ${totalSell}).`,
    };
  }

  acceptQuote(quoteId: string, idempotencyKey?: string): ActionResult {
    const q = this.quotes.find((x) => x.id === quoteId);
    if (!q) return { ok: false, message: 'Quote not found.' };
    if (q.validUntil < Date.now()) {
      q.status = 'expired';
      this.notify();
      return {
        ok: false,
        message: 'Quote expired — revise quote validity first.',
      };
    }
    if (
      q.status === 'accepted' ||
      (idempotencyKey && this.idempotencyKeys.has(idempotencyKey))
    ) {
      return {
        ok: true,
        message: 'Quote already accepted — duplicate invoice prevented.',
      };
    }
    if (idempotencyKey) this.idempotencyKeys.add(idempotencyKey);

    q.status = 'accepted';
    const inv: InvoiceRecord = {
      id: `inv-${this.invoices.length + 101}`,
      invoiceNumber: `INV-2026-${1010 + this.invoices.length}`,
      quoteId: q.id,
      customerId: q.customerId,
      partnerId: q.partnerId,
      totalPkr: q.sellingPricePkr,
      verifiedPaidPkr: 0,
      status: 'issued',
    };
    this.invoices.unshift(inv);
    this.logAudit(
      'quote.accepted',
      'invoice',
      inv.invoiceNumber,
      `Generated single invoice for ${q.quoteNumber}`,
    );
    this.notify();
    return {
      ok: true,
      message: `Quote accepted. ${inv.invoiceNumber} generated.`,
    };
  }

  togglePackageStatus(pkgId: string, newStatus: string): ActionResult {
    if (this.isOffline) {
      return {
        ok: false,
        message: 'Offline mode: website publishing disabled offline.',
      };
    }
    if (this.currentRole !== 'ceo' && this.currentRole !== 'manager') {
      return {
        ok: false,
        message:
          '403 Forbidden: Only CEO or delegated publisher can publish/expire packages.',
      };
    }
    const pkg = this.umrahPackages.find((p) => p.id === pkgId);
    if (!pkg) return { ok: false, message: 'Package not found.' };
    pkg.status = newStatus;
    this.logAudit(
      `umrah.package_${newStatus}`,
      'umrah_package',
      pkg.pkgNo,
      `Status changed to ${newStatus}`,
    );
    this.notify();
    return {
      ok: true,
      message: `Package ${pkg.pkgNo} is now ${newStatus}.`,
    };
  }

  inviteStaff(params: { name: string; email: string; role: OsRole }): ActionResult {
    if (this.currentRole !== 'ceo' && this.currentRole !== 'manager') {
      return { ok: false, message: '403 Forbidden: Only CEO/Manager can invite staff.' };
    }
    if (params.role === 'ceo' && this.currentRole !== 'ceo') {
      return { ok: false, message: '403 Forbidden: Only CEO can invite CEO accounts.' };
    }
    const token = `ALBAHR-INV-${Date.now().toString(36).toUpperCase()}`;
    this.pendingInvites.unshift({
      name: params.name,
      email: params.email,
      role: params.role,
      token,
      status: 'active_48h',
    });
    this.logAudit(
      'staff.invited',
      'invitation',
      params.email,
      `One-time invite issued for ${ROLE_TITLES[params.role]}`,
    );
    this.notify();
    return { ok: true, message: `One-time invite created: ${token}` };
  }

  redeemInviteToken(token: string, newPassword: string): ActionResult {
    if (newPassword.length < 10) {
      return { ok: false, message: 'Password must be at least 10 characters.' };
    }
    const inv = this.pendingInvites.find(
      (i) => i.token === token.trim() && i.status === 'active_48h',
    );
    if (!inv) {
      return {
        ok: false,
        message: 'Invitation token is invalid, expired, or already redeemed.',
      };
    }
    inv.status = 'redeemed';
    const role: OsRole = ALL_ROLES.includes(inv.role as OsRole)
      ? (inv.role as OsRole)
      : 'employee';
    this.staff.push({
      id: `emp-${this.staff.length + 1}`,
      name: inv.name,
      email: inv.email,
      role,
      skills: ['umrah', 'visa', 'general'],
      activeLoad: 0,
      maxActive: 10,
      autoAssignEnabled: true,
      leaveStatus: 'available',
      active: true,
      checkedInToday: false,
    });
    this.logAudit('staff.activated', 'employee', inv.email, 'Activated via single-use token');
    this.notify();
    return {
      ok: true,
      message: `Employee ${inv.name} activated. You can now sign in.`,
    };
  }

  toggleEmergencyPause(): ActionResult {
    if (this.currentRole !== 'ceo') {
      return {
        ok: false,
        message: '403 Forbidden: Emergency Pause requires CEO authorization.',
      };
    }
    this.automationEmergencyPaused = !this.automationEmergencyPaused;
    this.logAudit(
      'rules.emergency_pause',
      'automation',
      'all',
      this.automationEmergencyPaused
        ? 'CEO paused auto-routing (manual triage active)'
        : 'CEO resumed automated lead routing',
    );
    this.notify();
    return {
      ok: true,
      message: this.automationEmergencyPaused
        ? 'Auto-routing paused. New leads route to Manager Triage.'
        : 'Automated lead routing resumed.',
    };
  }

  // Scoped Views enforcing strict Role/Tenant Isolation
  get scopedLeads(): LeadRecord[] {
    return this.leads.filter((l) => {
      if (this.currentRole === 'employee') return l.assignedEmployeeId === this.currentUserId;
      if (this.currentRole === 'partner') return l.partnerId === this.currentPartnerId;
      if (this.currentRole === 'customer') return false;
      return true;
    });
  }

  get scopedCases(): CaseRecord[] {
    return this.cases.filter((c) => {
      if (this.currentRole === 'employee') return c.assignedEmployeeId === this.currentUserId;
      if (this.currentRole === 'partner') return c.partnerId === this.currentPartnerId;
      if (this.currentRole === 'customer') {
        const ownCust = new Set(
          this.customers.filter((cu) => cu.ownerUserId === this.currentUserId).map((e) => e.id),
        );
        return ownCust.has(c.customerId);
      }
      return true;
    });
  }

  get scopedInvoices(): InvoiceRecord[] {
    return this.invoices.filter((inv) => {
      if (this.currentRole === 'customer') {
        const ownCust = new Set(
          this.customers.filter((cu) => cu.ownerUserId === this.currentUserId).map((e) => e.id),
        );
        return ownCust.has(inv.customerId);
      }
      if (this.currentRole === 'partner') return inv.partnerId === this.currentPartnerId;
      return true;
    });
  }

  get scopedBookings(): BookingRecord[] {
    return this.bookings.filter((b) => {
      if (this.currentRole === 'customer') {
        const ownCust = new Set(
          this.customers.filter((cu) => cu.ownerUserId === this.currentUserId).map((e) => e.id),
        );
        return ownCust.has(b.customerId);
      }
      if (this.currentRole === 'partner') return b.partnerId === this.currentPartnerId;
      return true;
    });
  }

  private logAudit(action: string, resource: string, resourceId: string, summary: string): void {
    this.auditLog.unshift({
      id: `aud-${this.auditLog.length + 1}`,
      actorRole: this.currentRole,
      action,
      resource: `${resource}:${resourceId}`,
      summary,
      at: Date.now(),
    });
  }

  private hhmm(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  }

  private seedWorkspaceData(): void {
    this.staff = [
      {
        id: 'emp-1',
        name: 'Amina Consultant',
        email: 'amina@albahrtravels.com',
        role: 'employee',
        skills: ['umrah', 'visa', 'general'],
        activeLoad: 2,
        maxActive: 10,
        autoAssignEnabled: true,
        leaveStatus: 'available',
        active: true,
        checkedInToday: true,
      },
      {
        id: 'emp-2',
        name: 'Bilal Operations',
        email: 'bilal@albahrtravels.com',
        role: 'employee',
        skills: ['flight', 'hotel', 'umrah'],
        activeLoad: 1,
        maxActive: 10,
        autoAssignEnabled: true,
        leaveStatus: 'available',
        active: true,
        checkedInToday: true,
      },
      {
        id: 'emp-3',
        name: 'Usman Study/Visa',
        email: 'usman.visa@albahrtravels.com',
        role: 'employee',
        skills: ['study', 'visa', 'appointment'],
        activeLoad: 0,
        maxActive: 8,
        autoAssignEnabled: true,
        leaveStatus: 'on_leave',
        active: true,
        checkedInToday: false,
      },
    ];

    this.socialConnectors = [
      {
        id: 'soc-wa',
        platform: 'whatsapp',
        name: 'WhatsApp Business Cloud API',
        handle: '+92 300 8442100',
        accountOrPageId: 'WABA-9841205541',
        webhookUrl: 'https://os.albahrtravels.com/api/v1/webhooks/social/whatsapp',
        accessTokenMasked: 'EAAG••••••••92WK',
        connected: true,
        autoCaptureLeads: true,
        autoPublishPackages: true,
        leadsCapturedCount: 148,
        messagesSyncedCount: 612,
        lastSyncedAt: 'Live · 1m ago',
        externalUrl: 'https://wa.me/923008442100',
      },
      {
        id: 'soc-fb',
        platform: 'facebook',
        name: 'Facebook Page & Lead Ads',
        handle: '@albahrtravels',
        accountOrPageId: 'FB-PAGE-442190812',
        webhookUrl: 'https://os.albahrtravels.com/api/v1/webhooks/social/facebook',
        accessTokenMasked: 'EAAB••••••••44QM',
        connected: true,
        autoCaptureLeads: true,
        autoPublishPackages: true,
        leadsCapturedCount: 94,
        messagesSyncedCount: 280,
        lastSyncedAt: 'Live · 3m ago',
        externalUrl: 'https://www.facebook.com/',
      },
      {
        id: 'soc-ig',
        platform: 'instagram',
        name: 'Instagram Business & Direct',
        handle: '@albahrtravels.official',
        accountOrPageId: 'IG-BIZ-1784140992',
        webhookUrl: 'https://os.albahrtravels.com/api/v1/webhooks/social/instagram',
        accessTokenMasked: 'IGQV••••••••81ZX',
        connected: true,
        autoCaptureLeads: true,
        autoPublishPackages: true,
        leadsCapturedCount: 76,
        messagesSyncedCount: 195,
        lastSyncedAt: 'Live · 5m ago',
        externalUrl: 'https://www.instagram.com/',
      },
      {
        id: 'soc-tt',
        platform: 'tiktok',
        name: 'TikTok Business & Lead Gen',
        handle: '@albahrtravels',
        accountOrPageId: 'TT-ADV-710294881',
        webhookUrl: 'https://os.albahrtravels.com/api/v1/webhooks/social/tiktok',
        accessTokenMasked: 'TTAK••••••••39LP',
        connected: true,
        autoCaptureLeads: true,
        autoPublishPackages: true,
        leadsCapturedCount: 53,
        messagesSyncedCount: 89,
        lastSyncedAt: 'Live · 8m ago',
        externalUrl: 'https://www.tiktok.com/',
      },
      {
        id: 'soc-yt',
        platform: 'youtube',
        name: 'YouTube Channel & Shorts',
        handle: 'AL-BAHR Horizon Travels',
        accountOrPageId: 'UC-ALBAHR-992140',
        webhookUrl: 'https://os.albahrtravels.com/api/v1/webhooks/social/youtube',
        accessTokenMasked: 'AIza••••••••77RT',
        connected: true,
        autoCaptureLeads: true,
        autoPublishPackages: false,
        leadsCapturedCount: 29,
        messagesSyncedCount: 64,
        lastSyncedAt: 'Synced · 15m ago',
        externalUrl: 'https://www.youtube.com/',
      },
      {
        id: 'soc-li',
        platform: 'linkedin',
        name: 'LinkedIn Company Page',
        handle: 'al-bahr-horizon-travels',
        accountOrPageId: 'URN:LI:ORG:8831204',
        webhookUrl: 'https://os.albahrtravels.com/api/v1/webhooks/social/linkedin',
        accessTokenMasked: 'AQV9••••••••12MN',
        connected: true,
        autoCaptureLeads: true,
        autoPublishPackages: true,
        leadsCapturedCount: 41,
        messagesSyncedCount: 52,
        lastSyncedAt: 'Synced · 12m ago',
        externalUrl: 'https://www.linkedin.com/',
      },
      {
        id: 'soc-tg',
        platform: 'telegram',
        name: 'Telegram Broadcast Channel',
        handle: 't.me/albahrtravels',
        accountOrPageId: '@albahrtravels_bot',
        webhookUrl: 'https://os.albahrtravels.com/api/v1/webhooks/social/telegram',
        accessTokenMasked: '7012••••••••AAHk',
        connected: true,
        autoCaptureLeads: true,
        autoPublishPackages: true,
        leadsCapturedCount: 38,
        messagesSyncedCount: 140,
        lastSyncedAt: 'Live · 4m ago',
        externalUrl: 'https://t.me/',
      },
    ];

    this.socialPosts = [
      {
        id: 'sp-1',
        title: '14-Night Economy Umrah (LHE-JED) — Saudia Direct',
        caption:
          'Book your 14-Night Umrah package from Lahore with Voco Makkah (450m) & Saja Al Madinah. Instant WhatsApp consultation & verified e-ticketing.',
        platforms: ['whatsapp', 'facebook', 'instagram', 'tiktok', 'telegram'],
        imageUrl: './assets/images/destinations-grid.jpg',
        status: 'published',
        publishedAt: 'Today at 10:30',
        reachCount: 8420,
        clicksCount: 412,
        leadsGenerated: 19,
      },
      {
        id: 'sp-2',
        title: 'Istanbul & Türkiye 7-Night Guided Executive Package',
        caption:
          'Bosporus cruise, visa assistance, and boutique stay in Sultanahmet. DM us on Instagram or WhatsApp for custom family quotes.',
        platforms: ['instagram', 'facebook', 'whatsapp', 'linkedin'],
        imageUrl: './assets/images/travel-istanbul.jpg',
        status: 'published',
        publishedAt: 'Yesterday at 18:15',
        reachCount: 6190,
        clicksCount: 285,
        leadsGenerated: 14,
      },
    ];

    this.customers = [
      {
        id: 'cust-1',
        fullName: 'Tariq Mahmood',
        phone: '+92 300 4128901',
        email: 'tariq.mahmood@client.albahrtravels.com',
        ownerUserId: 'usr-cust-1',
        kycVerified: true,
        archived: false,
        internalNotes: [
          'INTERNAL STAFF NOTE: Original passport validity verified (> 8 months remaining).',
        ],
        customerSafeEvents: ['Umrah case opened', 'Quote QT-2026-1001 sent via WhatsApp & Portal'],
      },
      {
        id: 'cust-2',
        fullName: 'Al-Noor Travels Client (Kamran Sheikh)',
        phone: '+92 321 9841200',
        email: 'kamran.sheikh@partner.albahrtravels.com',
        partnerId: 'partner-1',
        kycVerified: true,
        archived: false,
        internalNotes: [],
        customerSafeEvents: ['B2B Schengen visa file opened'],
      },
    ];

    this.leads = [
      {
        id: 'ld-1',
        fullName: 'Tariq Mahmood',
        phone: '+92 300 4128901',
        serviceType: 'umrah',
        source: 'WhatsApp Business (+92 300 8442100)',
        socialPlatform: 'whatsapp',
        assignedEmployeeId: 'emp-1',
        status: 'converted',
        createdAt: Date.now() - 4 * 3600 * 1000,
      },
      {
        id: 'ld-2',
        fullName: 'Zainab Study Inquiry',
        phone: '+92 333 5512098',
        serviceType: 'study',
        source: 'Instagram Direct (@albahrtravels.official)',
        socialPlatform: 'instagram',
        partnerId: 'partner-1',
        status: 'triaged',
        createdAt: Date.now() - 2 * 3600 * 1000,
      },
      {
        id: 'ld-3',
        fullName: 'FaisalSiddiqui (Istanbul Family Tour)',
        phone: '+92 301 7743120',
        serviceType: 'visa',
        source: 'Facebook Lead Ads (@albahrtravels)',
        socialPlatform: 'facebook',
        assignedEmployeeId: 'emp-1',
        status: 'assigned',
        createdAt: Date.now() - 3600 * 1000,
      },
    ];

    this.cases = [
      {
        id: 'cs-1',
        caseNumber: 'CASE-2026-1001',
        customerId: 'cust-1',
        serviceType: 'umrah',
        title: 'UMRAH 14N — Tariq Mahmood',
        assignedEmployeeId: 'emp-1',
        status: 'processing',
        escalated: false,
        tasks: [
          { id: 't1', title: 'Confirm passport scan', completed: true },
          { id: 't2', title: 'Reconcile Meezan Bank deposit slip', completed: false },
        ],
      },
      {
        id: 'cs-2',
        caseNumber: 'CASE-2026-1002',
        customerId: 'cust-2',
        serviceType: 'visa',
        title: 'SCHENGEN VISA — Kamran Sheikh',
        assignedEmployeeId: 'emp-1',
        partnerId: 'partner-1',
        status: 'assigned',
        escalated: false,
        tasks: [],
      },
    ];

    this.umrahPackages = [
      {
        id: 'pkg-1',
        pkgNo: 'UMR-2026-01',
        title: '14-Night Economy Umrah (LHE-JED)',
        departureCity: 'Lahore',
        airline: 'Saudia',
        makkahHotel: 'Voco Makkah',
        makkahDistanceM: 450,
        madinahHotel: 'Saja Al Madinah',
        madinahDistanceM: 250,
        totalNights: 14,
        priceQuadPkr: 245000,
        status: 'published',
      },
      {
        id: 'pkg-2',
        pkgNo: 'UMR-2026-02',
        title: '10-Night Executive Umrah (ISB-MED)',
        departureCity: 'Islamabad',
        airline: 'PIA',
        makkahHotel: 'Swissotel Makkah',
        makkahDistanceM: 120,
        madinahHotel: 'Anwar Al Madinah',
        madinahDistanceM: 100,
        totalNights: 10,
        priceQuadPkr: 310000,
        status: 'published',
      },
    ];

    this.quotes = [
      {
        id: 'qt-1',
        quoteNumber: 'QT-2026-1001',
        customerId: 'cust-1',
        title: '14N Umrah Custom (2 Pax)',
        supplierCostPkr: 460000,
        sellingPricePkr: 490000,
        versionNo: 1,
        status: 'sent',
        validUntil: Date.now() + 3 * 24 * 3600 * 1000,
      },
    ];

    this.invoices = [
      {
        id: 'inv-1',
        invoiceNumber: 'INV-2026-1001',
        quoteId: 'qt-1',
        customerId: 'cust-1',
        totalPkr: 490000,
        verifiedPaidPkr: 0,
        status: 'issued',
      },
    ];

    this.payments = [
      {
        id: 'pay-1',
        invoiceId: 'inv-1',
        customerId: 'cust-1',
        amountPkr: 250000,
        bankName: 'Meezan Bank',
        bankRef: 'MEZ-9948120',
        status: 'pending_review',
      },
    ];

    this.bookings = [
      {
        id: 'bk-1',
        bookingNumber: 'BK-2026-1001',
        customerId: 'cust-1',
        invoiceId: 'inv-1',
        title: '14N Umrah Booking — Tariq Mahmood',
        status: 'supplier_pending',
      },
    ];

    this.documents = [
      {
        id: 'doc-1',
        customerId: 'cust-1',
        category: 'Passport Scan',
        fileName: 'tariq_passport.pdf',
        reviewStatus: 'approved',
        versionNo: 1,
      },
    ];

    this.rules = [
      {
        id: 'rl-1',
        name: 'Smart Least-Load Consultant Assignment',
        triggerEvent: 'lead.created (Web & Social Media Webhooks)',
        conditionSummary: 'IF consent == true AND service_type IN [umrah, flight, visa, study]',
        actionSummary:
          'THEN assign least-loaded active consultant (tie: round-robin; fallback: manager triage)',
        versionNo: 3,
        enabled: true,
      },
      {
        id: 'rl-2',
        name: 'Finance Bank Slip Verification Gate',
        triggerEvent: 'payment.evidence_received',
        conditionSummary: 'IF bank_slip uploaded',
        actionSummary:
          'THEN set status=pending_review & notify Finance reviewer before unlocking E-Ticket',
        versionNo: 2,
        enabled: true,
      },
    ];

    this.suppliers = [
      { id: 'sup-1', name: 'Saudia / Sabre Ticketing Desk', category: 'Airline', status: 'active' },
      { id: 'sup-2', name: 'Al-Haramain Ground Handling', category: 'Umrah Ground', status: 'active' },
    ];
    this.partners = [
      {
        id: 'partner-1',
        name: 'Al-Noor Travels (Lahore B2B)',
        rate: '5.00% commission on verified paid bookings',
        status: 'verified',
      },
    ];
    this.visas = [
      {
        id: 'vs-1',
        country: 'Italy & Schengen (Study/Visit)',
        status: 'Checklist Preparing',
        note: 'Embassy appointment & document verification active',
      },
      {
        id: 'vs-2',
        country: 'Türkiye Sticker & E-Visa',
        status: 'Active Processing',
        note: 'Hotel voucher & travel insurance attached',
      },
    ];
    this.appointments = [
      {
        id: 'apt-1',
        provider: 'GAMCA / VFS Global Lahore',
        status: 'confirmed',
        note: 'Appointment slip synced to customer WhatsApp',
      },
    ];
    this.hotels = [
      {
        id: 'ht-1',
        city: 'Makkah / Madinah',
        status: 'Contracted Rate Active',
        transfer: 'GMC Private / Haramain Train',
      },
    ];
    this.studyCases = [
      { id: 'st-1', country: 'Germany / Italy / UK', intake: 'Fall 2027', status: 'Offer Letter Stage' },
    ];
    this.cmsDrafts = [
      { id: 'cms-1', title: 'Homepage Umrah Slot (UMR-2026-01)', status: 'published', version: 'v4' },
      { id: 'cms-2', title: 'Turkey & Europe Work Visa Demand Flyer', status: 'published', version: 'v3' },
    ];
    this.campaigns = [
      {
        id: 'cmp-1',
        title: 'Winter Umrah & Istanbul Multi-Platform Campaign',
        status: 'active',
        consent: 'Synced with WhatsApp, Facebook, Instagram & TikTok',
      },
    ];
    this.subscribers = [
      { email: 'pilgrim.updates@client.albahrtravels.com', status: 'subscribed', consent: 'Verified Opt-In' },
    ];
    this.supportTickets = [
      { id: 'SUP-1001', subject: 'Invoice INV-2026-1001 bank slip confirmation', status: 'assigned' },
    ];
    this.chatMessages = [
      {
        sender: 'Tariq Mahmood via WhatsApp Business',
        channel: 'WHATSAPP',
        body: 'Assalam-o-Alaikum, I have uploaded my Meezan Bank deposit slip for INV-2026-1001.',
      },
      {
        sender: 'Faisal Siddiqui via Instagram Direct',
        channel: 'INSTAGRAM',
        body: 'Hi! Can you share the 7-Night Istanbul family package details for 4 adults?',
      },
      {
        sender: 'AL-BAHR Support Desk',
        channel: 'PORTAL',
        body: 'Wa-Alaikum-Assalam Tariq sahab, our Finance team is verifying your slip right now.',
      },
    ];
    this.notifications = [
      {
        id: 'nt-1',
        title: 'Pending Payment Slip Review',
        body: 'PAY-1 (PKR 250,000 · Meezan Bank) awaits Finance verification.',
      },
      {
        id: 'nt-2',
        title: '3 New Social Media Leads Captured',
        body: 'WhatsApp, Instagram DM, and Facebook Lead Ads synced to Inbox & Leads.',
      },
    ];
    this.reviews = [
      { customer: 'Tariq Mahmood', booking: 'BK-2026-0988', rating: '5/5', status: 'published' },
    ];
    this.backups = [
      {
        id: 'bkp-1',
        date: '2026-11-23 02:00 PKT',
        status: 'Encrypted & Checksum Verified',
        restore: 'Verified Cloud Snapshot',
      },
    ];
    this.ledger = [
      {
        id: 'led-0',
        account: 'receivable (DR)',
        amount: 'PKR 490,000',
        ref: 'INV-2026-1001',
      },
    ];
    this.logAudit(
      'system.workspace_ready',
      'os',
      'horizon_one',
      'AL-BAHR HORIZON Cloud & Social Media Connectors initialized',
    );
  }
}
