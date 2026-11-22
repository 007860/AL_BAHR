import React, { useState } from 'react';
import { useHorizonStore } from '../core/StoreContext.tsx';
import {
  ALL_ROLES,
  MODULE_TITLES,
  PERMITTED_MODULES,
  ROLE_TITLES,
} from '../core/models.ts';
import type { AppNavModule, OsRole } from '../core/models.ts';
import { BrandWordmark } from './BrandWidgets.tsx';
import { CoreModulesView } from '../features/CoreModulesView.tsx';
import { OpsModulesView } from '../features/OpsModulesView.tsx';
import {
  Cloud,
  CloudOff,
  Compass,
  FileBadge,
  Grid,
  HelpCircle,
  LayoutDashboard,
  Languages,
  LogOut,
  Search,
  Share2,
  Ticket,
  WifiOff,
  X,
} from 'lucide-react';

const CORE_MODULES = new Set<AppNavModule>([
  'dashboard',
  'inbox',
  'customers',
  'cases',
  'flights',
  'umrah',
  'quotes',
  'invoices',
  'payments',
  'ledger',
  'bookings',
  'myTrips',
]);

export const ResponsiveShell: React.FC = () => {
  const { store, t, isRtl } = useHorizonStore();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);
  const permitted = PERMITTED_MODULES[store.currentRole];

  const primaryBottom: AppNavModule[] = [
    'dashboard',
    permitted.includes('myTrips') ? 'myTrips' : permitted.includes('bookings') ? 'bookings' : 'inbox',
    permitted.includes('visas') ? 'visas' : 'umrah',
  ];

  const selectModule = (mod: AppNavModule) => {
    store.setModule(mod);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  const connectedSocialCount = store.socialConnectors.filter((c) => c.connected).length;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex min-h-screen flex-col bg-[#F6F8FB] text-[#0F172A]"
    >
      {/* Top AppBar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-[#13294B] bg-[#0A192F] px-3 text-white lg:h-16 lg:border-slate-200 lg:bg-white lg:px-6 lg:text-[#0A192F]">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="min-w-0 lg:hidden">
            <BrandWordmark compact onDark />
          </div>

          <div className="hidden items-center gap-4 lg:flex lg:flex-1">
            <h1 className="text-base font-extrabold text-[#0A192F]">
              {MODULE_TITLES[store.activeModule]}
            </h1>
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={store.searchQuery}
                onChange={(e) => {
                  store.searchQuery = e.target.value;
                  store.notify();
                }}
                placeholder={t('search_hint')}
                className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pr-3 pl-9 text-xs text-slate-800 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0A8C98]"
              />
            </div>
          </div>
        </div>

        {/* Action Icons */}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {permitted.includes('socialMedia') && (
            <button
              type="button"
              title="Social Media Connectors"
              aria-label="Social Media Connectors"
              onClick={() => selectModule('socialMedia')}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#D9AD32] transition hover:bg-white/10 sm:min-h-11 sm:min-w-11 lg:text-[#0A6C74] lg:hover:bg-slate-100"
            >
              <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          <button
            type="button"
            title={store.isOffline ? 'Reconnect Online' : 'Offline Mode'}
            aria-label={store.isOffline ? 'Reconnect Online' : 'Offline Mode'}
            onClick={() => store.toggleOffline(!store.isOffline)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/10 sm:min-h-11 sm:min-w-11 lg:text-[#0A192F] lg:hover:bg-slate-100"
          >
            {store.isOffline ? <CloudOff className="h-4 w-4 text-[#D9AD32] sm:h-5 sm:w-5" /> : <Cloud className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          <button
            type="button"
            title="English / Urdu RTL"
            aria-label="English / Urdu RTL"
            onClick={() => store.setLocale(store.locale === 'en' ? 'ur' : 'en')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/10 sm:min-h-11 sm:min-w-11 lg:text-[#0A192F] lg:hover:bg-slate-100"
          >
            <Languages className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <button
            type="button"
            title="Support Center"
            aria-label="Support Center"
            onClick={() => selectModule('support')}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/10 sm:min-h-11 sm:min-w-11 lg:text-[#0A192F] lg:hover:bg-slate-100"
          >
            <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          <button
            type="button"
            title="Logout"
            aria-label="Logout"
            onClick={() => store.signOut()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white transition hover:bg-white/10 sm:min-h-11 sm:min-w-11 lg:text-[#0A192F] lg:hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </header>

      {/* Main Layout Row */}
      <div className="flex flex-1">
        {/* Desktop Persistent Dark Navy Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col bg-[#0A192F] text-white lg:flex">
          <div className="border-b border-white/10 p-4">
            <BrandWordmark onDark />
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Sidebar Navigation">
            {permitted.map((mod) => {
              const active = store.activeModule === mod;
              return (
                <button
                  key={mod}
                  type="button"
                  onClick={() => selectModule(mod)}
                  className={`flex min-h-10 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                    active
                      ? 'bg-[#13294B] font-bold text-[#D9AD32] shadow-sm'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        active ? 'bg-[#D9AD32]' : 'bg-white/30'
                      }`}
                    />
                    <span className="truncate">{MODULE_TITLES[mod]}</span>
                  </div>
                  {mod === 'socialMedia' && (
                    <span className="rounded-full bg-[#117A4B] px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                      {connectedSocialCount} Live
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Scrollable Content Area */}
        <main className="flex-1 pb-24 lg:pb-10">
          <div className="mx-auto max-w-7xl space-y-4 p-4 sm:p-6">
            {/* Top Workspace Status & Account Role Switcher Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-[#117A4B]" />
                <span className="font-bold text-[#0A192F]">{store.currentUserName}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{t('workspace_bar')}</span>
              </div>

              <div className="flex items-center gap-2">
                {permitted.includes('socialMedia') && (
                  <button
                    type="button"
                    onClick={() => selectModule('socialMedia')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8F8F0] px-2.5 py-1 text-[11px] font-extrabold text-[#117A4B] transition hover:bg-[#d3f2e3]"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    Social Connectors ({connectedSocialCount} Live)
                  </button>
                )}

                <label htmlFor="shell-role-switcher" className="font-bold text-slate-600">
                  Account:
                </label>
                <select
                  id="shell-role-switcher"
                  value={store.currentRole}
                  onChange={(e) => store.switchAccountRole(e.target.value as OsRole)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-[#0A192F]"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_TITLES[r]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Offline Warning Banner */}
            {store.isOffline && (
              <div
                role="status"
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D9AD32] bg-[#FFF7E0] px-4 py-2.5 text-xs font-semibold text-[#9A6700]"
              >
                <div className="flex items-center gap-2">
                  <WifiOff className="h-4 w-4 shrink-0" />
                  <span>{t('offline_banner')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => store.toggleOffline(false)}
                  className="rounded-lg bg-[#0A192F] px-3 py-1 text-xs font-bold text-white"
                >
                  Reconnect
                </button>
              </div>
            )}

            {/* RBAC 403 or Action Error Banner */}
            {store.lastErrorMessage && (
              <div
                role="alert"
                className="flex items-center justify-between gap-3 rounded-xl border border-[#B42318] bg-[#FDECEC] px-4 py-2.5 text-xs font-bold text-[#B42318]"
              >
                <span>
                  {store.lastErrorMessage} ({store.lastErrorRequestId ?? 'req'})
                </span>
                <button
                  type="button"
                  onClick={() => store.dismissError()}
                  className="rounded-lg border border-[#B42318]/30 px-2.5 py-1 text-xs font-bold"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Active Module View */}
            {CORE_MODULES.has(store.activeModule) ? <CoreModulesView /> : <OpsModulesView />}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="fixed right-0 bottom-0 left-0 z-30 flex h-16 items-center justify-around border-t border-slate-200 bg-white px-2 shadow-lg lg:hidden"
      >
        <button
          type="button"
          onClick={() => selectModule(primaryBottom[0])}
          className="flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 text-xs font-bold"
        >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full ${
              store.activeModule === primaryBottom[0]
                ? 'bg-[#D9AD32] text-[#0A192F]'
                : 'bg-transparent text-slate-600'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
          </span>
          <span className="text-[11px] text-[#0A192F]">Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => selectModule(primaryBottom[1])}
          className="flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 text-xs font-bold"
        >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full ${
              store.activeModule === primaryBottom[1]
                ? 'bg-[#D9AD32] text-[#0A192F]'
                : 'bg-transparent text-slate-600'
            }`}
          >
            <Ticket className="h-4 w-4" />
          </span>
          <span className="text-[11px] text-[#0A192F]">Tickets</span>
        </button>

        <button
          type="button"
          onClick={() => selectModule(primaryBottom[2])}
          className="flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 text-xs font-bold"
        >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full ${
              store.activeModule === primaryBottom[2]
                ? 'bg-[#D9AD32] text-[#0A192F]'
                : 'bg-transparent text-slate-600'
            }`}
          >
            <FileBadge className="h-4 w-4" />
          </span>
          <span className="text-[11px] text-[#0A192F]">Visas</span>
        </button>

        <button
          type="button"
          onClick={() => setMoreDrawerOpen(true)}
          className="flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 text-xs font-bold"
        >
          <span
            className={`flex h-7 w-12 items-center justify-center rounded-full ${
              !primaryBottom.includes(store.activeModule)
                ? 'bg-[#D9AD32] text-[#0A192F]'
                : 'bg-transparent text-slate-600'
            }`}
          >
            <Grid className="h-4 w-4" />
          </span>
          <span className="text-[11px] text-[#0A192F]">More</span>
        </button>
      </nav>

      {/* Mobile "More Modules" Bottom Sheet */}
      {moreDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 lg:hidden">
          <div className="max-h-[78vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-[#0A192F]">
                {ROLE_TITLES[store.currentRole]} — All Modules
              </h2>
              <button
                type="button"
                aria-label="Close modules drawer"
                onClick={() => setMoreDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {permitted.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    selectModule(m);
                    setMoreDrawerOpen(false);
                  }}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                    store.activeModule === m
                      ? 'border-[#D9AD32] bg-[#0A192F] text-[#D9AD32]'
                      : 'border-slate-200 bg-slate-50 text-[#0A192F] hover:bg-slate-100'
                  }`}
                >
                  <Compass className="h-4 w-4 shrink-0 text-[#D9AD32]" />
                  <span className="truncate">{MODULE_TITLES[m]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
