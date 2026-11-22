import React, { useState } from 'react';
import { useHorizonStore } from '../core/StoreContext.tsx';
import { PERMITTED_MODULES } from '../core/models.ts';
import type { AppNavModule, BookingRecord, SocialPlatform } from '../core/models.ts';
import {
  BoardingPassCard,
  SocialPlatformBadge,
  StatusBadge,
} from '../components/BrandWidgets.tsx';
import {
  Bell,
  Building2,
  CheckCircle2,
  Compass,
  FileCheck2,
  FileSpreadsheet,
  Plane,
  Plus,
  Search,
  Share2,
  Star,
  Upload,
  XCircle,
} from 'lucide-react';

export const CoreModulesView: React.FC = () => {
  const { store } = useHorizonStore();
  const [bannerMsg, setBannerMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Lead creation form state
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadService, setLeadService] = useState('umrah');
  const [leadPlatform, setLeadPlatform] = useState<SocialPlatform | ''>('whatsapp');
  const [leadConsent, setLeadConsent] = useState(true);

  // Flight markup form state
  const [flightRoute, setFlightRoute] = useState('LHE-JED');
  const [flightPax, setFlightPax] = useState(2);
  const [flightNetFare, setFlightNetFare] = useState(135000);
  const [flightMarkupOverride, setFlightMarkupOverride] = useState('2000');

  // Bank slip upload state
  const [slipAmount, setSlipAmount] = useState('240000');
  const [slipBank, setSlipBank] = useState('Meezan Bank');
  const [slipRef, setSlipRef] = useState('');

  // Payment review state
  const [rejectReason, setRejectReason] = useState('Unreadable or mismatched bank reference');

  // Ticket issuance modal state
  const [ticketTarget, setTicketTarget] = useState<BookingRecord | null>(null);
  const [pnrInput, setPnrInput] = useState('SV-99412PK');
  const [voucherFileInput, setVoucherFileInput] = useState('eticket_verified_sv99412.pdf');

  // My Tickets tab state ('bookings' | 'past')
  const [ticketsTab, setTicketsTab] = useState<'bookings' | 'past'>('bookings');

  const notifyAction = (res: { ok: boolean; message: string }) => {
    setBannerMsg({ ok: res.ok, text: res.message });
  };

  const renderFeedbackBanner = () =>
    bannerMsg ? (
      <div
        role="status"
        className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-bold ${
          bannerMsg.ok
            ? 'border-[#117A4B]/30 bg-[#E8F8F0] text-[#117A4B]'
            : 'border-[#B42318]/30 bg-[#FDECEC] text-[#B42318]'
        }`}
      >
        <span>{bannerMsg.text}</span>
        <button
          type="button"
          onClick={() => setBannerMsg(null)}
          className="ml-3 underline"
        >
          Close
        </button>
      </div>
    ) : null;

  const renderTicketIssueModal = () =>
    ticketTarget ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h3 className="text-base font-extrabold text-[#0A192F]">
            Issue Verified Ticket — {ticketTarget.bookingNumber}
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Requires Finance-verified payment on linked invoice ({ticketTarget.invoiceId}).
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Real Supplier PNR / Reference
              </label>
              <input
                type="text"
                value={pnrInput}
                onChange={(e) => setPnrInput(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Voucher / E-Ticket PDF Filename
              </label>
              <input
                type="text"
                value={voucherFileInput}
                onChange={(e) => setVoucherFileInput(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setTicketTarget(null)}
              className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const res = store.issueTicketOrVoucher({
                  bookingId: ticketTarget.id,
                  supplierRef: pnrInput,
                  documentName: voucherFileInput,
                });
                notifyAction(res);
                setTicketTarget(null);
              }}
              className="min-h-11 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
            >
              Confirm &amp; Issue E-Ticket
            </button>
          </div>
        </div>
      </div>
    ) : null;

  // ---------------------------------------------------------------------------
  // 1. DASHBOARD (Reference Screen 2 + Social Channels Strip + KPIs)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'dashboard') {
    const greetingTarget =
      store.currentRole === 'customer'
        ? 'Traveler!'
        : `${store.currentUserName.split(' ')[0]}!`;
    const permitted = PERMITTED_MODULES[store.currentRole];

    const quickCategories: Array<{
      label: string;
      mod: AppNavModule;
      isGold: boolean;
      icon: React.ReactNode;
    }> = [
      {
        label: 'Flights',
        mod: 'flights',
        isGold: true,
        icon: <Plane className="h-7 w-7 text-white" />,
      },
      {
        label: 'Hotels',
        mod: 'hotels',
        isGold: false,
        icon: <Building2 className="h-7 w-7 text-white" />,
      },
      {
        label: 'Visas',
        mod: 'visas',
        isGold: true,
        icon: <FileCheck2 className="h-7 w-7 text-white" />,
      },
      {
        label: 'Umrah',
        mod: 'umrah',
        isGold: false,
        icon: <Compass className="h-7 w-7 text-white" />,
      },
    ];

    const featuredPackages = [
      {
        id: 'fp-1',
        title: 'Istanbul & Türkiye',
        subtitle: 'Guided Bosporus & Historical Package',
        rating: '4.9',
        nights: '7',
        priceBadge: 'Quote on Request',
        image: './assets/images/travel-istanbul.jpg',
        targetMod: 'visas' as AppNavModule,
      },
      {
        id: 'fp-2',
        title: '14-Night Economy Umrah (LHE-JED)',
        subtitle: 'Saudia · Voco Makkah (450m) & Madinah',
        rating: '5.0',
        nights: '14',
        priceBadge: 'PKR 245,000',
        image: './assets/images/destinations-grid.jpg',
        targetMod: 'umrah' as AppNavModule,
      },
      {
        id: 'fp-3',
        title: 'Dubai Executive Visa & Stay',
        subtitle: 'Airport Transfer & Creek Consultation',
        rating: '4.8',
        nights: '5',
        priceBadge: 'Quote on Request',
        image: './assets/images/travel-istanbul.jpg',
        targetMod: 'visas' as AppNavModule,
      },
    ];

    const pendingSlips = store.payments.filter((p) => p.status === 'pending_review');
    const totalSocialLeads = store.socialConnectors.reduce(
      (acc, c) => acc + c.leadsCapturedCount,
      0,
    );

    return (
      <div className="space-y-6">
        {renderFeedbackBanner()}

        {/* Dark Navy Curved Hero Header (Reference Screen 2) */}
        <section className="rounded-[26px] bg-gradient-to-br from-[#0A192F] to-[#13294B] p-5 text-white shadow-lg sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">
                <span>Hello, </span>
                <span className="text-[#D9AD32]">{greetingTarget}</span>
              </h2>
              <p className="mt-1 text-xs font-medium text-white/75">
                {store.notifications.length} notifications await you · AL-BAHR HORIZON Cloud
              </p>
            </div>

            <button
              type="button"
              aria-label="Open notifications"
              onClick={() => store.setModule('notifications')}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
            >
              <Bell className="h-5 w-5" />
              {store.notifications.length > 0 && (
                <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-[#E5484D]" />
              )}
            </button>
          </div>

          {/* Embedded Dark Search Bar */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/60" />
            <input
              type="search"
              value={store.searchQuery}
              onChange={(e) => {
                store.searchQuery = e.target.value;
                store.notify();
              }}
              placeholder="Search flights, hotels, or visas..."
              className="min-h-11 w-full rounded-2xl border border-white/15 bg-white/12 pr-4 pl-10 text-sm text-white placeholder:text-white/55 focus-visible:ring-2 focus-visible:ring-[#D9AD32]"
            />
          </div>
        </section>

        {/* 4 Rounded Quick-Action Category Tiles (Gold & Deep Teal) */}
        <section aria-label="Quick Categories">
          <div className="grid grid-cols-4 gap-3 sm:gap-4">
            {quickCategories.map((cat) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => {
                  const target = permitted.includes(cat.mod) ? cat.mod : 'umrah';
                  store.setModule(target);
                }}
                className="group flex flex-col items-center gap-2 focus-visible:outline-none"
              >
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-[20px] shadow-md transition-transform group-hover:-translate-y-0.5 group-hover:shadow-lg sm:h-18 sm:w-18 ${
                    cat.isGold
                      ? 'bg-gradient-to-br from-[#E3BC47] to-[#B98D1E] shadow-[#D9AD32]/30'
                      : 'bg-gradient-to-br from-[#0A8C98] to-[#0A6C74] shadow-[#0A6C74]/30'
                  }`}
                >
                  {cat.icon}
                </div>
                <span className="text-xs font-extrabold text-[#0A192F]">{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Featured Packages Carousel (Reference Screen 2) */}
        <section aria-label="Featured Packages" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-[#0A192F]">Featured Packages</h3>
            <button
              type="button"
              onClick={() => store.setModule('umrah')}
              className="min-h-10 text-xs font-bold text-[#0A6C74] hover:underline"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredPackages.map((pkg) => (
              <div
                key={pkg.id}
                onClick={() => {
                  if (permitted.includes(pkg.targetMod)) {
                    store.setModule(pkg.targetMod);
                  }
                }}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl"
              >
                <div className="relative h-36 w-full overflow-hidden bg-[#0A192F]">
                  <img
                    src={pkg.image}
                    alt={pkg.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-extrabold text-[#0A192F] shadow">
                    <Star className="h-3 w-3 fill-[#D9AD32] text-[#D9AD32]" />
                    {pkg.rating}
                  </div>
                  <div className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-extrabold text-[#0A192F] shadow">
                    {pkg.nights}N
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="truncate text-sm font-extrabold text-[#0A192F]">{pkg.title}</h4>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{pkg.subtitle}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-black text-[#9A6700]">{pkg.priceBadge}</span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#D9AD32] px-2.5 py-1 text-[11px] font-extrabold text-[#0A192F]">
                      ★Verified
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Social Media Connectors Overview Strip */}
        {permitted.includes('socialMedia') && (
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-[#0A6C74]" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#0A192F]">
                    Connected Social Media Channels
                  </h3>
                  <p className="text-xs text-slate-500">
                    {totalSocialLeads} social leads captured across WhatsApp, Facebook, Instagram,
                    TikTok, YouTube, LinkedIn &amp; Telegram
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => store.setModule('socialMedia')}
                className="min-h-10 rounded-xl bg-[#0A192F] px-3.5 py-1.5 text-xs font-bold text-[#D9AD32] transition hover:bg-[#13294B]"
              >
                Manage Connectors &amp; Publish
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {store.socialConnectors.map((conn) => (
                <button
                  key={conn.id}
                  type="button"
                  onClick={() => store.setModule('socialMedia')}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#0A192F] transition hover:bg-slate-100"
                >
                  <SocialPlatformBadge platform={conn.platform} />
                  <span>{conn.handle}</span>
                  <span className="rounded-full bg-[#E8F8F0] px-1.5 py-0.5 text-[10px] font-extrabold text-[#117A4B]">
                    {conn.leadsCapturedCount} leads
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Role-Scoped Operational KPIs */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Scoped Leads</span>
            <p className="mt-1 text-2xl font-black text-[#0A192F]">{store.scopedLeads.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Active Cases</span>
            <p className="mt-1 text-2xl font-black text-[#0A192F]">{store.scopedCases.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Pending Bank Slips</span>
            <p className="mt-1 text-2xl font-black text-[#9A6700]">{pendingSlips.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className="text-xs font-bold text-slate-500">Active Bookings</span>
            <p className="mt-1 text-2xl font-black text-[#0A6C74]">
              {store.scopedBookings.length}
            </p>
          </div>
        </section>

        {/* Finance / CEO Manual Bank Verification Gate Queue */}
        {(store.currentRole === 'ceo' || store.currentRole === 'finance') &&
          pendingSlips.length > 0 && (
            <section className="rounded-2xl border border-[#D9AD32]/50 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-[#0A192F]">
                    Finance Payment Approval Queue
                  </h3>
                  <p className="text-xs text-slate-600">
                    Verify bank deposit slips against the bank statement to unlock ticket issuance.
                  </p>
                </div>
                <StatusBadge variant="warning" label={`${pendingSlips.length} Pending Review`} />
              </div>

              <div className="mt-4 space-y-3">
                {pendingSlips.map((pay) => (
                  <div
                    key={pay.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <div>
                      <p className="text-sm font-extrabold text-[#0A192F]">
                        {pay.bankName} · Ref: {pay.bankRef}
                      </p>
                      <p className="text-xs text-slate-600">
                        Amount: PKR {pay.amountPkr.toLocaleString()} · Invoice: {pay.invoiceId}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          notifyAction(
                            store.verifyOrRejectPayment({
                              paymentId: pay.id,
                              approve: true,
                              reason: 'Verified against Meezan Bank statement',
                            }),
                          )
                        }
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#117A4B] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#0d5f3a]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Verify &amp; Post Ledger
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          notifyAction(
                            store.verifyOrRejectPayment({
                              paymentId: pay.id,
                              approve: false,
                              reason: 'Bank reference mismatch',
                            }),
                          )
                        }
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#B42318] px-3 py-2 text-xs font-bold text-[#B42318]"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. MY TICKETS / BOOKINGS & MY TRIPS (Reference Screen 4 Boarding Pass Wallet)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'bookings' || store.activeModule === 'myTrips') {
    const canIssue =
      store.currentRole === 'ceo' ||
      store.currentRole === 'manager' ||
      store.currentRole === 'employee';
    const bookingsList = store.scopedBookings;

    return (
      <div className="space-y-5">
        {renderFeedbackBanner()}
        {renderTicketIssueModal()}

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-[#0A192F]">My Tickets</h2>
          <StatusBadge variant="info" label={`${bookingsList.length} Active`} />
        </div>

        {/* Segmented Tabs: My Bookings / Past Trips (Reference Screen 4) */}
        <div className="grid grid-cols-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTicketsTab('bookings')}
            className={`min-h-11 border-b-2 pb-2.5 text-center text-sm font-extrabold transition ${
              ticketsTab === 'bookings'
                ? 'border-[#0A192F] text-[#0A192F]'
                : 'border-transparent text-slate-500 hover:text-[#0A192F]'
            }`}
          >
            My Bookings
          </button>
          <button
            type="button"
            onClick={() => setTicketsTab('past')}
            className={`min-h-11 border-b-2 pb-2.5 text-center text-sm font-extrabold transition ${
              ticketsTab === 'past'
                ? 'border-[#0A192F] text-[#0A192F]'
                : 'border-transparent text-slate-500 hover:text-[#0A192F]'
            }`}
          >
            Past Trips
          </button>
        </div>

        {ticketsTab === 'past' ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-[#0A192F]">No past trips recorded</p>
            <p className="mt-1 text-xs text-slate-500">
              Completed journeys and archived e-tickets appear here after travel completion.
            </p>
          </div>
        ) : bookingsList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-bold text-[#0A192F]">No active bookings in scope</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {bookingsList.map((bk) => {
              const cust =
                store.customers.find((c) => c.id === bk.customerId)?.fullName ??
                'Tariq Mahmood';
              return (
                <BoardingPassCard
                  key={bk.id}
                  booking={bk}
                  customerName={cust}
                  canIssueTicket={canIssue}
                  onIssueTicketClick={(target) => setTicketTarget(target)}
                  onDownloadTicketClick={(target) =>
                    notifyAction({
                      ok: true,
                      message: `Signed E-Ticket PDF ready: ${target.ticketOrVoucherFile} (Ref: ${target.supplierRef})`,
                    })
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. INBOX & LEADS (Web + Social Media Lead Capture & Smart Consultant Routing)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'inbox') {
    return (
      <div className="space-y-6">
        {renderFeedbackBanner()}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-[#0A192F]">
              Capture New Inquiry / Social Media Lead
            </h2>
            <button
              type="button"
              onClick={() => store.setModule('socialMedia')}
              className="text-xs font-bold text-[#0A6C74] hover:underline"
            >
              Configure Social Webhooks →
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const res = leadPlatform
                ? store.ingestSocialLead({
                    platform: leadPlatform,
                    fullName: leadName,
                    phone: leadPhone,
                    serviceType: leadService,
                  })
                : store.createAndAssignLead({
                    fullName: leadName,
                    phone: leadPhone,
                    serviceType: leadService,
                    source: 'Direct Portal Intake',
                    consentGiven: leadConsent,
                  });
              notifyAction(res);
              if (res.ok) {
                setLeadName('');
                setLeadPhone('');
              }
            }}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-5"
          >
            <input
              type="text"
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              placeholder="Client Full Name"
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={leadPhone}
              onChange={(e) => setLeadPhone(e.target.value)}
              placeholder="+92 300 1234567"
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={leadService}
              onChange={(e) => setLeadService(e.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="umrah">Umrah Package</option>
              <option value="visa">Visa Consultation</option>
              <option value="flight">Flight Ticketing</option>
              <option value="study">Study Abroad</option>
            </select>
            <select
              value={leadPlatform}
              onChange={(e) => setLeadPlatform(e.target.value as SocialPlatform | '')}
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="whatsapp">WhatsApp Business</option>
              <option value="instagram">Instagram Direct</option>
              <option value="facebook">Facebook Lead Ads</option>
              <option value="tiktok">TikTok Lead Form</option>
              <option value="linkedin">LinkedIn Page</option>
              <option value="telegram">Telegram Channel</option>
              <option value="youtube">YouTube Inquiry</option>
              <option value="">Website / Walk-In</option>
            </select>
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-4 w-4 text-[#D9AD32]" />
              Add &amp; Assign
            </button>
          </form>
          <label className="mt-3 inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={leadConsent}
              onChange={(e) => setLeadConsent(e.target.checked)}
            />
            Customer communication opt-in verified
          </label>
        </div>

        <div className="space-y-3">
          {store.scopedLeads.map((l) => {
            const assignee =
              store.staff.find((s) => s.id === l.assignedEmployeeId)?.name ??
              'Manager Triage Queue';
            return (
              <div
                key={l.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#0A192F]">
                      {l.fullName} · {l.phone}
                    </h3>
                    {l.socialPlatform && <SocialPlatformBadge platform={l.socialPlatform} />}
                  </div>
                  <p className="text-xs text-slate-500">
                    Service: {l.serviceType.toUpperCase()} · Source: {l.source} · Consultant:{' '}
                    <span className="font-bold text-[#0A6C74]">{assignee}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    variant={l.status === 'converted' ? 'success' : 'info'}
                    label={l.status}
                  />
                  {l.status !== 'converted' && (
                    <button
                      type="button"
                      onClick={() => notifyAction(store.convertLeadToCase(l.id))}
                      className="min-h-10 rounded-xl bg-[#D9AD32] px-3.5 py-1.5 text-xs font-extrabold text-[#0A192F]"
                    >
                      Convert to Case
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. CUSTOMERS
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'customers') {
    const canSeeInternalNotes =
      store.currentRole !== 'customer' && store.currentRole !== 'partner';
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-[#0A192F]">Customer 360 Profiles</h2>
        {store.customers.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-[#0A192F]">{c.fullName}</h3>
                <p className="text-xs text-slate-500">
                  {c.phone} · {c.email}
                </p>
              </div>
              <StatusBadge
                variant={c.kycVerified ? 'success' : 'warning'}
                label={c.kycVerified ? 'KYC Verified' : 'KYC Pending'}
              />
            </div>

            {canSeeInternalNotes && c.internalNotes.length > 0 && (
              <div className="mt-3 rounded-xl border border-[#D9AD32]/40 bg-[#FFF7E0] p-3 text-xs font-semibold text-[#9A6700]">
                {c.internalNotes.map((n, i) => (
                  <p key={i}>{n}</p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 5. CASES & TASKS
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'cases') {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-extrabold text-[#0A192F]">Cases &amp; Checklists</h2>
        {store.scopedCases.map((cs) => (
          <div
            key={cs.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-[#0A6C74]">{cs.caseNumber}</span>
                <h3 className="text-base font-extrabold text-[#0A192F]">{cs.title}</h3>
              </div>
              <StatusBadge variant="info" label={cs.status} />
            </div>
            <div className="mt-3 space-y-2">
              {cs.tasks.map((tk) => (
                <label
                  key={tk.id}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={tk.completed}
                    onChange={(e) => {
                      tk.completed = e.target.checked;
                      store.notify();
                    }}
                  />
                  <span className={tk.completed ? 'line-through text-slate-400' : ''}>
                    {tk.title}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 6. FLIGHTS (Default PKR 2,000/Pax Markup & CEO Override Gate)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'flights') {
    return (
      <div className="space-y-5">
        {renderFeedbackBanner()}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#0A192F]">
            Flight Quotation &amp; Fare Markup Desk
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Standard agency markup is PKR {store.defaultFlightMarkupPkr.toLocaleString()} per
            passenger. Only CEO can override per-passenger markup.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const overrideVal = Number(flightMarkupOverride);
              const res = store.createFlightQuoteWithMarkup({
                customerId: 'cust-1',
                route: flightRoute,
                pax: flightPax,
                netFarePerPax: flightNetFare,
                overrideMarkupPerPax: Number.isNaN(overrideVal) ? undefined : overrideVal,
              });
              notifyAction(res);
            }}
            className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700">Sector / Route</label>
              <input
                type="text"
                value={flightRoute}
                onChange={(e) => setFlightRoute(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Passengers</label>
              <input
                type="number"
                value={flightPax}
                onChange={(e) => setFlightPax(Number(e.target.value))}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Supplier Net Fare / Pax (PKR)
              </label>
              <input
                type="number"
                value={flightNetFare}
                onChange={(e) => setFlightNetFare(Number(e.target.value))}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">
                Markup / Pax (PKR)
              </label>
              <input
                type="number"
                value={flightMarkupOverride}
                onChange={(e) => setFlightMarkupOverride(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="sm:col-span-4">
              <button
                type="submit"
                className="min-h-11 rounded-xl bg-[#0A192F] px-5 py-2.5 text-xs font-bold text-white"
              >
                Generate Flight Quote
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 7. UMRAH & HAJJ (Published Packages + Multi-Step Draft Customizer + Share to Social)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'umrah') {
    return (
      <div className="space-y-6">
        {renderFeedbackBanner()}

        {/* Multi-Step Umrah Customizer with Offline Autosave */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-[#0A192F]">
                Multi-Step Umrah Package Customizer
              </h2>
              <p className="text-xs text-slate-500">
                Step {store.umrahDraftStep} of 4 · Draft status:{' '}
                <span className="font-bold text-[#0A6C74]">{store.draftSyncStatus}</span>
              </p>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => store.updateUmrahDraft({ step: st })}
                  className={`h-9 w-9 rounded-xl text-xs font-extrabold ${
                    store.umrahDraftStep === st
                      ? 'bg-[#0A192F] text-[#D9AD32]'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-slate-700">Departure City</label>
              <select
                value={store.umrahDraftCity}
                onChange={(e) => store.updateUmrahDraft({ city: e.target.value })}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Lahore">Lahore (LHE)</option>
                <option value="Karachi">Karachi (KHI)</option>
                <option value="Islamabad">Islamabad (ISB)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Total Nights</label>
              <select
                value={store.umrahDraftNights}
                onChange={(e) => store.updateUmrahDraft({ nights: Number(e.target.value) })}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value={7}>7 Nights</option>
                <option value={10}>10 Nights</option>
                <option value={14}>14 Nights</option>
                <option value={21}>21 Nights</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700">Room Sharing</label>
              <select
                value={store.umrahDraftRoom}
                onChange={(e) => store.updateUmrahDraft({ room: e.target.value })}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Quad">Quad Sharing</option>
                <option value="Triple">Triple Sharing</option>
                <option value="Double">Double Room</option>
              </select>
            </div>
          </div>
        </div>

        {/* Umrah Catalog */}
        <div className="space-y-3">
          <h3 className="text-base font-extrabold text-[#0A192F]">Umrah Package Inventory</h3>
          {store.umrahPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <span className="text-xs font-extrabold text-[#0A6C74]">{pkg.pkgNo}</span>
                <h4 className="text-sm font-extrabold text-[#0A192F]">{pkg.title}</h4>
                <p className="text-xs text-slate-500">
                  {pkg.airline} · Makkah: {pkg.makkahHotel} ({pkg.makkahDistanceM}m) · Madinah:{' '}
                  {pkg.madinahHotel} ({pkg.madinahDistanceM}m) · Quad: PKR{' '}
                  {pkg.priceQuadPkr.toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge
                  variant={pkg.status === 'published' ? 'success' : 'warning'}
                  label={pkg.status}
                />
                <button
                  type="button"
                  onClick={() =>
                    notifyAction(
                      store.publishSocialPost({
                        title: `${pkg.title} (${pkg.pkgNo})`,
                        caption: `${pkg.airline} from ${pkg.departureCity} · ${pkg.makkahHotel} & ${pkg.madinahHotel} · Quad PKR ${pkg.priceQuadPkr.toLocaleString()}`,
                        platforms: ['whatsapp', 'facebook', 'instagram', 'telegram'],
                        imageUrl: './assets/images/destinations-grid.jpg',
                      }),
                    )
                  }
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0A6C74] px-3 py-1.5 text-xs font-bold text-white"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Share to Social
                </button>
                {(store.currentRole === 'ceo' || store.currentRole === 'manager') && (
                  <button
                    type="button"
                    onClick={() =>
                      notifyAction(
                        store.togglePackageStatus(
                          pkg.id,
                          pkg.status === 'published' ? 'expired' : 'published',
                        ),
                      )
                    }
                    className="min-h-10 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold"
                  >
                    {pkg.status === 'published' ? 'Expire' : 'Publish'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 8. QUOTES
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'quotes') {
    return (
      <div className="space-y-4">
        {renderFeedbackBanner()}
        <h2 className="text-xl font-extrabold text-[#0A192F]">Quotes &amp; Revisions</h2>
        {store.quotes.map((q) => (
          <div
            key={q.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <span className="text-xs font-extrabold text-[#0A6C74]">
                {q.quoteNumber} (v{q.versionNo})
              </span>
              <h3 className="text-sm font-extrabold text-[#0A192F]">{q.title}</h3>
              <p className="text-xs text-slate-600">
                Selling Price: PKR {q.sellingPricePkr.toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                variant={q.status === 'accepted' ? 'success' : 'info'}
                label={q.status}
              />
              {q.status !== 'accepted' && (
                <button
                  type="button"
                  onClick={() => notifyAction(store.acceptQuote(q.id, `idem-${q.id}`))}
                  className="min-h-10 rounded-xl bg-[#0A192F] px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  Accept &amp; Issue Invoice
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 9. INVOICES & UPLOAD BANK SLIP
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'invoices') {
    return (
      <div className="space-y-5">
        {renderFeedbackBanner()}
        <h2 className="text-xl font-extrabold text-[#0A192F]">Invoices</h2>
        {store.scopedInvoices.map((inv) => (
          <div
            key={inv.id}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold text-[#0A6C74]">
                  {inv.invoiceNumber}
                </span>
                <h3 className="text-base font-extrabold text-[#0A192F]">
                  Total: PKR {inv.totalPkr.toLocaleString()} · Verified Paid: PKR{' '}
                  {inv.verifiedPaidPkr.toLocaleString()}
                </h3>
              </div>
              <StatusBadge
                variant={inv.status === 'paid' ? 'success' : 'warning'}
                label={inv.status}
              />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const res = store.uploadBankSlip({
                  invoiceId: inv.id,
                  amountPkr: Number(slipAmount),
                  bankName: slipBank,
                  bankRef: slipRef,
                });
                notifyAction(res);
                if (res.ok) setSlipRef('');
              }}
              className="grid grid-cols-1 gap-2.5 border-t border-slate-100 pt-3 sm:grid-cols-4"
            >
              <input
                type="number"
                value={slipAmount}
                onChange={(e) => setSlipAmount(e.target.value)}
                placeholder="Amount PKR"
                className="min-h-10 rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                value={slipBank}
                onChange={(e) => setSlipBank(e.target.value)}
                placeholder="Bank Name"
                className="min-h-10 rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
              />
              <input
                type="text"
                value={slipRef}
                onChange={(e) => setSlipRef(e.target.value)}
                placeholder="Bank Deposit Reference"
                className="min-h-10 rounded-xl border border-slate-300 px-3 py-1.5 text-xs"
              />
              <button
                type="submit"
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[#0A192F] px-3 py-1.5 text-xs font-bold text-white"
              >
                <Upload className="h-3.5 w-3.5 text-[#D9AD32]" />
                Upload Bank Slip
              </button>
            </form>
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 10. PAYMENTS (Manual Finance Review Gate)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'payments') {
    return (
      <div className="space-y-4">
        {renderFeedbackBanner()}
        <h2 className="text-xl font-extrabold text-[#0A192F]">
          Payment Evidence &amp; Finance Verification
        </h2>
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <label className="block text-xs font-bold text-slate-600">
            Mandatory Rejection Note (if rejecting a slip):
          </label>
          <input
            type="text"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
          />
        </div>
        {store.payments.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <h3 className="text-sm font-extrabold text-[#0A192F]">
                {p.bankName} · Ref: {p.bankRef}
              </h3>
              <p className="text-xs text-slate-600">
                PKR {p.amountPkr.toLocaleString()} · Invoice: {p.invoiceId}
              </p>
              {p.reviewReason && (
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  Review Note: {p.reviewReason}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge
                variant={
                  p.status === 'verified'
                    ? 'success'
                    : p.status === 'rejected'
                      ? 'error'
                      : 'warning'
                }
                label={p.status}
              />
              {p.status === 'pending_review' && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      notifyAction(
                        store.verifyOrRejectPayment({
                          paymentId: p.id,
                          approve: true,
                          reason: 'Verified against bank statement',
                        }),
                      )
                    }
                    className="min-h-10 rounded-xl bg-[#117A4B] px-3 py-1.5 text-xs font-bold text-white"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      notifyAction(
                        store.verifyOrRejectPayment({
                          paymentId: p.id,
                          approve: false,
                          reason: rejectReason,
                        }),
                      )
                    }
                    className="min-h-10 rounded-xl border border-[#B42318] px-3 py-1.5 text-xs font-bold text-[#B42318]"
                  >
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 11. LEDGER (Append-Only Double Entry)
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#0A192F]">
          Double-Entry Financial Ledger
        </h2>
        <StatusBadge variant="info" label="Append-Only" />
      </div>
      <div className="space-y-2.5">
        {store.ledger.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-[#0A6C74]" />
              <div>
                <p className="text-sm font-extrabold text-[#0A192F]">{row.account}</p>
                <p className="text-xs text-slate-500">Reference: {row.ref}</p>
              </div>
            </div>
            <span className="text-sm font-black text-[#0A192F]">{row.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
