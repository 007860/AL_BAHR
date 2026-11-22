import 'package:material_ui/material_ui.dart';
import '../core/models.dart';
import '../core/os_engine.dart';
import '../core/tokens.dart';
import '../widgets/brand_widgets.dart';

class CoreModulesView extends StatelessWidget {
  final HorizonOsStore store;
  const CoreModulesView({super.key, required this.store});

  void _toast(BuildContext ctx, ActionResult res) {
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(
        backgroundColor: res.ok ? BrandTokens.navy : BrandTokens.errorText,
        content: Text(res.message),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (store.activeModule) {
      case AppNavModule.dashboard:
        return _buildDashboard(context);
      case AppNavModule.inbox:
        return _buildInbox(context);
      case AppNavModule.customers:
        return _buildCustomers(context);
      case AppNavModule.cases:
        return _buildCases(context);
      case AppNavModule.flights:
        return _buildFlights(context);
      case AppNavModule.umrah:
        return _buildUmrah(context);
      case AppNavModule.quotes:
        return _buildQuotes(context);
      case AppNavModule.invoices:
      case AppNavModule.payments:
        return _buildInvoicesAndPayments(context);
      case AppNavModule.ledger:
        return _buildLedger(context);
      case AppNavModule.bookings:
      case AppNavModule.myTrips:
        return _buildBookingsAndMyTrips(context);
      case AppNavModule.documents:
        return _buildDocuments(context);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildDashboard(BuildContext context) {
    final pendingPays = store.payments.where((p) => p.status == 'pending_review').length;
    final openCases = store.scopedCases.length;
    final leadsCount = store.scopedLeads.length;
    final tripsCount = store.scopedBookings.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          runSpacing: 8,
          spacing: 12,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${store.currentRole.displayTitle} Dashboard', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
                Text(
                  'Role-scoped view · Zero-AI deterministic rules · ${store.automationEmergencyPaused ? "AUTOMATION PAUSED" : "Automation Active"}',
                  style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted),
                ),
              ],
            ),
            Wrap(
              spacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: () {
                    store.simulateSkeletonLoading = !store.simulateSkeletonLoading;
                    store.refresh();
                  },
                  icon: const Icon(Icons.refresh, size: 16),
                  label: Text(store.simulateSkeletonLoading ? 'End Loading Preview' : 'Preview Skeleton'),
                ),
                if (store.currentRole != OsRole.finance)
                  FilledButton.icon(
                    onPressed: () => store.setModule(store.currentRole == OsRole.customer ? AppNavModule.umrah : AppNavModule.inbox),
                    icon: const Icon(Icons.add, size: 16),
                    label: Text(store.currentRole == OsRole.customer ? 'Customize Umrah' : 'New Lead'),
                  ),
              ],
            ),
          ],
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            if (store.currentRole != OsRole.customer && store.currentRole != OsRole.finance)
              _kpiCard('Scoped Leads', '$leadsCount', 'Tap to open Inbox', () => store.setModule(AppNavModule.inbox)),
            _kpiCard('Scoped Cases', '$openCases', 'Role-isolated timeline', () => store.setModule(AppNavModule.cases)),
            if (store.currentRole == OsRole.ceo || store.currentRole == OsRole.finance)
              _kpiCard('Bank Slips Pending Review', '$pendingPays', 'Upload != Verified', () => store.setModule(AppNavModule.payments)),
            _kpiCard('Scoped Trips / Bookings', '$tripsCount', 'Supplier evidence gated', () => store.setModule(store.currentRole == OsRole.customer ? AppNavModule.myTrips : AppNavModule.bookings)),
            if (store.currentRole == OsRole.ceo)
              _kpiCard('Flight Default Markup', 'PKR ${store.defaultFlightMarkupPkr}/pax', 'CEO Configurable', () => store.setModule(AppNavModule.settings)),
          ],
        ),
        const SizedBox(height: 20),
        if (store.currentRole == OsRole.ceo || store.currentRole == OsRole.finance) ...[
          const Text('Finance Approval Queue (Manual Bank Reconciliation)', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 8),
          if (pendingPays == 0)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No pending bank slips awaiting verification.')))
          else
            ...store.payments.where((p) => p.status == 'pending_review').map((p) => Card(
                  child: ListTile(
                    title: Text('${p.bankName} · Ref ${p.bankRef} · PKR ${p.amountPkr}'),
                    subtitle: Text('Invoice ${p.invoiceId} · Status: ${p.status}'),
                    trailing: Wrap(
                      spacing: 6,
                      children: [
                        FilledButton(
                          onPressed: () => _toast(context, store.verifyOrRejectPayment(paymentId: p.id, approve: true, reason: 'Bank statement matched')),
                          child: const Text('Verify'),
                        ),
                        OutlinedButton(
                          onPressed: () => _toast(context, store.verifyOrRejectPayment(paymentId: p.id, approve: false, reason: 'Receipt mismatch')),
                          child: const Text('Reject'),
                        ),
                      ],
                    ),
                  ),
                )),
        ],
      ],
    );
  }

  Widget _kpiCard(String title, String value, String subtitle, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 240,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: BrandTokens.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(color: BrandTokens.textMuted, fontSize: 12, fontWeight: FontWeight.w600)),
            const SizedBox(height: 6),
            Text(value, style: const TextStyle(color: BrandTokens.textPrimary, fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text(subtitle, style: const TextStyle(color: BrandTokens.navy, fontSize: 12, fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _buildInbox(BuildContext context) {
    final q = store.searchQuery.toLowerCase();
    final items = store.scopedLeads.where((l) => q.isEmpty || l.fullName.toLowerCase().contains(q) || l.phone.contains(q)).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Inbox & Lead Capture (Smart Least-Loaded Assign)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            FilledButton.icon(
              onPressed: () => _openCreateLeadDialog(context),
              icon: const Icon(Icons.add),
              label: const Text('New Lead'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          EmptyStateCard(
            title: 'No matching leads in your scope',
            subtitle: 'Submit a new inquiry or clear search filters.',
            onClearFilters: store.searchQuery.isNotEmpty
                ? () {
                    store.searchQuery = '';
                    store.refresh();
                  }
                : null,
            onCreate: () => _openCreateLeadDialog(context),
            createLabel: '+ Create Lead',
          )
        else
          ...items.map((l) {
            final assigneeName = store.staff.where((s) => s.id == l.assignedEmployeeId).firstOrNull?.name ?? 'Manager Triage Queue';
            return Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text('${l.fullName} · ${l.phone}', style: const TextStyle(fontWeight: FontWeight.w700))),
                        StatusBadge.warning(l.status.toUpperCase()),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text('Service: ${l.serviceType} · Source: ${l.source} · Assignee: $assigneeName', style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: [
                        if (l.status != 'converted' && store.currentRole != OsRole.partner)
                          FilledButton(
                            onPressed: () => _toast(context, store.convertLeadToCase(l.id)),
                            child: const Text('Convert to Case'),
                          ),
                        OutlinedButton(
                          onPressed: () {
                            l.status = 'contacted';
                            store.refresh();
                          },
                          child: const Text('Mark Contacted'),
                        ),
                        OutlinedButton(
                          onPressed: () {
                            l.status = 'spam';
                            store.refresh();
                          },
                          child: const Text('Mark Spam'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  void _openCreateLeadDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    var service = 'umrah';
    var consent = true;
    showDialog<void>(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setLocal) => AlertDialog(
          title: const Text('New Lead (Deterministic Assignment)'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Full Name')),
              const SizedBox(height: 10),
              TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Phone (+92...)')),
              const SizedBox(height: 10),
              DropdownButtonFormField<String>(
                initialValue: service,
                decoration: const InputDecoration(labelText: 'Service Type'),
                items: const [
                  DropdownMenuItem(value: 'umrah', child: Text('Umrah & Hajj')),
                  DropdownMenuItem(value: 'flight', child: Text('Flights')),
                  DropdownMenuItem(value: 'visa', child: Text('Visas')),
                  DropdownMenuItem(value: 'study', child: Text('Study Abroad')),
                  DropdownMenuItem(value: 'hotel', child: Text('Hotels')),
                ],
                onChanged: (v) {
                  if (v != null) setLocal(() => service = v);
                },
              ),
              CheckboxListTile(
                contentPadding: EdgeInsets.zero,
                value: consent,
                onChanged: (v) => setLocal(() => consent = v ?? false),
                title: const Text('Customer consent verified', style: TextStyle(fontSize: 13)),
              ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                final res = store.createAndAssignLead(
                  fullName: nameCtrl.text,
                  phone: phoneCtrl.text,
                  serviceType: service,
                  source: 'os_manual',
                  consentGiven: consent,
                  idempotencyKey: 'ui-${nameCtrl.text}-${phoneCtrl.text}-${DateTime.now().minute}',
                );
                Navigator.pop(ctx);
                _toast(context, res);
              },
              child: const Text('Submit & Assign'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomers(BuildContext context) {
    final visible = store.customers.where((c) {
      if (store.currentRole == OsRole.partner) return c.partnerId == store.currentPartnerId;
      if (store.currentRole == OsRole.customer) return c.ownerUserId == store.currentUserId;
      return !c.archived;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('CRM & Customers (Single Authoritative Profile)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...visible.map((c) => Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(c.fullName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                        StatusBadge.success(c.kycVerified ? 'KYC VERIFIED' : 'PENDING KYC'),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('${c.phone} · ${c.email}', style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
                    if (store.currentRole != OsRole.customer && store.currentRole != OsRole.partner && c.internalNotes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: BrandTokens.warnBg, borderRadius: BorderRadius.circular(6)),
                        child: Text('Staff-Only Note: ${c.internalNotes.first}', style: const TextStyle(fontSize: 12, color: BrandTokens.warnText)),
                      ),
                    ],
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildCases(BuildContext context) {
    final items = store.scopedCases;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Cases & Workflow Tasks', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...items.map((c) => Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text('${c.caseNumber} · ${c.title}', style: const TextStyle(fontWeight: FontWeight.w700))),
                        StatusBadge.warning(c.status.toUpperCase()),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...c.tasks.map((t) => CheckboxListTile(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          value: t.completed,
                          title: Text(t.title, style: const TextStyle(fontSize: 13)),
                          onChanged: store.currentRole == OsRole.customer
                              ? null
                              : (v) {
                                  t.completed = v ?? false;
                                  store.refresh();
                                },
                        )),
                    if (store.currentRole != OsRole.customer)
                      Wrap(
                        spacing: 8,
                        children: [
                          OutlinedButton(
                            onPressed: () {
                              c.escalated = true;
                              store.refresh();
                              _toast(context, const ActionResult(ok: true, message: 'Case escalated to manager SLA queue.'));
                            },
                            child: Text(c.escalated ? 'Escalated' : 'Escalate SLA'),
                          ),
                          FilledButton(
                            onPressed: () {
                              c.status = 'completed';
                              store.refresh();
                            },
                            child: const Text('Complete Case'),
                          ),
                        ],
                      ),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildFlights(BuildContext context) {
    final paxCtrl = TextEditingController(text: '2');
    final netCtrl = TextEditingController(text: '125000');
    final routeCtrl = TextEditingController(text: 'LHE → JED');
    final overrideCtrl = TextEditingController(text: '${store.defaultFlightMarkupPkr}');

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Flights & Ticketing (Option A: Supplier Verified + Manual Issuance)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        Text(
          'Default Markup: PKR ${store.defaultFlightMarkupPkr} / passenger (CEO-configurable). Never fabricates prices or PNR.',
          style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Create Verified Supplier Flight Quote', style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 12,
                  runSpacing: 12,
                  children: [
                    SizedBox(width: 180, child: TextField(controller: routeCtrl, decoration: const InputDecoration(labelText: 'Route'))),
                    SizedBox(width: 120, child: TextField(controller: paxCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Passengers'))),
                    SizedBox(width: 180, child: TextField(controller: netCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Supplier Net Fare/Pax'))),
                    SizedBox(width: 180, child: TextField(controller: overrideCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Markup/Pax (PKR)'))),
                  ],
                ),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: () {
                    final pax = int.tryParse(paxCtrl.text) ?? 0;
                    final net = int.tryParse(netCtrl.text) ?? 0;
                    final ov = int.tryParse(overrideCtrl.text);
                    final custId = store.customers.first.id;
                    _toast(
                      context,
                      store.createFlightQuoteWithMarkup(
                        customerId: custId,
                        route: routeCtrl.text,
                        pax: pax,
                        netFarePerPax: net,
                        overrideMarkupPerPax: ov,
                      ),
                    );
                  },
                  child: const Text('Calculate Markup & Create Quote'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildUmrah(BuildContext context) {
    final visiblePkgs = store.currentRole == OsRole.customer || store.currentRole == OsRole.partner
        ? store.umrahPackages.where((p) => p.status == 'published').toList()
        : store.umrahPackages;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Umrah & Hajj (Verified Packages + Multi-Step Offline Draft Customizer)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...visiblePkgs.map((p) => Card(
              child: ListTile(
                title: Text('${p.pkgNo} · ${p.title}'),
                subtitle: Text('Makkah: ${p.makkahHotel} (${p.makkahDistanceM}m) · Madinah: ${p.madinahHotel} (${p.madinahDistanceM}m) · Quad PKR ${p.priceQuadPkr}'),
                trailing: Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    p.status == 'published' ? StatusBadge.success('PUBLISHED') : StatusBadge.warning(p.status.toUpperCase()),
                    if (store.currentRole == OsRole.ceo || store.currentRole == OsRole.manager)
                      OutlinedButton(
                        onPressed: () => _toast(context, store.togglePackageStatus(p.id, p.status == 'published' ? 'expired' : 'published')),
                        child: Text(p.status == 'published' ? 'Expire' : 'Publish'),
                      ),
                  ],
                ),
              ),
            )),
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Custom Umrah Stepper — Step ${store.umrahDraftStep} of 4', style: const TextStyle(fontWeight: FontWeight.w700)),
                    StatusBadge.success(store.draftSyncStatus),
                  ],
                ),
                const SizedBox(height: 10),
                if (store.umrahDraftStep == 1)
                  Text('Step 1 (City & Dates): ${store.umrahDraftCity} · ${store.umrahDraftNights} Nights · ${store.umrahDraftPax} Travelers'),
                if (store.umrahDraftStep == 2)
                  Text('Step 2 (Distances Captured Separately): Makkah ${store.umrahDraftMakkahDist} · Madinah ${store.umrahDraftMadinahDist} · Room ${store.umrahDraftRoom}'),
                if (store.umrahDraftStep == 3)
                  Text('Step 3 (Transport & Ziyarat): ${store.umrahDraftTransport} · Ziyarat ${store.umrahDraftZiyarat ? "Included" : "No"}'),
                if (store.umrahDraftStep == 4)
                  const Text('Step 4 (Submit Request): Sends requirements for staff supplier quote — zero fake auto-pricing.'),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    OutlinedButton(
                      onPressed: store.umrahDraftStep > 1 ? () => store.updateUmrahDraft(step: store.umrahDraftStep - 1) : null,
                      child: const Text('← Back'),
                    ),
                    OutlinedButton(
                      onPressed: () => store.updateUmrahDraft(nights: store.umrahDraftNights == 14 ? 21 : 14),
                      child: const Text('Save Draft'),
                    ),
                    if (store.umrahDraftStep < 4)
                      FilledButton(
                        onPressed: () => store.updateUmrahDraft(step: store.umrahDraftStep + 1),
                        child: const Text('Next →'),
                      )
                    else
                      FilledButton(
                        onPressed: () => _toast(
                          context,
                          store.createAndAssignLead(
                            fullName: store.currentUserName,
                            phone: '+92 325 7938125',
                            serviceType: 'umrah',
                            source: 'umrah_customizer',
                            consentGiven: true,
                            idempotencyKey: 'umrah-${store.umrahDraftCity}-${store.umrahDraftNights}',
                          ),
                        ),
                        child: const Text('Request Supplier Quote'),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildQuotes(BuildContext context) {
    final visible = store.quotes.where((q) {
      if (store.currentRole == OsRole.customer) {
        final own = store.customers.where((c) => c.ownerUserId == store.currentUserId).map((e) => e.id).toSet();
        return own.contains(q.customerId);
      }
      return true;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Quotes & Proposals (Versioned & Expiry Guarded)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...visible.map((q) => Card(
              child: ListTile(
                title: Text('${q.quoteNumber} (v${q.versionNo}) · ${q.title}'),
                subtitle: Text(
                  store.currentRole == OsRole.customer || store.currentRole == OsRole.partner
                      ? 'Selling Price: PKR ${q.sellingPricePkr} · Status: ${q.status}'
                      : 'Supplier Cost: PKR ${q.supplierCostPkr} · Selling: PKR ${q.sellingPricePkr} · Status: ${q.status}',
                ),
                trailing: q.status == 'sent'
                    ? FilledButton(
                        onPressed: () => _toast(context, store.acceptQuote(q.id, idempotencyKey: 'acc-${q.id}-v${q.versionNo}')),
                        child: const Text('Accept & Invoice'),
                      )
                    : StatusBadge.success(q.status.toUpperCase()),
              ),
            )),
      ],
    );
  }

  Widget _buildInvoicesAndPayments(BuildContext context) {
    final invs = store.scopedInvoices;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Invoices & Manual Bank Verification (Upload != Paid)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...invs.map((inv) => Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${inv.invoiceNumber} · Total PKR ${inv.totalPkr}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        inv.status == 'paid' ? StatusBadge.success('PAID') : StatusBadge.warning(inv.status.toUpperCase()),
                      ],
                    ),
                    Text('Verified Paid: PKR ${inv.verifiedPaidPkr} · Remaining: PKR ${inv.totalPkr - inv.verifiedPaidPkr}', style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
                    const SizedBox(height: 8),
                    if (inv.status != 'paid')
                      OutlinedButton(
                        onPressed: () => _openUploadSlipDialog(context, inv.id),
                        child: const Text('Upload Bank Slip (Pending Review)'),
                      ),
                  ],
                ),
              ),
            )),
        const SizedBox(height: 16),
        const Text('Payment Evidence Queue', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
        const SizedBox(height: 8),
        ...store.payments.map((p) => Card(
              child: ListTile(
                title: Text('${p.bankName} · Ref ${p.bankRef} · PKR ${p.amountPkr}'),
                subtitle: Text('Status: ${p.status}${p.reviewReason != null ? " (${p.reviewReason})" : ""}'),
                trailing: p.status == 'pending_review'
                    ? Wrap(
                        spacing: 6,
                        children: [
                          FilledButton(
                            onPressed: () => _toast(context, store.verifyOrRejectPayment(paymentId: p.id, approve: true, reason: 'Matched bank statement')),
                            child: const Text('Verify'),
                          ),
                          OutlinedButton(
                            onPressed: () => _toast(context, store.verifyOrRejectPayment(paymentId: p.id, approve: false, reason: 'Forged / unmatched slip')),
                            child: const Text('Reject'),
                          ),
                        ],
                      )
                    : (p.status == 'verified' ? StatusBadge.success('VERIFIED') : StatusBadge.error('REJECTED')),
              ),
            )),
      ],
    );
  }

  void _openUploadSlipDialog(BuildContext context, String invoiceId) {
    final amtCtrl = TextEditingController(text: '240000');
    final bankCtrl = TextEditingController(text: 'HBL');
    final refCtrl = TextEditingController(text: 'HBL-${DateTime.now().second}');
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Upload Bank Transfer Receipt'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Receipt enters Pending Review until Finance verifies the bank statement.', style: TextStyle(fontSize: 12)),
            const SizedBox(height: 10),
            TextField(controller: amtCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Amount (PKR)')),
            const SizedBox(height: 8),
            TextField(controller: bankCtrl, decoration: const InputDecoration(labelText: 'Bank Name')),
            const SizedBox(height: 8),
            TextField(controller: refCtrl, decoration: const InputDecoration(labelText: 'Transaction Reference')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () {
              final r = store.uploadBankSlip(
                invoiceId: invoiceId,
                amountPkr: int.tryParse(amtCtrl.text) ?? 0,
                bankName: bankCtrl.text,
                bankRef: refCtrl.text,
              );
              Navigator.pop(ctx);
              _toast(context, r);
            },
            child: const Text('Submit Evidence'),
          ),
        ],
      ),
    );
  }

  Widget _buildLedger(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Immutable Ledger & Reconciliation (Append-Only)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...store.ledger.map((e) => Card(
              child: ListTile(
                title: Text('${e['account']} · ${e['amount']}'),
                subtitle: Text('Reference: ${e['ref']}'),
                trailing: const Icon(Icons.lock_outline, size: 18, color: BrandTokens.textMuted),
              ),
            )),
      ],
    );
  }

  Widget _buildBookingsAndMyTrips(BuildContext context) {
    final items = store.scopedBookings;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          store.activeModule == AppNavModule.myTrips
              ? 'My Trips (Customer Isolated Wallet — Real Vouchers Only)'
              : 'Bookings & Supplier Confirmations',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        ...items.map((b) => Card(
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('${b.bookingNumber} · ${b.title}', style: const TextStyle(fontWeight: FontWeight.w700)),
                        b.status == 'documents_issued' ? StatusBadge.success('ISSUED') : StatusBadge.warning(b.status.toUpperCase()),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      b.supplierRef != null
                          ? 'Supplier Ref: ${b.supplierRef} · Document: ${b.ticketOrVoucherFile}'
                          : 'Awaiting verified payment and real supplier ticket/voucher upload.',
                      style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted),
                    ),
                    const SizedBox(height: 10),
                    if (store.currentRole != OsRole.customer && store.currentRole != OsRole.partner && b.status != 'documents_issued')
                      FilledButton(
                        onPressed: () => _toast(
                          context,
                          store.issueTicketOrVoucher(
                            bookingId: b.id,
                            supplierRef: 'SAU-PNR-9981',
                            documentName: 'eticket_voucher.pdf',
                          ),
                        ),
                        child: const Text('Issue Ticket / Upload Voucher'),
                      ),
                    if (b.status == 'documents_issued')
                      OutlinedButton.icon(
                        onPressed: () => _toast(context, ActionResult(ok: true, message: 'Short-lived signed URL issued (expires 120s) for ${b.ticketOrVoucherFile}.')),
                        icon: const Icon(Icons.download, size: 16),
                        label: const Text('Download Voucher (Signed URL)'),
                      ),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildDocuments(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Private Documents & Checklists (Signed URLs Only)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...store.documents.map((d) => Card(
              child: ListTile(
                title: Text('${d.category}: ${d.fileName} (v${d.versionNo})'),
                subtitle: Text('Status: ${d.reviewStatus}${d.reason != null ? " — ${d.reason}" : ""}'),
                trailing: Wrap(
                  spacing: 6,
                  children: [
                    OutlinedButton(
                      onPressed: () => _toast(context, ActionResult(ok: true, message: 'Signed URL generated for ${d.fileName} (valid 120s).')),
                      child: const Text('Preview'),
                    ),
                    if (store.currentRole != OsRole.customer)
                      OutlinedButton(
                        onPressed: () {
                          d.reviewStatus = 'rejected';
                          d.reason = 'Blurry MRZ line — replacement requested';
                          store.refresh();
                        },
                        child: const Text('Reject'),
                      ),
                  ],
                ),
              ),
            )),
      ],
    );
  }
}
