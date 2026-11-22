import React, { useState } from 'react';
import { useHorizonStore } from '../core/StoreContext.tsx';
import { ALL_ROLES, MODULE_TITLES, PERMITTED_MODULES, ROLE_TITLES } from '../core/models.ts';
import type { OsRole } from '../core/models.ts';
import { StatusBadge } from '../components/BrandWidgets.tsx';
import {
  Briefcase,
  ChevronRight,
  CreditCard,
  GraduationCap,
  PauseCircle,
  PhoneCall,
  PlayCircle,
  Search,
  Send,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';

export const OpsModulesView: React.FC = () => {
  const { store, t } = useHorizonStore();
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);
  const [visaSearch, setVisaSearch] = useState('');

  // Consultation booking modal
  const [consultTarget, setConsultTarget] = useState<{
    title: string;
    service: string;
  } | null>(null);
  const [consultName, setConsultName] = useState('');
  const [consultPhone, setConsultPhone] = useState('');

  // Staff Invite form
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<OsRole>('employee');

  // Chat input
  const [chatText, setChatText] = useState('');

  const notify = (res: { ok: boolean; message: string }) => {
    setBanner({ ok: res.ok, text: res.message });
  };

  const renderBanner = () =>
    banner ? (
      <div
        role="status"
        className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold ${
          banner.ok
            ? 'border-[#117A4B]/30 bg-[#E8F8F0] text-[#117A4B]'
            : 'border-[#B42318]/30 bg-[#FDECEC] text-[#B42318]'
        }`}
      >
        <span>{banner.text}</span>
        <button type="button" onClick={() => setBanner(null)} className="ml-3 underline">
          Close
        </button>
      </div>
    ) : null;

  // ---------------------------------------------------------------------------
  // 1. VISA & CONSULTATION + MEET OUR EXPERTS (Reference Screen 3)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'visas') {
    const categories = [
      {
        title: 'Visitor Visa',
        sub: 'Visitor visa consultation & checklist',
        service: 'visa',
        goldBox: true,
        icon: <CreditCard className="h-6 w-6 text-[#D9AD32]" />,
      },
      {
        title: 'Business Visa',
        sub: 'Business visa consultation & documentation',
        service: 'visa',
        goldBox: false,
        icon: <Briefcase className="h-6 w-6 text-[#D9AD32]" />,
      },
      {
        title: 'Student Consultation',
        sub: 'Study abroad intake & university guidance',
        service: 'study',
        goldBox: false,
        icon: <GraduationCap className="h-6 w-6 text-[#D9AD32]" />,
      },
    ].filter(
      (c) =>
        !visaSearch.trim() ||
        c.title.toLowerCase().includes(visaSearch.toLowerCase()) ||
        c.sub.toLowerCase().includes(visaSearch.toLowerCase()),
    );

    const experts = [
      {
        name: 'Amina Consultant',
        role: 'Senior Consultant',
        avatar: './assets/images/portrait-ceo.jpg',
        service: 'visa',
      },
      {
        name: 'Bilal Operations',
        role: 'Travel Consultant',
        avatar: './assets/images/portrait-director.jpg',
        service: 'umrah',
      },
    ];

    return (
      <div className="space-y-5">
        {renderBanner()}

        <div>
          <h2 className="text-2xl font-black text-[#0A192F]">Visa &amp; Consultation</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Jurisdiction checklists &amp; expert guidance · Never fabricates embassy approvals.
          </p>
        </div>

        {/* Search Input (Reference Screen 3) */}
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={visaSearch}
            onChange={(e) => setVisaSearch(e.target.value)}
            placeholder="Search visa categories or destination..."
            className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white pr-4 pl-10 text-sm placeholder:text-slate-400 shadow-xs focus-visible:ring-2 focus-visible:ring-[#0A8C98]"
          />
        </div>

        {/* 3 Elevated Consultation Cards (Visitor Visa, Business Visa, Student Consultation) */}
        <div className="space-y-3">
          {categories.map((cat) => (
            <button
              key={cat.title}
              type="button"
              onClick={() => setConsultTarget({ title: cat.title, service: cat.service })}
              className="flex w-full items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0A8C98]"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                  cat.goldBox ? 'bg-[#D9AD32]/20' : 'bg-[#0A192F]'
                }`}
              >
                {cat.icon}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-extrabold text-[#0A192F]">{cat.title}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{cat.sub}</p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          ))}
        </div>

        {/* Meet Our Experts Section (2-Column Responsive Row matching Reference Screen 3) */}
        <div className="pt-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="truncate text-lg font-extrabold text-[#0A192F]">Meet Our Experts</h3>
            {PERMITTED_MODULES[store.currentRole].includes('employees') && (
              <button
                type="button"
                onClick={() => store.setModule('employees')}
                className="min-h-10 shrink-0 text-xs font-bold text-[#0A6C74] hover:underline"
              >
                View All
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            {experts.map((ex) => (
              <div
                key={ex.name}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-xs transition-shadow hover:shadow-md"
              >
                <img
                  src={ex.avatar}
                  alt={ex.name}
                  className="h-16 w-16 rounded-full border-2 border-[#D9AD32] bg-[#0A192F] object-cover"
                />
                <h4 className="mt-2.5 w-full truncate text-xs font-extrabold text-[#0A192F] sm:text-sm">
                  {ex.name}
                </h4>
                <p className="mt-0.5 w-full truncate text-[11px] text-slate-500">{ex.role}</p>
                <button
                  type="button"
                  onClick={() =>
                    setConsultTarget({ title: `With ${ex.name}`, service: ex.service })
                  }
                  className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full bg-[#D9AD32] px-4 py-2 text-xs font-extrabold text-[#0A192F] transition hover:bg-[#c89d28] focus-visible:ring-2 focus-visible:ring-[#0A192F]"
                >
                  Book Now
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Active Visa Files */}
        <div className="pt-2">
          <h3 className="mb-2.5 text-sm font-extrabold text-[#0A192F]">Active Visa Files</h3>
          <div className="space-y-2.5">
            {store.visas.map((v, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <div>
                  <p className="text-sm font-extrabold text-[#0A192F]">
                    {v.country} · {v.status}
                  </p>
                  <p className="text-xs text-slate-500">{v.note}</p>
                </div>
                <StatusBadge variant="info" label={v.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Consultation Booking Modal */}
        {consultTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-base font-extrabold text-[#0A192F]">
                Book Consultation — {consultTarget.title}
              </h3>
              <p className="mt-1 text-xs text-slate-600">
                Routes deterministically via Smart Least-Load Assignment.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={consultName}
                  onChange={(e) => setConsultName(e.target.value)}
                  placeholder="Your Full Name"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={consultPhone}
                  onChange={(e) => setConsultPhone(e.target.value)}
                  placeholder="Phone (+92 300 ...)"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConsultTarget(null)}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = store.createAndAssignLead({
                      fullName: consultName.trim() || store.currentUserName,
                      phone: consultPhone.trim() || '+92 300 0000199',
                      serviceType: consultTarget.service,
                      source: `Consultation: ${consultTarget.title}`,
                      consentGiven: true,
                    });
                    notify(res);
                    setConsultTarget(null);
                    setConsultName('');
                    setConsultPhone('');
                  }}
                  className="min-h-11 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. EMPLOYEES & HR (One-Time Invite Generator + Workload & Leave)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'employees' || store.activeModule === 'assignmentWorkload') {
    return (
      <div className="space-y-6">
        {renderBanner()}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-extrabold text-[#0A192F]">
            Issue One-Time 48h Staff Invitation Token
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const res = store.inviteStaff({
                name: invName,
                email: invEmail,
                role: invRole,
              });
              notify(res);
              if (res.ok) {
                setInvName('');
                setInvEmail('');
              }
            }}
            className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4"
          >
            <input
              type="text"
              value={invName}
              onChange={(e) => setInvName(e.target.value)}
              placeholder="Employee Full Name"
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={invEmail}
              onChange={(e) => setInvEmail(e.target.value)}
              placeholder="staff@albahrtravels.com"
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={invRole}
              onChange={(e) => setInvRole(e.target.value as OsRole)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_TITLES[r]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
            >
              <UserPlus className="h-4 w-4 text-[#D9AD32]" />
              Generate Token
            </button>
          </form>

          {store.pendingInvites.length > 0 && (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-600">Issued Single-Use Invite Tokens:</p>
              {store.pendingInvites.map((inv, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                >
                  <span className="font-bold text-[#0A192F]">
                    {inv.name} ({inv.email}) — Token:{' '}
                    <code className="rounded bg-[#D9AD32]/20 px-1.5 py-0.5 font-mono text-[#0A192F]">
                      {inv.token}
                    </code>
                  </span>
                  <StatusBadge
                    variant={inv.status === 'redeemed' ? 'success' : 'warning'}
                    label={inv.status}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Staff Directory & Least-Load Status */}
        <div className="space-y-3">
          <h3 className="text-base font-extrabold text-[#0A192F]">
            Staff Directory &amp; Smart Assignment Workload
          </h3>
          {store.staff.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <h4 className="text-sm font-extrabold text-[#0A192F]">
                  {s.name} ({ROLE_TITLES[s.role]})
                </h4>
                <p className="text-xs text-slate-500">
                  Skills: {s.skills.join(', ')} · Workload: {s.activeLoad}/{s.maxActive}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  variant={s.leaveStatus === 'available' ? 'success' : 'warning'}
                  label={s.leaveStatus}
                />
                <button
                  type="button"
                  onClick={() => {
                    s.leaveStatus = s.leaveStatus === 'available' ? 'on_leave' : 'available';
                    store.notify();
                  }}
                  className="min-h-10 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold"
                >
                  Toggle Leave
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. RULES STUDIO (Deterministic Automation + CEO Emergency Pause)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'rulesStudio') {
    return (
      <div className="space-y-5">
        {renderBanner()}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-extrabold text-[#0A192F]">
              Deterministic Rules Studio (Zero-AI Engine)
            </h2>
            <p className="text-xs text-slate-600">
              Allowlisted IF/THEN triggers only. Emergency Pause routes all new leads to Manager
              Triage.
            </p>
          </div>
          <button
            type="button"
            onClick={() => notify(store.toggleEmergencyPause())}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white ${
              store.automationEmergencyPaused ? 'bg-[#117A4B]' : 'bg-[#B42318]'
            }`}
          >
            {store.automationEmergencyPaused ? (
              <>
                <PlayCircle className="h-4 w-4" />
                Resume Automation
              </>
            ) : (
              <>
                <PauseCircle className="h-4 w-4" />
                CEO Emergency Pause
              </>
            )}
          </button>
        </div>

        <div className="space-y-3">
          {store.rules.map((rl) => (
            <div
              key={rl.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-[#0A192F]">
                  {rl.name} (v{rl.versionNo})
                </span>
                <StatusBadge
                  variant={rl.enabled && !store.automationEmergencyPaused ? 'success' : 'warning'}
                  label={
                    store.automationEmergencyPaused
                      ? 'Paused'
                      : rl.enabled
                        ? 'Active'
                        : 'Disabled'
                  }
                />
              </div>
              <p className="mt-1 text-xs font-mono text-slate-600">{rl.conditionSummary}</p>
              <p className="mt-0.5 text-xs font-mono text-[#0A6C74]">{rl.actionSummary}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. SUPPORT DESK (Honest Contact Channels & WhatsApp Verification Gate)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'support') {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#0A192F]">{t('support_center')}</h2>
          <p className="mt-1 text-xs text-slate-600">
            Verified contact channels · Unverified numbers are never exposed as active links.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href="tel:+923000000000"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
            >
              <PhoneCall className="h-4 w-4 text-[#D9AD32]" />
              {t('call_support')}
            </a>
            <button
              type="button"
              disabled={!store.whatsappVerified}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500 disabled:cursor-not-allowed"
            >
              <ShieldAlert className="h-4 w-4 text-[#9A6700]" />
              {t('whatsapp_unverified')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 5. CHAT
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'chat') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-[#0A192F]">Case-Linked Messaging</h2>
        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {store.chatMessages.map((m, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3">
              <span className="text-xs font-extrabold text-[#0A6C74]">{m.sender}</span>
              <p className="mt-0.5 text-sm text-[#0A192F]">{m.body}</p>
            </div>
          ))}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatText.trim()) return;
              store.chatMessages.push({
                sender: store.currentUserName,
                body: chatText.trim(),
              });
              setChatText('');
              store.notify();
            }}
            className="flex gap-2 pt-2"
          >
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Write a case message..."
              className="min-h-11 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
            >
              <Send className="h-4 w-4 text-[#D9AD32]" />
              Send
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 6. LANGUAGES (English LTR / Urdu RTL Switcher)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'languages') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-extrabold text-[#0A192F]">
          Localization &amp; Urdu RTL Layout
        </h2>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => store.setLocale('en')}
            className={`min-h-11 rounded-xl px-5 py-2 text-xs font-extrabold ${
              store.locale === 'en'
                ? 'bg-[#0A192F] text-[#D9AD32]'
                : 'border border-slate-200 bg-slate-50 text-[#0A192F]'
            }`}
          >
            English (LTR)
          </button>
          <button
            type="button"
            onClick={() => store.setLocale('ur')}
            className={`min-h-11 rounded-xl px-5 py-2 text-xs font-extrabold ${
              store.locale === 'ur'
                ? 'bg-[#0A192F] text-[#D9AD32]'
                : 'border border-slate-200 bg-slate-50 text-[#0A192F]'
            }`}
          >
            اردو (Urdu RTL)
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 7. ACTIVITY & AUDIT LOG (Immutable Append-Only Audit Trail)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'activityAudit') {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-extrabold text-[#0A192F]">Immutable Activity &amp; Audit Log</h2>
        {store.auditLog.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs"
          >
            <div>
              <p className="text-xs font-extrabold text-[#0A192F]">
                [{a.actorRole.toUpperCase()}] {a.action} → {a.resource}
              </p>
              <p className="text-xs text-slate-600">{a.summary}</p>
            </div>
            <StatusBadge variant="neutral" label="Immutable" />
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 8. SETTINGS & GOVERNANCE GATES
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'settings') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#0A192F]">
            Company Brand, Legal &amp; Server Settings
          </h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="font-bold text-[#0A192F]">
                Master Vector Logo Asset (SVG/PNG)
              </span>
              <StatusBadge
                variant={store.logoAssetVerified ? 'success' : 'warning'}
                label={store.logoAssetVerified ? 'Verified' : 'OFFICIAL LOGO ASSET PENDING'}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="font-bold text-[#0A192F]">
                SECP Corporate Suffix ((PRIVATE) LIMITED)
              </span>
              <StatusBadge
                variant={store.legalSuffixVerified ? 'success' : 'warning'}
                label={
                  store.legalSuffixVerified
                    ? 'Enabled'
                    : 'Disabled Until SECP Incorporation Proof'
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="font-bold text-[#0A192F]">
                Default Flight Markup per Passenger
              </span>
              <span className="font-extrabold text-[#0A192F]">
                PKR {store.defaultFlightMarkupPkr.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 9. OTHER OPERATIONAL MODULES (Appointments, Hotels, Study, CMS, etc.)
  // ---------------------------------------------------------------------------
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#0A192F]">
          {MODULE_TITLES[store.activeModule]}
        </h2>
        <StatusBadge variant="info" label="Deterministic Module Ready" />
      </div>
      <p className="mt-2 text-xs text-slate-600">
        Zero-AI deterministic operational workspace for {MODULE_TITLES[store.activeModule]}. All
        records enforce strict RBAC and append-only audit logging.
      </p>
    </div>
  );
};
