import 'package:material_ui/material_ui.dart';
import '../core/l10n.dart';
import '../core/models.dart';
import '../core/os_engine.dart';
import '../core/tokens.dart';
import '../features/core_modules_view.dart';
import '../features/ops_modules_view.dart';
import 'brand_widgets.dart';

class ResponsiveOsShell extends StatelessWidget {
  final HorizonOsStore store;
  const ResponsiveOsShell({super.key, required this.store});

  static const Set<AppNavModule> _coreModules = {
    AppNavModule.dashboard,
    AppNavModule.inbox,
    AppNavModule.customers,
    AppNavModule.cases,
    AppNavModule.flights,
    AppNavModule.umrah,
    AppNavModule.quotes,
    AppNavModule.invoices,
    AppNavModule.payments,
    AppNavModule.ledger,
    AppNavModule.bookings,
    AppNavModule.myTrips,
    AppNavModule.documents,
  };

  IconData _iconFor(AppNavModule m) {
    switch (m) {
      case AppNavModule.dashboard:
        return Icons.dashboard_outlined;
      case AppNavModule.inbox:
        return Icons.inbox_outlined;
      case AppNavModule.customers:
        return Icons.people_outline;
      case AppNavModule.cases:
        return Icons.folder_open_outlined;
      case AppNavModule.flights:
        return Icons.flight_takeoff;
      case AppNavModule.umrah:
        return Icons.mosque_outlined;
      case AppNavModule.visas:
        return Icons.badge_outlined;
      case AppNavModule.appointments:
        return Icons.event_available_outlined;
      case AppNavModule.hotels:
        return Icons.hotel_outlined;
      case AppNavModule.studyAbroad:
        return Icons.school_outlined;
      case AppNavModule.quotes:
        return Icons.request_quote_outlined;
      case AppNavModule.invoices:
        return Icons.receipt_long_outlined;
      case AppNavModule.payments:
        return Icons.payments_outlined;
      case AppNavModule.ledger:
        return Icons.account_balance_outlined;
      case AppNavModule.bookings:
      case AppNavModule.myTrips:
        return Icons.luggage_outlined;
      case AppNavModule.documents:
        return Icons.description_outlined;
      case AppNavModule.employees:
        return Icons.groups_outlined;
      case AppNavModule.partners:
      case AppNavModule.referrals:
        return Icons.handshake_outlined;
      case AppNavModule.suppliers:
        return Icons.storefront_outlined;
      case AppNavModule.websiteCms:
        return Icons.web_outlined;
      case AppNavModule.campaigns:
      case AppNavModule.subscribers:
        return Icons.campaign_outlined;
      case AppNavModule.chat:
        return Icons.chat_bubble_outline;
      case AppNavModule.support:
        return Icons.support_agent_outlined;
      case AppNavModule.notifications:
        return Icons.notifications_outlined;
      case AppNavModule.seo:
      case AppNavModule.analytics:
      case AppNavModule.reports:
        return Icons.analytics_outlined;
      case AppNavModule.languages:
        return Icons.translate;
      case AppNavModule.reviews:
        return Icons.star_outline;
      case AppNavModule.websiteHealth:
        return Icons.monitor_heart_outlined;
      case AppNavModule.activityAudit:
        return Icons.history_edu_outlined;
      case AppNavModule.rulesStudio:
      case AppNavModule.assignmentWorkload:
        return Icons.rule_outlined;
      case AppNavModule.backupsDr:
        return Icons.backup_outlined;
      case AppNavModule.integrations:
        return Icons.hub_outlined;
      case AppNavModule.settings:
        return Icons.settings_outlined;
    }
  }

