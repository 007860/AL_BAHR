import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'live_http_stub.dart' if (dart.library.io) 'live_http_io.dart' as live_http;
import 'models.dart';

class ActionResult {
  final bool ok;
  final String message;
  final String? requestId;
  const ActionResult({required this.ok, required this.message, this.requestId});
}

class HorizonOsStore extends ChangeNotifier {
  // Bootstrap & Auth
  bool splashComplete = false;
  double bootstrapProgress = 0.0;
  String bootstrapStage = 'Initializing local store...';
  bool bootstrapFailed = false;

  bool authenticated = false;
  bool mfaVerified = false;
  OsRole currentRole = OsRole.ceo;
  String currentUserId = 'usr-ceo';
  String currentUserName = 'CEO (Sandbox)';
  String? currentPartnerId;
  String locale = 'en';

  // Connection & UI State
  bool isOffline = false;
  bool simulateSkeletonLoading = false;
  String? lastErrorMessage;
  String? lastErrorRequestId;
  String searchQuery = '';
  AppNavModule activeModule = AppNavModule.dashboard;

  // Live Server Config (optional; defaults to On-Device Sandbox)
  String serverBaseUrl = 'https://os.albahrtravels.com';
  bool useLiveServer = false;
  String? authToken;

  // Verified Company Settings (Sec. 18, 29, 76)
  bool whatsappVerified = false;
  bool legalSuffixVerified = false;
  bool logoAssetVerified = false;
  int defaultFlightMarkupPkr = 2000;
  bool automationEmergencyPaused = false;

  // Multi-step Umrah Draft Autosave State
  int umrahDraftStep = 1;
  String umrahDraftCity = 'Lahore';
  int umrahDraftNights = 14;
  int umrahDraftPax = 2;
  String umrahDraftMakkahDist = 'Within 400m Haram';
  String umrahDraftMadinahDist = 'Within 200m Markazia';
  String umrahDraftRoom = 'Quad';
  String umrahDraftTransport = 'Shared Bus';
  bool umrahDraftZiyarat = true;
  String draftSyncStatus = 'Saved at startup';

  // Synthetic Non-Production Data Collections
  final List<StaffRecord> staff = [];
  final List<LeadRecord> leads = [];
  final List<CustomerRecord> customers = [];
  final List<CaseRecord> cases = [];
  final List<UmrahPackageRecord> umrahPackages = [];
  final List<QuoteRecord> quotes = [];
  final List<InvoiceRecord> invoices = [];
  final List<PaymentRecord> payments = [];
  final List<BookingRecord> bookings = [];
  final List<DocumentRecord> documents = [];
  final List<RuleRecord> rules = [];
  final List<AuditEntry> auditLog = [];
  final List<Map<String, String>> supportTickets = [];
  final List<Map<String, String>> cmsDrafts = [];
  final List<Map<String, String>> campaigns = [];
  final List<Map<String, String>> subscribers = [];
  final List<Map<String, String>> suppliers = [];
  final List<Map<String, String>> partners = [];
  final List<Map<String, String>> visas = [];
  final List<Map<String, String>> appointments = [];
  final List<Map<String, String>> hotels = [];
  final List<Map<String, String>> studyCases = [];
  final List<Map<String, String>> chatMessages = [];
  final List<Map<String, String>> notifications = [];
  final List<Map<String, String>> reviews = [];
  final List<Map<String, String>> backups = [];
  final List<Map<String, String>> ledger = [];
  final List<Map<String, String>> pendingInvites = [];
  final Set<String> _idempotencyKeys = {};

  HorizonOsStore() {
    _seedSyntheticSandbox();
  }

  void refresh() => notifyListeners();

