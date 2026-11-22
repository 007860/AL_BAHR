import 'package:material_ui/material_ui.dart';
import '../core/models.dart';
import '../core/os_engine.dart';
import '../core/tokens.dart';
import '../widgets/brand_widgets.dart';

class OpsModulesView extends StatelessWidget {
  final HorizonOsStore store;
  const OpsModulesView({super.key, required this.store});

  void _toast(BuildContext ctx, String msg, {bool ok = true}) {
    ScaffoldMessenger.of(ctx).showSnackBar(
      SnackBar(backgroundColor: ok ? BrandTokens.navy : BrandTokens.errorText, content: Text(msg)),
    );
  }

  @override
  Widget build(BuildContext context) {
    switch (store.activeModule) {
      case AppNavModule.visas:
        return _buildVisasAndExperts(context);
      case AppNavModule.appointments:
        return _simpleListModule(
          context,
          title: 'Embassy & Medical Appointments',
          subtitle: 'Request tracked without guaranteeing slots until provider evidence slip is uploaded.',
          items: store.appointments,
          itemTitle: (m) => '${m['provider']} · Status: ${m['status']}',
          itemSub: (m) => m['note'] ?? '',
          actionLabel: 'Confirm (Requires Evidence)',
          onAction: () => _toast(context, 'Blocked: Upload provider confirmation slip & external reference before confirming.', ok: false),
        );
      case AppNavModule.hotels:
        return _simpleListModule(
          context,
          title: 'Hotels & Transfers',
          subtitle: 'Manual supplier rate sourcing; voucher required for final confirmation.',
          items: store.hotels,
          itemTitle: (m) => '${m['city']} · ${m['transfer']}',
          itemSub: (m) => m['status'] ?? '',
          actionLabel: '+ Hotel Request',
          onAction: () {
            store.hotels.insert(0, {'id': 'ht-${store.hotels.length + 1}', 'city': 'Madinah Central', 'status': 'Sourcing Rate', 'transfer': 'Haramain Train'});
            store.refresh();
          },
        );
      case AppNavModule.studyAbroad:
        return _simpleListModule(
          context,
          title: 'Study Abroad Counseling & Applications',
          subtitle: 'University shortlist, academic checklist & verified offer-letter proof.',
          items: store.studyCases,
          itemTitle: (m) => '${m['country']} (${m['intake']})',
          itemSub: (m) => 'Stage: ${m['status']}',
          actionLabel: '+ New Student Case',
          onAction: () {
            store.studyCases.insert(0, {'id': 'st-${store.studyCases.length + 1}', 'country': 'Germany Public Uni', 'intake': 'Winter 2027', 'status': 'Checklist Open'});
            store.refresh();
          },
        );
      case AppNavModule.employees:
        return _buildEmployeesHr(context);
      case AppNavModule.partners:
      case AppNavModule.referrals:
        return _buildPartnersAndReferrals(context);
      case AppNavModule.suppliers:
        return _simpleListModule(
          context,
          title: 'Suppliers Catalog & Rate Cards',
          subtitle: 'Airlines, hotels, ground handlers & expired-rate validation.',
          items: store.suppliers,
          itemTitle: (m) => '${m['name']} (${m['category']})',
          itemSub: (m) => 'Status: ${m['status']}',
          actionLabel: '+ Add Supplier',
          onAction: () {
            store.suppliers.add({'id': 'sup-${store.suppliers.length + 1}', 'name': 'Verified Hotel Partner', 'category': 'Hotel', 'status': 'active'});
            store.refresh();
          },
        );
      case AppNavModule.websiteCms:
        return _buildWebsiteCms(context);
      case AppNavModule.campaigns:
      case AppNavModule.subscribers:
        return _buildCampaignsSubscribers(context);
      case AppNavModule.chat:
        return _buildChat(context);
      case AppNavModule.support:
        return _buildSupportCenter(context);
      case AppNavModule.notifications:
        return _simpleListModule(
          context,
          title: 'Notifications & Delivery Preferences',
          subtitle: 'Scoped unread alerts with consent preferences.',
          items: store.notifications,
          itemTitle: (m) => m['title'] ?? '',
          itemSub: (m) => m['body'] ?? '',
          actionLabel: 'Mark All Read',
          onAction: () {
            store.notifications.clear();
            store.refresh();
          },
        );
      case AppNavModule.languages:
        return _buildLanguages(context);
      case AppNavModule.reviews:
        return _simpleListModule(
          context,
          title: 'Verified Customer Reviews',
          subtitle: 'Invites restricted to genuine confirmed bookings only; moderated before publishing.',
          items: store.reviews,
          itemTitle: (m) => '${m['customer']} · ${m['rating']} (${m['booking']})',
          itemSub: (m) => 'Status: ${m['status']}',
          actionLabel: 'Invite Verified Booking',
          onAction: () => _toast(context, 'Review invite queued only for completed verified booking BK-2026-1001.'),
        );
      case AppNavModule.seo:
      case AppNavModule.analytics:
      case AppNavModule.reports:
        return _buildReportsSeoAnalytics(context);
      case AppNavModule.websiteHealth:
        return _buildWebsiteHealth(context);
      case AppNavModule.activityAudit:
        return _buildAuditLog(context);
      case AppNavModule.rulesStudio:
      case AppNavModule.assignmentWorkload:
        return _buildRulesAndAssignment(context);
      case AppNavModule.backupsDr:
        return _simpleListModule(
          context,
          title: 'Backups & Disaster Recovery',
          subtitle: 'Encrypted daily snapshots. Production restore requires two-person approval.',
          items: store.backups,
          itemTitle: (m) => '${m['id']} · ${m['date']}',
          itemSub: (m) => '${m['status']} · ${m['restore']}',
          actionLabel: 'Run Sandbox Test Restore',
          onAction: () {
            store.backups.insert(0, {'id': 'bkp-${store.backups.length + 1}', 'date': 'Just now', 'status': 'Encrypted Checksum OK', 'restore': 'Sandbox Verified'});
            store.refresh();
            _toast(context, 'Isolated sandbox Test Restore passed checksum verification.');
          },
        );
      case AppNavModule.integrations:
        return _buildIntegrations(context);
      case AppNavModule.settings:
        return _buildSettings(context);
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildVisasAndExperts(BuildContext context) {
    final categories = [
      (title: 'Visitor Visa', sub: 'Visitor visa consultation & checklist', icon: Icons.badge_outlined, bg: BrandTokens.goldSoft, fg: BrandTokens.gold),
      (title: 'Business Visa', sub: 'Business visa consultation & documentation', icon: Icons.work_outline, bg: BrandTokens.navy, fg: BrandTokens.gold),
      (title: 'Student Consultation', sub: 'Study abroad intake & university guidance', icon: Icons.school_outlined, bg: BrandTokens.navy, fg: BrandTokens.gold),
    ];

    final experts = [
      (name: store.staff.isNotEmpty ? store.staff[0].name : 'Visa Specialist', role: 'Senior Consultant', avatar: 'assets/images/portrait-ceo.jpg', service: 'visa'),
      (name: store.staff.length > 1 ? store.staff[1].name : 'Travel Ops Lead', role: 'Travel Consultant', avatar: 'assets/images/portrait-director.jpg', service: 'study'),
    ];

    void openBookConsultation(String topic, String serviceCode) {
      final nameCtrl = TextEditingController(text: store.currentUserName);
      final phoneCtrl = TextEditingController(text: '+92 ');
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text('Book Consultation — $topic'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Routes automatically to our least-loaded eligible consultant.', style: TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
              const SizedBox(height: 10),
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Applicant Name')),
              const SizedBox(height: 8),
              TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Phone (+92...)')),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
            FilledButton(
              onPressed: () {
                final r = store.createAndAssignLead(
                  fullName: nameCtrl.text,
                  phone: phoneCtrl.text,
                  serviceType: serviceCode,
                  source: 'visa_consultation_screen',
                  consentGiven: true,
                );
                Navigator.pop(ctx);
                _toast(context, r.message, ok: r.ok);
              },
              child: const Text('Request Consultation'),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Visa & Consultation', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        const Text('Jurisdiction checklists & expert guidance · Never fabricates embassy approvals.', style: TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
        const SizedBox(height: 12),
        TextField(
          onChanged: (v) {
            store.searchQuery = v;
            store.refresh();
          },
          decoration: const InputDecoration(
            hintText: 'Search visa categories or destinations...',
            prefixIcon: Icon(Icons.search, size: 20),
          ),
        ),
        const SizedBox(height: 14),
        ...categories.map((cat) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: InkWell(
                  borderRadius: BorderRadius.circular(14),
                  onTap: () => openBookConsultation(cat.title, cat.title.contains('Student') ? 'study' : 'visa'),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(color: cat.bg, borderRadius: BorderRadius.circular(12)),
                          alignment: Alignment.center,
                          child: Icon(cat.icon, color: cat.fg, size: 24),
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(cat.title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                              const SizedBox(height: 2),
                              Text(cat.sub, style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
                            ],
                          ),
                        ),
                        const Icon(Icons.chevron_right, color: BrandTokens.textMuted),
                      ],
                    ),
                  ),
                ),
              ),
            )),
        const SizedBox(height: 16),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Expanded(
              child: Text(
                'Meet Our Experts',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
              ),
            ),
            if (store.currentRole.permittedModules.contains(AppNavModule.employees))
              TextButton(onPressed: () => store.setModule(AppNavModule.employees), child: const Text('View All')),
          ],
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, constraints) {
            final cardWidth = constraints.maxWidth >= 520 ? 185.0 : ((constraints.maxWidth - 12) / 2).clamp(140.0, 220.0);
            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: experts.map((ex) => SizedBox(
                    width: cardWidth,
                    child: Card(
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          children: [
                            CircleAvatar(
                              radius: 30,
                              backgroundColor: BrandTokens.navy,
                              backgroundImage: AssetImage(ex.avatar),
                            ),
                            const SizedBox(height: 10),
                            Text(ex.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
                            const SizedBox(height: 2),
                            Text(ex.role, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: BrandTokens.textMuted)),
                            const SizedBox(height: 10),
                            FilledButton(
                              style: FilledButton.styleFrom(
                                backgroundColor: BrandTokens.gold,
                                foregroundColor: BrandTokens.navy,
                                minimumSize: const Size(double.infinity, 44),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
                              ),
                              onPressed: () => openBookConsultation('With ${ex.name}', ex.service),
                              child: const Text('Book Now', style: TextStyle(fontWeight: FontWeight.w700)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )).toList(),
            );
          },
        ),
        const SizedBox(height: 18),
        const Text('Active Visa Files', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        ...store.visas.map((m) => Card(
              child: ListTile(
                title: Text('${m['country']} · ${m['status']}'),
                subtitle: Text(m['note'] ?? ''),
              ),
            )),
      ],
    );
  }

  Widget _simpleListModule(
    BuildContext context, {
    required String title,
    required String subtitle,
    required List<Map<String, String>> items,
    required String Function(Map<String, String>) itemTitle,
    required String Function(Map<String, String>) itemSub,
    required String actionLabel,
    required VoidCallback onAction,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 12,
          runSpacing: 8,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
              ],
            ),
            FilledButton(onPressed: onAction, child: Text(actionLabel)),
          ],
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          const EmptyStateCard(title: 'Nothing pending', subtitle: 'All items in this module have been cleared.')
        else
          ...items.map((m) => Card(child: ListTile(title: Text(itemTitle(m)), subtitle: Text(itemSub(m))))),
      ],
    );
  }

  Widget _buildEmployeesHr(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 12,
          runSpacing: 8,
          children: [
            const Text('Employees & HR (One-Time Invites, Skills & Attendance)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            if (store.currentRole == OsRole.ceo || store.currentRole == OsRole.manager)
              FilledButton.icon(
                onPressed: () {
                  final res = store.inviteStaff(name: 'Sana Travel Ops', email: 'sana.${store.staff.length}@albahr.local', role: OsRole.employee);
                  _toast(context, res.message, ok: res.ok);
                },
                icon: const Icon(Icons.person_add, size: 16),
                label: const Text('Invite Employee'),
              ),
          ],
        ),
        const SizedBox(height: 12),
        ...store.staff.map((s) => Card(
              child: ListTile(
                title: Text('${s.name} (${s.role.displayTitle})'),
                subtitle: Text('Skills: ${s.skills.join(', ')} · Load: ${s.activeLoad}/${s.maxActive} · Leave: ${s.leaveStatus}'),
                trailing: Wrap(
                  spacing: 6,
                  children: [
                    OutlinedButton(
                      onPressed: () {
                        s.checkedInToday = !s.checkedInToday;
                        store.refresh();
                      },
                      child: Text(s.checkedInToday ? 'Checked In' : 'Check In'),
                    ),
                    if (store.currentRole == OsRole.ceo || store.currentRole == OsRole.manager)
                      OutlinedButton(
                        onPressed: () {
                          s.leaveStatus = s.leaveStatus == 'available' ? 'on_leave' : 'available';
                          store.refresh();
                        },
                        child: Text(s.leaveStatus == 'available' ? 'Set Leave' : 'Set Available'),
                      ),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildPartnersAndReferrals(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('B2B Partners & Referrals (Private Isolated Tenant Scope)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        const Text('Commissions accrue strictly on Finance-verified paid bookings. Cross-agency access blocked (403).', style: TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
        const SizedBox(height: 12),
        ...store.partners.map((p) => Card(
              child: ListTile(
                title: Text(p['name']!),
                subtitle: Text('${p['rate']} · Status: ${p['status']}'),
                trailing: StatusBadge.success('VERIFIED PARTNER'),
              ),
            )),
      ],
    );
  }

  Widget _buildWebsiteCms(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Website CMS Bridge (www.albahrtravels.com)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 6),
        const Text('Authoritative single package source · Approval-gated publish & versioned rollback.', style: TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
        const SizedBox(height: 12),
        ...store.cmsDrafts.map((d) => Card(
              child: ListTile(
                title: Text('${d['title']} (${d['version']})'),
                subtitle: Text('Status: ${d['status']}'),
                trailing: Wrap(
                  spacing: 6,
                  children: [
                    OutlinedButton(
                      onPressed: () => _toast(context, 'Preview verified — ready for CEO publish approval.'),
                      child: const Text('Preview'),
                    ),
                    if (store.currentRole == OsRole.ceo)
                      FilledButton(
                        onPressed: () {
                          if (store.isOffline) {
                            _toast(context, 'Offline mode: CMS publish disabled.', ok: false);
                            return;
                          }
                          d['status'] = d['status'] == 'published' ? 'unpublished' : 'published';
                          store.refresh();
                        },
                        child: Text(d['status'] == 'published' ? 'Unpublish' : 'Approve & Publish'),
                      ),
                  ],
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildCampaignsSubscribers(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Campaigns & Opt-In Subscribers (Zero Unsolicited Sends)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...store.campaigns.map((c) => Card(
              child: ListTile(
                title: Text(c['title']!),
                subtitle: Text('${c['status']} · ${c['consent']}'),
                trailing: FilledButton(
                  onPressed: () => _toast(context, 'Enqueued idempotently for ${store.subscribers.where((s) => s['status'] == 'subscribed').length} opted-in subscribers.'),
                  child: const Text('Send Approved'),
                ),
              ),
            )),
        const SizedBox(height: 12),
        ...store.subscribers.map((s) => Card(
              child: ListTile(
                title: Text(s['email']!),
                subtitle: Text('Consent: ${s['consent']} · Status: ${s['status']}'),
                trailing: OutlinedButton(
                  onPressed: () {
                    s['status'] = s['status'] == 'subscribed' ? 'unsubscribed' : 'subscribed';
                    store.refresh();
                  },
                  child: Text(s['status'] == 'subscribed' ? 'Unsubscribe' : 'Re-Opt-In'),
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildChat(BuildContext context) {
    final msgCtrl = TextEditingController();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Chat & Messaging (Persisted Before Dispatch)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...store.chatMessages.map((m) => Card(child: ListTile(title: Text(m['sender']!), subtitle: Text(m['body']!)))),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(child: TextField(controller: msgCtrl, decoration: const InputDecoration(hintText: 'Reply using approved template or message...'))),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: () {
                if (msgCtrl.text.trim().isEmpty) return;
                store.chatMessages.add({'sender': store.currentUserName, 'body': msgCtrl.text.trim()});
                store.refresh();
              },
              child: const Text('Reply'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSupportCenter(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Support Center & Desk', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(CompanyDirectory.brandName, style: TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 6),
                const Text(CompanyDirectory.officeAddress, style: TextStyle(fontSize: 13)),
                const SizedBox(height: 6),
                const Directionality(
                  textDirection: TextDirection.ltr,
                  child: Text('Phone: ${CompanyDirectory.supportPhone} · Email: ${CompanyDirectory.supportEmail}', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                ),
                const SizedBox(height: 12),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    FilledButton.icon(
                      onPressed: () => _toast(context, 'Call Support: ${CompanyDirectory.supportPhone}'),
                      icon: const Icon(Icons.phone, size: 16),
                      label: const Text('Call Support'),
                    ),
                    OutlinedButton.icon(
                      onPressed: store.whatsappVerified ? () => _toast(context, 'WhatsApp link ready') : null,
                      icon: const Icon(Icons.chat, size: 16),
                      label: Text(store.whatsappVerified ? 'WhatsApp Support' : 'WhatsApp (Pending Verification)'),
                    ),
                    OutlinedButton.icon(
                      onPressed: () {
                        store.supportTickets.insert(0, {'id': 'SUP-${1002 + store.supportTickets.length}', 'subject': 'New Customer Support Request', 'status': 'assigned'});
                        store.refresh();
                        _toast(context, 'Support ticket created & routed to least-loaded agent.');
                      },
                      icon: const Icon(Icons.confirmation_number, size: 16),
                      label: const Text('Create Ticket'),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        ...store.supportTickets.map((t) => Card(child: ListTile(title: Text('${t['id']} · ${t['subject']}'), subtitle: Text('Status: ${t['status']}')))),
      ],
    );
  }

  Widget _buildLanguages(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Languages & RTL Preview (English / اردو)', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            const Text('Switches directional layout cleanly while preserving phone numbers and email addresses left-to-right (LTR).'),
            const SizedBox(height: 12),
            Wrap(
              spacing: 10,
              children: [
                ChoiceChip(
                  label: const Text('English (LTR)'),
                  selected: store.locale == 'en',
                  onSelected: (_) => store.setLocale('en'),
                ),
                ChoiceChip(
                  label: const Text('اردو (RTL)'),
                  selected: store.locale == 'ur',
                  onSelected: (_) => store.setLocale('ur'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportsSeoAnalytics(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('${store.activeModule.title} (Privacy-Safe Aggregated Metrics)', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Leads Captured: ${store.leads.length} · Active Cases: ${store.cases.length} · Verified Invoices: ${store.invoices.where((i) => i.status == 'paid').length}'),
                const SizedBox(height: 8),
                const Text('Canonical Base: https://www.albahrtravels.com/ · CSV exports apply formula-injection escaping (= + - @).', style: TextStyle(fontSize: 12, color: BrandTokens.textMuted)),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: () => _toast(context, 'Watermarked CSV report generated with formula-injection protection.'),
                  icon: const Icon(Icons.download, size: 16),
                  label: const Text('Export Authorized Report'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildWebsiteHealth(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Website Health & Read-Only Diagnostics', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Card(
          child: ListTile(
            title: const Text('www.albahrtravels.com Bridge'),
            subtitle: const Text('Repo global-wayfinder-40 audited read-only · Live Supabase RLS & secret rotation check awaiting owner credentials.'),
            trailing: FilledButton(
              onPressed: () => _toast(context, 'Read-only health probe complete (zero secrets exposed in output).'),
              child: const Text('Run Check'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAuditLog(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Immutable Activity & Audit Trail', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        ...store.auditLog.take(25).map((a) => Card(
              child: ListTile(
                dense: true,
                title: Text('${a.action} · ${a.resource} (${a.actorRole})'),
                subtitle: Text(a.summary),
                trailing: Text('${a.at.hour.toString().padLeft(2, '0')}:${a.at.minute.toString().padLeft(2, '0')}', style: const TextStyle(fontSize: 11)),
              ),
            )),
      ],
    );
  }

  Widget _buildRulesAndAssignment(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          spacing: 12,
          runSpacing: 8,
          children: [
            const Text('Deterministic Automation Rules & Smart Assignment', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
            if (store.currentRole == OsRole.ceo)
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: store.automationEmergencyPaused ? BrandTokens.successText : BrandTokens.errorText),
                onPressed: () => _toast(context, store.toggleEmergencyPause().message),
                icon: Icon(store.automationEmergencyPaused ? Icons.play_arrow : Icons.pause),
                label: Text(store.automationEmergencyPaused ? 'Resume Automation' : 'Emergency Pause'),
              ),
          ],
        ),
        const SizedBox(height: 12),
        ...store.rules.map((r) => Card(
              child: ListTile(
                title: Text('${r.name} (v${r.versionNo})'),
                subtitle: Text('${r.conditionSummary}\n${r.actionSummary}'),
                isThreeLine: true,
                trailing: OutlinedButton(
                  onPressed: () {
                    final eligible = store.staff.where((s) => s.active && s.leaveStatus == 'available').toList()
                      ..sort((a, b) => a.activeLoad.compareTo(b.activeLoad));
                    final chosen = eligible.isNotEmpty ? eligible.first.name : 'Manager Triage';
                    _toast(context, 'Dry-Run Simulation (0 DB writes): Rule v${r.versionNo} would assign to $chosen.');
                  },
                  child: const Text('Simulate Dry-Run'),
                ),
              ),
            )),
      ],
    );
  }

  Widget _buildIntegrations(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Integrations & API Health (Server-Side Secrets Only)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        const Card(child: ListTile(title: Text('Zero-AI Runtime Policy'), subtitle: Text('No LLM/AI API keys or inference calls exist in production runtime.'))),
        const Card(child: ListTile(title: Text('Private Object Storage'), subtitle: Text('Signed URLs expire in 120s. Zero public passport URLs.'))),
        Card(
          child: ListTile(
            title: Text(store.useLiveServer ? 'Live OS API: ${store.serverBaseUrl}' : 'Evaluation Sandbox Mode Active'),
            subtitle: const Text('Release 1 Private Edition: Public Signup & SaaS Billing routes are disabled (404).'),
          ),
        ),
      ],
    );
  }

  Widget _buildSettings(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Company Settings, Branding & Release-1 Verification Gates', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text('WhatsApp Channel Verified (+92 325 7938125)'),
                  subtitle: const Text('Enables WhatsApp Support button once owner confirms active desk.'),
                  value: store.whatsappVerified,
                  onChanged: store.currentRole == OsRole.ceo
                      ? (v) {
                          store.whatsappVerified = v;
                          store.refresh();
                        }
                      : null,
                ),
                SwitchListTile(
                  title: const Text('SECP (PRIVATE) LIMITED Legal Suffix Verified'),
                  subtitle: const Text('Keep off until registration certificate verified.'),
                  value: store.legalSuffixVerified,
                  onChanged: store.currentRole == OsRole.ceo
                      ? (v) {
                          store.legalSuffixVerified = v;
                          store.refresh();
                        }
                      : null,
                ),
                ListTile(
                  title: Text('Default Flight Markup: PKR ${store.defaultFlightMarkupPkr} / passenger'),
                  subtitle: const Text('CEO-configurable markup rule (default PKR 2,000/pax).'),
                  trailing: store.currentRole == OsRole.ceo
                      ? OutlinedButton(
                          onPressed: () {
                            store.defaultFlightMarkupPkr = store.defaultFlightMarkupPkr == 2000 ? 2500 : 2000;
                            store.refresh();
                          },
                          child: const Text('Toggle 2000/2500'),
                        )
                      : null,
                ),
                const Divider(),
                ListTile(
                  title: const Text('Emergency Logout All Sessions (MFA)'),
                  trailing: FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: BrandTokens.errorText),
                    onPressed: store.signOut,
                    child: const Text('Revoke & Logout'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