  void _openMoreSheet(BuildContext context, List<AppNavModule> permitted) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => SafeArea(
        child: DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.7,
          builder: (_, scrollCtrl) => ListView(
            controller: scrollCtrl,
            padding: const EdgeInsets.all(16),
            children: [
              Text('${store.currentRole.displayTitle} — All Modules', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              ...permitted.map((m) => ListTile(
                    minVerticalPadding: 12,
                    leading: Icon(_iconFor(m), color: BrandTokens.navy),
                    title: Text(m.title),
                    selected: store.activeModule == m,
                    onTap: () {
                      Navigator.pop(ctx);
                      store.setModule(m);
                    },
                  )),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final s = AppStrings(store.locale);
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 1280;
    final isTablet = width >= 768 && width < 1280;
    final isMobile = width < 768;
    final permitted = store.currentRole.permittedModules;
    final primaryBottom = permitted.take(3).toList();

    final contentBody = SingleChildScrollView(
      padding: EdgeInsets.all(isDesktop ? 24 : 16),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1440),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (!store.useLiveServer)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: BrandTokens.navy.withValues(alpha: 0.06),
                    border: Border.all(color: BrandTokens.border),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Wrap(
                    alignment: WrapAlignment.spaceBetween,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    spacing: 8,
                    runSpacing: 6,
                    children: [
                      Text(s.t('sandbox_banner'), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: BrandTokens.navy)),
                      DropdownButton<OsRole>(
                        isDense: true,
                        value: store.currentRole,
                        underline: const SizedBox.shrink(),
                        items: OsRole.values.map((r) => DropdownMenuItem(value: r, child: Text('Role: ${r.displayTitle}', style: const TextStyle(fontSize: 12)))).toList(),
                        onChanged: (r) {
                          if (r != null) store.switchSandboxRole(r);
                        },
                      ),
                    ],
                  ),
                ),
              if (store.isOffline)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: BrandTokens.warnBg,
                    border: Border.all(color: BrandTokens.gold),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.wifi_off, color: BrandTokens.warnText, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(s.t('offline_banner'), style: const TextStyle(fontSize: 12, color: BrandTokens.warnText, fontWeight: FontWeight.w600))),
                      TextButton(onPressed: () => store.toggleOffline(false), child: const Text('Reconnect')),
                    ],
                  ),
                ),
              if (store.lastErrorMessage != null)
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: BrandTokens.errorBg,
                    border: Border.all(color: BrandTokens.errorText),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${store.lastErrorMessage} (${store.lastErrorRequestId ?? "req"})',
                          style: const TextStyle(fontSize: 12, color: BrandTokens.errorText, fontWeight: FontWeight.w600),
                        ),
                      ),
                      TextButton(
                        onPressed: () {
                          store.lastErrorMessage = null;
                          store.refresh();
                        },
                        child: const Text('Dismiss'),
                      ),
                    ],
                  ),
                ),
              if (store.simulateSkeletonLoading)
                const SkeletonLoadingBlock()
              else if (_coreModules.contains(store.activeModule))
                CoreModulesView(store: store)
              else
                OpsModulesView(store: store),
            ],
          ),
        ),
      ),
    );

    return Directionality(
      textDirection: s.direction,
      child: Scaffold(
        appBar: PreferredSize(
          preferredSize: Size.fromHeight(isMobile ? 56 : 64),
          child: Container(
            height: isMobile ? 56 : 64,
            padding: const EdgeInsets.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              color: isMobile ? BrandTokens.navy : BrandTokens.surface,
              border: Border(bottom: BorderSide(color: isMobile ? BrandTokens.navyLight : BrandTokens.border)),
            ),
            child: Row(
              children: [
                if (isMobile)
                  const Expanded(child: BrandWordmark(compact: true, onDark: true))
                else ...[
                  Text(store.activeModule.title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                  const SizedBox(width: 16),
                  Expanded(
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 340),
                      child: SizedBox(
                        height: 38,
                        child: TextField(
                          onChanged: (v) {
                            store.searchQuery = v;
                            store.refresh();
                          },
                          decoration: InputDecoration(
                            hintText: s.t('search_hint'),
                            prefixIcon: const Icon(Icons.search, size: 18),
                            contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 10),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
                IconButton(
                  tooltip: store.isOffline ? 'Go Online' : 'Simulate Offline',
                  color: isMobile ? Colors.white : BrandTokens.textPrimary,
                  onPressed: () => store.toggleOffline(!store.isOffline),
                  icon: Icon(store.isOffline ? Icons.cloud_off : Icons.cloud_done_outlined),
                ),
                IconButton(
                  tooltip: 'English / Urdu RTL',
                  color: isMobile ? Colors.white : BrandTokens.textPrimary,
                  onPressed: () => store.setLocale(store.locale == 'en' ? 'ur' : 'en'),
                  icon: const Icon(Icons.translate),
                ),
                IconButton(
                  tooltip: 'Support Center',
                  color: isMobile ? Colors.white : BrandTokens.textPrimary,
                  onPressed: () => store.setModule(AppNavModule.support),
                  icon: const Icon(Icons.help_outline),
                ),
                IconButton(
                  tooltip: 'Logout',
                  color: isMobile ? Colors.white : BrandTokens.textPrimary,
                  onPressed: store.signOut,
                  icon: const Icon(Icons.logout),
                ),
              ],
            ),
          ),
        ),
        body: Row(
          children: [
            if (isDesktop)
              Material(
                color: BrandTokens.navy,
                child: SizedBox(
                  width: 248,
                  child: Column(
                    children: [
                      const Padding(padding: EdgeInsets.all(16), child: BrandWordmark(compact: false, onDark: true)),
                      Expanded(
                        child: ListView(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          children: permitted.map((m) {
                            final active = store.activeModule == m;
                            return ListTile(
                              dense: true,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              tileColor: active ? BrandTokens.navyLight : null,
                              leading: Icon(_iconFor(m), size: 18, color: active ? BrandTokens.gold : Colors.white70),
                              title: Text(
                                m.title,
                                style: TextStyle(
                                  color: active ? Colors.white : Colors.white70,
                                  fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                                  fontSize: 13,
                                ),
                              ),
                              onTap: () => store.setModule(m),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            if (isTablet)
              Material(
                color: BrandTokens.navy,
                child: SizedBox(
                  width: 72,
                  child: Column(
                    children: [
                      const SizedBox(height: 12),
                      const BrandWordmark(compact: true, onDark: true, showAssetPendingBadge: false),
                      const SizedBox(height: 12),
                      Expanded(
                        child: ListView(
                          children: permitted.map((m) {
                            final active = store.activeModule == m;
                            return IconButton(
                              tooltip: m.title,
                              icon: Icon(_iconFor(m), color: active ? BrandTokens.gold : Colors.white70),
                              onPressed: () => store.setModule(m),
                            );
                          }).toList(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            Expanded(child: contentBody),
          ],
        ),
        bottomNavigationBar: isMobile
            ? NavigationBar(
                height: 64,
                selectedIndex: primaryBottom.contains(store.activeModule) ? primaryBottom.indexOf(store.activeModule) : 3,
                onDestinationSelected: (idx) {
                  if (idx < primaryBottom.length) {
                    store.setModule(primaryBottom[idx]);
                  } else {
                    _openMoreSheet(context, permitted);
                  }
                },
                destinations: [
                  ...primaryBottom.map((m) => NavigationDestination(icon: Icon(_iconFor(m)), label: m.title.split(' ').first)),
                  const NavigationDestination(icon: Icon(Icons.menu), label: 'More'),
                ],
              )
            : null,
      ),
    );
  }
}