  Future<void> runBootstrap({bool forceError = false}) async {
    bootstrapFailed = false;
    bootstrapProgress = 0.25;
    bootstrapStage = 'Loading brand tokens & company rules...';
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 220));
    if (forceError) {
      bootstrapFailed = true;
      bootstrapStage = 'Configuration check timed out.';
      notifyListeners();
      return;
    }
    bootstrapProgress = 0.65;
    bootstrapStage = 'Restoring encrypted offline drafts...';
    notifyListeners();
    await Future<void>.delayed(const Duration(milliseconds: 220));
    bootstrapProgress = 1.0;
    bootstrapStage = 'Workspace ready (Zero-AI deterministic runtime)';
    notifyListeners();
  }

  void skipSplash() {
    splashComplete = true;
    notifyListeners();
  }

  Future<ActionResult> signIn({
    required String email,
    required String password,
    OsRole sandboxRole = OsRole.ceo,
  }) async {
    if (email.trim().isEmpty || password.isEmpty) {
      return const ActionResult(ok: false, message: 'Email and password are required.');
    }

    if (useLiveServer) {
      try {
        final targetUrl = '${serverBaseUrl.replaceAll(RegExp(r'/+$'), '')}/api/v1/auth/login';
        final resp = await live_http.postJson(targetUrl, {'email': email.trim(), 'password': password});
        if (resp.statusCode == 200) {
          final parsed = jsonDecode(resp.body) as Map<String, dynamic>;
          authToken = parsed['token'] as String?;
          final userMap = parsed['user'] as Map<String, dynamic>;
          currentUserId = userMap['id'] as String;
          currentUserName = userMap['fullName'] as String;
          currentRole = OsRole.values.firstWhere(
            (r) => r.code == userMap['role'],
            orElse: () => OsRole.employee,
          );
          currentPartnerId = userMap['partnerId'] as String?;
          authenticated = true;
          splashComplete = true;
          activeModule = AppNavModule.dashboard;
          notifyListeners();
          return const ActionResult(ok: true, message: 'Signed in to live OS server.');
        }
        return ActionResult(ok: false, message: 'Authentication failed (HTTP ${resp.statusCode}).');
      } catch (e) {
        return ActionResult(ok: false, message: 'Server connection error: $e');
      }
    }

    // Local Sandbox Mode
    currentRole = sandboxRole;
    switch (sandboxRole) {
      case OsRole.ceo:
        currentUserId = 'usr-ceo';
        currentUserName = 'CEO (Sandbox)';
        currentPartnerId = null;
        break;
      case OsRole.manager:
        currentUserId = 'usr-mgr';
        currentUserName = 'Operations Manager (Sandbox)';
        currentPartnerId = null;
        break;
      case OsRole.employee:
        currentUserId = 'emp-1';
        currentUserName = 'Amina Consultant (Sandbox)';
        currentPartnerId = null;
        break;
      case OsRole.finance:
        currentUserId = 'usr-fin';
        currentUserName = 'Finance Reviewer (Sandbox)';
        currentPartnerId = null;
        break;
      case OsRole.support:
        currentUserId = 'usr-sup';
        currentUserName = 'Support Agent (Sandbox)';
        currentPartnerId = null;
        break;
      case OsRole.customer:
        currentUserId = 'usr-cust-1';
        currentUserName = 'Tariq Mahmood (Customer)';
        currentPartnerId = null;
        break;
      case OsRole.partner:
        currentUserId = 'usr-part-1';
        currentUserName = 'Lahore Horizon Sub-Agent';
        currentPartnerId = 'partner-1';
        break;
    }
    authenticated = true;
    mfaVerified = sandboxRole != OsRole.ceo && sandboxRole != OsRole.finance;
    splashComplete = true;
    activeModule = AppNavModule.dashboard;
    _logAudit('auth.login', 'session', currentUserId, 'Signed into Evaluation Sandbox as ${currentRole.displayTitle}');
    notifyListeners();
    return const ActionResult(ok: true, message: 'Signed in (Local Evaluation Sandbox).');
  }

  void switchSandboxRole(OsRole role) {
    if (useLiveServer) return;
    signIn(email: '${role.name}@sandbox.local', password: 'sandbox-role-switch', sandboxRole: role);
  }

  void verifyMfa(String code) {
    if (code.trim().length == 6 && int.tryParse(code.trim()) != null) {
      mfaVerified = true;
      _logAudit('auth.mfa_verified', 'session', currentUserId, 'Session upgraded to aal2');
      notifyListeners();
    }
  }

  void signOut() {
    authenticated = false;
    mfaVerified = false;
    authToken = null;
    _logAudit('auth.logout', 'session', currentUserId, 'Session terminated');
    notifyListeners();
  }

  void setLocale(String nextLocale) {
    if (nextLocale == 'en' || nextLocale == 'ur') {
      locale = nextLocale;
      notifyListeners();
    }
  }

  void setModule(AppNavModule mod) {
    if (!currentRole.permittedModules.contains(mod)) {
      lastErrorMessage = 'Access denied (403): ${currentRole.displayTitle} cannot access ${mod.title}';
      lastErrorRequestId = 'req_rbac_${DateTime.now().millisecondsSinceEpoch}';
      notifyListeners();
      return;
    }
    activeModule = mod;
    lastErrorMessage = null;
    notifyListeners();
  }

  void toggleOffline(bool offline) {
    isOffline = offline;
    draftSyncStatus = offline ? 'Offline / Sync Pending' : 'Synced at ${_hhmm()}';
    notifyListeners();
  }

  void updateUmrahDraft({
    int? step,
    String? city,
    int? nights,
    int? pax,
    String? makkahDist,
    String? madinahDist,
    String? room,
    String? transport,
    bool? ziyarat,
  }) {
    if (step != null) umrahDraftStep = step.clamp(1, 4);
    if (city != null) umrahDraftCity = city;
    if (nights != null) umrahDraftNights = nights;
    if (pax != null) umrahDraftPax = pax;
    if (makkahDist != null) umrahDraftMakkahDist = makkahDist;
    if (madinahDist != null) umrahDraftMadinahDist = madinahDist;
    if (room != null) umrahDraftRoom = room;
    if (transport != null) umrahDraftTransport = transport;
    if (ziyarat != null) umrahDraftZiyarat = ziyarat;
    draftSyncStatus = isOffline ? 'Offline / Sync Pending' : 'Saved at ${_hhmm()}';
    notifyListeners();
  }

  // Deterministic Smart Assignment (Blueprint Sec. 20)
  ActionResult createAndAssignLead({
    required String fullName,
    required String phone,
    required String serviceType,
    required String source,
    required bool consentGiven,
    String? idempotencyKey,
  }) {
    if (fullName.trim().isEmpty || phone.trim().isEmpty) {
      return const ActionResult(ok: false, message: 'Name and phone are required.');
    }
    if (!consentGiven) {
      return const ActionResult(ok: false, message: 'Explicit consent is required.');
    }
    if (idempotencyKey != null && _idempotencyKeys.contains(idempotencyKey)) {
      return const ActionResult(ok: true, message: 'Duplicate submit prevented (Idempotency-Key reused).');
    }
    if (idempotencyKey != null) _idempotencyKeys.add(idempotencyKey);

    String? assignedId;
    String status = 'triaged';
    String reason = 'EMERGENCY_PAUSE_ACTIVE';

    if (!automationEmergencyPaused) {
      final eligible = staff
          .where((s) =>
              s.active &&
              s.autoAssignEnabled &&
              s.leaveStatus == 'available' &&
              s.activeLoad < s.maxActive &&
              (s.skills.contains(serviceType) || s.skills.contains('general')))
          .toList()
        ..sort((a, b) {
          final ratioA = a.activeLoad / a.maxActive;
          final ratioB = b.activeLoad / b.maxActive;
          final c1 = ratioA.compareTo(ratioB);
          if (c1 != 0) return c1;
          final c2 = a.activeLoad.compareTo(b.activeLoad);
          if (c2 != 0) return c2;
          final timeA = a.lastAssignedAt?.millisecondsSinceEpoch ?? 0;
          final timeB = b.lastAssignedAt?.millisecondsSinceEpoch ?? 0;
          final c3 = timeA.compareTo(timeB);
          if (c3 != 0) return c3;
          return a.id.compareTo(b.id);
        });

      if (eligible.isNotEmpty) {
        final chosen = eligible.first;
        chosen.activeLoad += 1;
        chosen.lastAssignedAt = DateTime.now();
        assignedId = chosen.id;
        status = 'assigned';
        reason = 'Assigned to ${chosen.name} (lowest workload ${chosen.activeLoad - 1}/${chosen.maxActive})';
      } else {
        reason = 'No eligible staff available -> Manager Triage Queue';
      }
    }

    final lead = LeadRecord(
      id: 'ld-${leads.length + 101}',
      fullName: fullName.trim(),
      phone: phone.trim(),
      serviceType: serviceType,
      source: source,
      assignedEmployeeId: assignedId,
      partnerId: currentRole == OsRole.partner ? currentPartnerId : null,
      status: status,
      createdAt: DateTime.now(),
    );
    leads.insert(0, lead);
    _logAudit('lead.created', 'lead', lead.id, reason);
    notifyListeners();
    return ActionResult(ok: true, message: reason);
  }

  ActionResult convertLeadToCase(String leadId) {
    final idx = leads.indexWhere((l) => l.id == leadId);
    if (idx < 0) return const ActionResult(ok: false, message: 'Lead not found.');
    final lead = leads[idx];
    if (lead.status == 'converted') {
      return const ActionResult(ok: true, message: 'Lead already converted to case.');
    }
    var cust = customers.where((c) => c.phone == lead.phone && !c.archived).firstOrNull;
    if (cust == null) {
      cust = CustomerRecord(
        id: 'cust-${customers.length + 101}',
        fullName: lead.fullName,
        phone: lead.phone,
        email: '${lead.fullName.toLowerCase().replaceAll(' ', '.')}@client.local',
        partnerId: lead.partnerId,
      );
      customers.insert(0, cust);
    }
    final c = CaseRecord(
      id: 'cs-${cases.length + 101}',
      caseNumber: 'CASE-2026-${1010 + cases.length}',
      customerId: cust.id,
      serviceType: lead.serviceType,
      title: '${lead.serviceType.toUpperCase()} — ${lead.fullName}',
      assignedEmployeeId: lead.assignedEmployeeId,
      partnerId: lead.partnerId,
      status: 'assigned',
      tasks: [
        TaskItem(id: 'tk-${DateTime.now().millisecondsSinceEpoch}-1', title: 'Collect & verify documents'),
        TaskItem(id: 'tk-${DateTime.now().millisecondsSinceEpoch}-2', title: 'Prepare supplier-verified quote'),
      ],
    );
    cases.insert(0, c);
    lead.status = 'converted';
    _logAudit('lead.converted', 'case', c.caseNumber, 'Converted lead ${lead.id} reusing customer ${cust.id}');
    notifyListeners();
    return ActionResult(ok: true, message: 'Converted to ${c.caseNumber} using single customer profile.');
  }

  ActionResult uploadBankSlip({
    required String invoiceId,
    required int amountPkr,
    required String bankName,
    required String bankRef,
  }) {
    if (amountPkr <= 0 || bankRef.trim().isEmpty) {
      return const ActionResult(ok: false, message: 'Positive amount and bank reference required.');
    }
    final inv = invoices.where((i) => i.id == invoiceId).firstOrNull;
    if (inv == null) return const ActionResult(ok: false, message: 'Invoice not found.');

    final pay = PaymentRecord(
      id: 'pay-${payments.length + 201}',
      invoiceId: invoiceId,
      customerId: inv.customerId,
      amountPkr: amountPkr,
      bankName: bankName,
      bankRef: bankRef.trim(),
      status: 'pending_review', // NEVER marks paid automatically!
    );
    payments.insert(0, pay);
    _logAudit('payment.slip_uploaded', 'payment', pay.id, 'Bank slip uploaded ($bankRef) -> pending_review (Invoice unchanged)');
    notifyListeners();
    return const ActionResult(ok: true, message: 'Bank slip uploaded as Pending Review. Finance verification is still required.');
  }

  ActionResult verifyOrRejectPayment({
    required String paymentId,
    required bool approve,
    required String reason,
  }) {
    if (isOffline) {
      return const ActionResult(ok: false, message: 'Offline mode: payment verification is strictly disabled offline.');
    }
    if (currentRole != OsRole.ceo && currentRole != OsRole.finance) {
      return ActionResult(
        ok: false,
        message: '403 Forbidden: ${currentRole.displayTitle} cannot verify payments (Finance/CEO only).',
      );
    }
    final pay = payments.where((p) => p.id == paymentId).firstOrNull;
    if (pay == null) return const ActionResult(ok: false, message: 'Payment not found.');
    if (pay.status != 'pending_review') {
      return ActionResult(ok: false, message: 'Payment already ${pay.status}.');
    }
    if (!approve && reason.trim().isEmpty) {
      return const ActionResult(ok: false, message: 'Rejection reason is mandatory.');
    }

    if (!approve) {
      pay.status = 'rejected';
      pay.reviewReason = reason.trim();
      _logAudit('payment.rejected', 'payment', pay.id, 'Rejected: ${pay.reviewReason}');
      notifyListeners();
      return const ActionResult(ok: true, message: 'Payment rejected. Invoice remains unpaid & tickets blocked.');
    }

    final inv = invoices.where((i) => i.id == pay.invoiceId).firstOrNull;
    if (inv != null) {
      inv.verifiedPaidPkr += pay.amountPkr;
      inv.status = inv.verifiedPaidPkr >= inv.totalPkr ? 'paid' : 'partially_paid';
    }
    pay.status = 'verified';
    pay.reviewReason = reason.trim().isEmpty ? 'Reconciled against bank statement' : reason.trim();
    ledger.insert(0, {
      'id': 'led-${ledger.length + 1}',
      'account': 'bank_cleared (DR) / receivable (CR)',
      'amount': 'PKR ${pay.amountPkr}',
      'ref': '${pay.id} (${pay.bankRef})',
    });
    _logAudit('payment.verified', 'payment', pay.id, 'Finance verified PKR ${pay.amountPkr}; ledger appended');
    notifyListeners();
    return const ActionResult(ok: true, message: 'Payment verified and append-only ledger entry posted.');
  }

  ActionResult issueTicketOrVoucher({
    required String bookingId,
    required String supplierRef,
    required String documentName,
  }) {
    if (isOffline) {
      return const ActionResult(ok: false, message: 'Offline mode: ticket/voucher confirmation disabled offline.');
    }
    if (currentRole == OsRole.customer || currentRole == OsRole.partner || currentRole == OsRole.support) {
      return const ActionResult(ok: false, message: '403 Forbidden: Only authorized Operations staff can issue tickets.');
    }
    if (supplierRef.trim().isEmpty || documentName.trim().isEmpty) {
      return const ActionResult(ok: false, message: 'Real supplier PNR/reference and uploaded voucher/e-ticket PDF are required.');
    }
    final bk = bookings.where((b) => b.id == bookingId).firstOrNull;
    if (bk == null) return const ActionResult(ok: false, message: 'Booking not found.');

    if (bk.invoiceId == null) {
      return const ActionResult(ok: false, message: 'Blocked: No linked invoice found for booking.');
    }
    final hasVerifiedPay = payments.any((p) => p.invoiceId == bk.invoiceId && p.status == 'verified');
    if (!hasVerifiedPay) {
      return const ActionResult(ok: false, message: 'Blocked: Payment must be verified by Finance before issuing ticket/voucher.');
    }

    bk.supplierRef = supplierRef.trim();
    bk.ticketOrVoucherFile = documentName.trim();
    bk.status = 'documents_issued';
    _logAudit('booking.documents_issued', 'booking', bk.bookingNumber, 'Confirmed with ref $supplierRef & file $documentName');
    notifyListeners();
    return const ActionResult(ok: true, message: 'Verified ticket/voucher issued to Customer My Trips.');
  }

  ActionResult createFlightQuoteWithMarkup({
    required String customerId,
    required String route,
    required int pax,
    required int netFarePerPax,
    int? overrideMarkupPerPax,
  }) {
    if (pax <= 0 || netFarePerPax <= 0) {
      return const ActionResult(ok: false, message: 'Passengers and supplier net fare must be positive.');
    }
    var markup = defaultFlightMarkupPkr;
    if (overrideMarkupPerPax != null && overrideMarkupPerPax != markup) {
      if (currentRole != OsRole.ceo) {
        return const ActionResult(ok: false, message: '403 Forbidden: Only CEO can override default PKR 2,000/pax flight markup.');
      }
      markup = overrideMarkupPerPax;
    }
    final totalCost = pax * netFarePerPax;
    final totalSell = pax * (netFarePerPax + markup);
    final q = QuoteRecord(
      id: 'qt-${quotes.length + 101}',
      quoteNumber: 'QT-2026-${1010 + quotes.length}',
      customerId: customerId,
      title: 'Flight $route ($pax Pax)',
      supplierCostPkr: totalCost,
      sellingPricePkr: totalSell,
      status: 'sent',
      validUntil: DateTime.now().add(const Duration(days: 2)),
    );
    quotes.insert(0, q);
    _logAudit('flight.quote_created', 'quote', q.quoteNumber, 'Markup PKR $markup/pax -> Selling PKR $totalSell');
    notifyListeners();
    return ActionResult(ok: true, message: '${q.quoteNumber} created (Selling PKR $totalSell).');
  }

  ActionResult acceptQuote(String quoteId, {String? idempotencyKey}) {
    final q = quotes.where((x) => x.id == quoteId).firstOrNull;
    if (q == null) return const ActionResult(ok: false, message: 'Quote not found.');
    if (q.validUntil.isBefore(DateTime.now())) {
      q.status = 'expired';
      notifyListeners();
      return const ActionResult(ok: false, message: 'Quote expired — revise quote validity first.');
    }
    if (q.status == 'accepted' || (idempotencyKey != null && _idempotencyKeys.contains(idempotencyKey))) {
      return const ActionResult(ok: true, message: 'Quote already accepted — duplicate invoice prevented.');
    }
    if (idempotencyKey != null) _idempotencyKeys.add(idempotencyKey);

    q.status = 'accepted';
    final inv = InvoiceRecord(
      id: 'inv-${invoices.length + 101}',
      invoiceNumber: 'INV-2026-${1010 + invoices.length}',
      quoteId: q.id,
      customerId: q.customerId,
      partnerId: q.partnerId,
      totalPkr: q.sellingPricePkr,
      status: 'issued',
    );
    invoices.insert(0, inv);
    _logAudit('quote.accepted', 'invoice', inv.invoiceNumber, 'Generated single invoice for ${q.quoteNumber}');
    notifyListeners();
    return ActionResult(ok: true, message: 'Quote accepted. ${inv.invoiceNumber} generated.');
  }

  ActionResult togglePackageStatus(String pkgId, String newStatus) {
    if (isOffline) {
      return const ActionResult(ok: false, message: 'Offline mode: website publishing disabled offline.');
    }
    if (currentRole != OsRole.ceo && currentRole != OsRole.manager) {
      return const ActionResult(ok: false, message: '403 Forbidden: Only CEO or delegated publisher can publish/expire packages.');
    }
    final pkg = umrahPackages.where((p) => p.id == pkgId).firstOrNull;
    if (pkg == null) return const ActionResult(ok: false, message: 'Package not found.');
    pkg.status = newStatus;
    _logAudit('umrah.package_$newStatus', 'umrah_package', pkg.pkgNo, 'Status changed to $newStatus (historical bookings preserved)');
    notifyListeners();
    return ActionResult(ok: true, message: 'Package ${pkg.pkgNo} is now $newStatus.');
  }

  ActionResult inviteStaff({required String name, required String email, required OsRole role}) {
    if (currentRole != OsRole.ceo && currentRole != OsRole.manager) {
      return const ActionResult(ok: false, message: '403 Forbidden: Only CEO/Manager can invite staff.');
    }
    if (role == OsRole.ceo && currentRole != OsRole.ceo) {
      return const ActionResult(ok: false, message: '403 Forbidden: Only CEO can invite CEO accounts.');
    }
    final token = 'ALBAHR-INV-${DateTime.now().millisecondsSinceEpoch.toRadixString(36).toUpperCase()}';
    pendingInvites.insert(0, {'name': name, 'email': email, 'role': role.code, 'token': token, 'status': 'active_48h'});
    _logAudit('staff.invited', 'invitation', email, 'One-time hashed invite issued for ${role.displayTitle}');
    notifyListeners();
    return ActionResult(ok: true, message: 'One-time invite created: $token');
  }

  ActionResult redeemInviteToken(String token, String newPassword) {
    if (newPassword.length < 10) {
      return const ActionResult(ok: false, message: 'Password must be at least 10 characters.');
    }
    final idx = pendingInvites.indexWhere((i) => i['token'] == token.trim() && i['status'] == 'active_48h');
    if (idx < 0) {
      return const ActionResult(ok: false, message: 'Invitation token is invalid, expired, or already redeemed.');
    }
    final inv = pendingInvites[idx];
    inv['status'] = 'redeemed';
    final role = OsRole.values.firstWhere((r) => r.code == inv['role'], orElse: () => OsRole.employee);
    staff.add(StaffRecord(
      id: 'emp-${staff.length + 1}',
      name: inv['name']!,
      email: inv['email']!,
      role: role,
      skills: ['umrah', 'visa', 'general'],
    ));
    _logAudit('staff.activated', 'employee', inv['email']!, 'Activated via single-use token');
    notifyListeners();
    return ActionResult(ok: true, message: 'Employee ${inv['name']} activated. You can now sign in.');
  }

  ActionResult toggleEmergencyPause() {
    if (currentRole != OsRole.ceo) {
      return const ActionResult(ok: false, message: '403 Forbidden: Emergency Pause requires CEO authorization.');
    }
    automationEmergencyPaused = !automationEmergencyPaused;
    _logAudit(
      'rules.emergency_pause',
      'automation',
      'all',
      automationEmergencyPaused ? 'CEO paused automation (manual triage active)' : 'CEO resumed deterministic automation',
    );
    notifyListeners();
    return ActionResult(
      ok: true,
      message: automationEmergencyPaused ? 'Automation paused. New leads route to Manager Triage.' : 'Deterministic rules resumed.',
    );
  }

  // Scoped Views enforcing strict Role/Tenant Isolation (Blueprint Sec. 25 & 68)
  List<LeadRecord> get scopedLeads => leads.where((l) {
        if (currentRole == OsRole.employee) return l.assignedEmployeeId == currentUserId;
        if (currentRole == OsRole.partner) return l.partnerId == currentPartnerId;
        if (currentRole == OsRole.customer) return false;
        return true;
      }).toList();

  List<CaseRecord> get scopedCases => cases.where((c) {
        if (currentRole == OsRole.employee) return c.assignedEmployeeId == currentUserId;
        if (currentRole == OsRole.partner) return c.partnerId == currentPartnerId;
        if (currentRole == OsRole.customer) {
          final ownCust = customers.where((cu) => cu.ownerUserId == currentUserId).map((e) => e.id).toSet();
          return ownCust.contains(c.customerId);
        }
        return true;
      }).toList();

  List<InvoiceRecord> get scopedInvoices => invoices.where((inv) {
        if (currentRole == OsRole.customer) {
          final ownCust = customers.where((cu) => cu.ownerUserId == currentUserId).map((e) => e.id).toSet();
          return ownCust.contains(inv.customerId);
        }
        if (currentRole == OsRole.partner) return inv.partnerId == currentPartnerId;
        return true;
      }).toList();

  List<BookingRecord> get scopedBookings => bookings.where((b) {
        if (currentRole == OsRole.customer) {
          final ownCust = customers.where((cu) => cu.ownerUserId == currentUserId).map((e) => e.id).toSet();
          return ownCust.contains(b.customerId);
        }
        if (currentRole == OsRole.partner) return b.partnerId == currentPartnerId;
        return true;
      }).toList();

  void _logAudit(String action, String resource, String resourceId, String summary) {
    auditLog.insert(
      0,
      AuditEntry(
        id: 'aud-${auditLog.length + 1}',
        actorRole: currentRole.code,
        action: action,
        resource: '$resource:$resourceId',
        summary: summary,
        at: DateTime.now(),
      ),
    );
  }

  String _hhmm() {
    final now = DateTime.now();
    return '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
  }

  void _seedSyntheticSandbox() {
    staff.addAll([
      StaffRecord(id: 'emp-1', name: 'Amina Consultant', email: 'amina@sandbox.local', role: OsRole.employee, skills: ['umrah', 'visa', 'general'], activeLoad: 2, maxActive: 10),
      StaffRecord(id: 'emp-2', name: 'Bilal Operations', email: 'bilal@sandbox.local', role: OsRole.employee, skills: ['flight', 'hotel', 'umrah'], activeLoad: 1, maxActive: 10),
      StaffRecord(id: 'emp-3', name: 'Usman Study/Visa', email: 'usman@sandbox.local', role: OsRole.employee, skills: ['study', 'visa', 'appointment'], activeLoad: 0, maxActive: 8, leaveStatus: 'on_leave'),
    ]);

    customers.addAll([
      CustomerRecord(
        id: 'cust-1',
        fullName: 'Tariq Mahmood',
        phone: '+92 300 0000101',
        email: 'tariq.demo@example.invalid',
        ownerUserId: 'usr-cust-1',
        kycVerified: true,
        internalNotes: ['INTERNAL STAFF NOTE: Verify original passport validity > 6 months before submission.'],
        customerSafeEvents: ['Umrah case opened', 'Quote QT-2026-1001 sent'],
      ),
      CustomerRecord(
        id: 'cust-2',
        fullName: 'Al-Noor Sub-Agent Client',
        phone: '+92 300 0000202',
        email: 'client.b2b@example.invalid',
        partnerId: 'partner-1',
        kycVerified: true,
      ),
    ]);

    leads.addAll([
      LeadRecord(id: 'ld-1', fullName: 'Tariq Mahmood', phone: '+92 300 0000101', serviceType: 'umrah', source: 'www.albahrtravels.com', assignedEmployeeId: 'emp-1', status: 'converted', createdAt: DateTime.now().subtract(const Duration(hours: 4))),
      LeadRecord(id: 'ld-2', fullName: 'Zainab Study Inquiry', phone: '+92 300 0000303', serviceType: 'study', source: 'Partner Referral', partnerId: 'partner-1', status: 'triaged', createdAt: DateTime.now().subtract(const Duration(hours: 1))),
    ]);

    cases.addAll([
      CaseRecord(
        id: 'cs-1',
        caseNumber: 'CASE-2026-1001',
        customerId: 'cust-1',
        serviceType: 'umrah',
        title: 'UMRAH 14N — Tariq Mahmood',
        assignedEmployeeId: 'emp-1',
        status: 'processing',
        tasks: [
          TaskItem(id: 't1', title: 'Confirm passport scan', completed: true),
          TaskItem(id: 't2', title: 'Reconcile bank deposit slip', completed: false),
        ],
      ),
      CaseRecord(
        id: 'cs-2',
        caseNumber: 'CASE-2026-1002',
        customerId: 'cust-2',
        serviceType: 'visa',
        title: 'SCHENGEN VISA — Partner Client',
        assignedEmployeeId: 'emp-1',
        partnerId: 'partner-1',
        status: 'assigned',
      ),
    ]);

    umrahPackages.addAll([
      UmrahPackageRecord(
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
      ),
      UmrahPackageRecord(
        id: 'pkg-2',
        pkgNo: 'UMR-2026-02',
        title: '10-Night Ramadan Early Offer (Expired Sample)',
        departureCity: 'Lahore',
        airline: 'PIA',
        makkahHotel: 'Swissotel',
        makkahDistanceM: 120,
        madinahHotel: 'Anwar Al Madinah',
        madinahDistanceM: 100,
        totalNights: 10,
        priceQuadPkr: 310000,
        status: 'expired',
      ),
    ]);

    quotes.add(QuoteRecord(
      id: 'qt-1',
      quoteNumber: 'QT-2026-1001',
      customerId: 'cust-1',
      title: '14N Umrah Custom (2 Pax)',
      supplierCostPkr: 460000,
      sellingPricePkr: 490000,
      status: 'sent',
      validUntil: DateTime.now().add(const Duration(days: 3)),
    ));

    invoices.add(InvoiceRecord(
      id: 'inv-1',
      invoiceNumber: 'INV-2026-1001',
      quoteId: 'qt-1',
      customerId: 'cust-1',
      totalPkr: 490000,
      verifiedPaidPkr: 0,
      status: 'issued',
    ));

    payments.add(PaymentRecord(
      id: 'pay-1',
      invoiceId: 'inv-1',
      customerId: 'cust-1',
      amountPkr: 250000,
      bankName: 'Meezan Bank',
      bankRef: 'MEZ-DEMO-7812',
      status: 'pending_review',
    ));

    bookings.add(BookingRecord(
      id: 'bk-1',
      bookingNumber: 'BK-2026-1001',
      customerId: 'cust-1',
      invoiceId: 'inv-1',
      title: '14N Umrah Booking — Tariq Mahmood',
      status: 'supplier_pending',
    ));

    documents.add(DocumentRecord(
      id: 'doc-1',
      customerId: 'cust-1',
      category: 'Passport Scan',
      fileName: 'tariq_passport.pdf',
      reviewStatus: 'approved',
    ));

    rules.addAll([
      RuleRecord(
        id: 'rl-1',
        name: 'OnLeadCreated Smart Least-Load Assignment',
        triggerEvent: 'lead.created',
        conditionSummary: 'IF consent == true AND service_type IN [umrah, flight, visa]',
        actionSummary: 'THEN assign least-loaded active staff (tie: round-robin; fallback: manager triage)',
        versionNo: 3,
      ),
      RuleRecord(
        id: 'rl-2',
        name: 'OnPaymentEvidenceUploaded Review Gate',
        triggerEvent: 'payment.evidence_received',
        conditionSummary: 'IF bank_slip uploaded',
        actionSummary: 'THEN set status=pending_review & create Finance verification task (NEVER auto-paid)',
        versionNo: 1,
      ),
    ]);

    suppliers.addAll([
      {'id': 'sup-1', 'name': 'Saudia / Sabre Verified Desk', 'category': 'Airline', 'status': 'active'},
      {'id': 'sup-2', 'name': 'Al-Haramain Ground Handling', 'category': 'Umrah Ground', 'status': 'active'},
    ]);
    partners.addAll([
      {'id': 'partner-1', 'name': 'Lahore Horizon Sub-Agent', 'rate': '5.00% on verified paid only', 'status': 'verified'},
    ]);
    visas.addAll([
      {'id': 'vs-1', 'country': 'Italy (Study/Work)', 'status': 'Checklist Preparing', 'note': 'No fabricated embassy approvals'},
    ]);
    appointments.addAll([
      {'id': 'apt-1', 'provider': 'GAMCA / VFS Lahore', 'status': 'requested', 'note': 'Slot not guaranteed until provider evidence uploaded'},
    ]);
    hotels.addAll([
      {'id': 'ht-1', 'city': 'Makkah / Madinah', 'status': 'Sourcing Supplier Rate', 'transfer': 'GMC Private'},
    ]);
    studyCases.addAll([
      {'id': 'st-1', 'country': 'Germany / Italy', 'intake': 'Fall 2027', 'status': 'Shortlisting'},
    ]);
    cmsDrafts.addAll([
      {'id': 'cms-1', 'title': 'Homepage Umrah Slot (UMR-2026-01)', 'status': 'published', 'version': 'v4'},
      {'id': 'cms-2', 'title': 'Turkey & Poland Work Demand Flyer', 'status': 'draft', 'version': 'v2'},
    ]);
    campaigns.addAll([
      {'id': 'cmp-1', 'title': 'Winter Umrah Verified Offers', 'status': 'draft', 'consent': 'Opt-in only + Unsubscribe link'},
    ]);
    subscribers.addAll([
      {'email': 'subscriber1@example.invalid', 'status': 'subscribed', 'consent': 'Double Opt-In'},
    ]);
    supportTickets.addAll([
      {'id': 'SUP-1001', 'subject': 'Invoice payment slip review status', 'status': 'assigned'},
    ]);
    chatMessages.addAll([
      {'sender': 'Tariq (Customer)', 'body': 'Assalam-o-Alaikum, uploaded my bank slip for INV-2026-1001.'},
      {'sender': 'Support Desk', 'body': 'Wa-Alaikum-Assalam, our Finance reviewer is verifying it against the bank statement.'},
    ]);
    notifications.addAll([
      {'id': 'nt-1', 'title': 'Pending Payment Slip Review', 'body': 'PAY-1 (PKR 250,000) awaits Finance verification.'},
    ]);
    reviews.addAll([
      {'customer': 'Verified Pilgrim', 'booking': 'BK-2026-0988', 'rating': '5/5', 'status': 'published'},
    ]);
    backups.addAll([
      {'id': 'bkp-1', 'date': '2026-11-22 02:00 PKT', 'status': 'Encrypted & Checksum Verified', 'restore': 'Sandbox Tested'},
    ]);
    ledger.addAll([
      {'id': 'led-0', 'account': 'receivable (DR)', 'amount': 'PKR 490,000', 'ref': 'INV-2026-1001'},
    ]);
    _logAudit('system.sandbox_init', 'os', 'horizon_one', 'Initialized Evaluation Sandbox (Zero-AI deterministic rules)');
  }
}
