import React, { useState } from 'react';
import { useHorizonStore } from '../core/StoreContext.tsx';
import { ALL_ROLES, MODULE_TITLES, PERMITTED_MODULES, ROLE_TITLES } from '../core/models.ts';
import type { OsRole, SocialConnectorRecord, SocialPlatform } from '../core/models.ts';
import { SocialPlatformBadge, StatusBadge } from '../components/BrandWidgets.tsx';
import {
  Briefcase,
  ChevronRight,
  CreditCard,
  ExternalLink,
  GraduationCap,
  MessageCircle,
  PauseCircle,
  PhoneCall,
  PlayCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Settings2,
  Share2,
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

  // Social Connector Configuration Modal
  const [editingConnector, setEditingConnector] = useState<SocialConnectorRecord | null>(null);
  const [connHandle, setConnHandle] = useState('');
  const [connAccountId, setConnAccountId] = useState('');
  const [connToken, setConnToken] = useState('');
  const [connAutoLeads, setConnAutoLeads] = useState(true);
  const [connAutoPublish, setConnAutoPublish] = useState(true);

  // Social Multi-Platform Publisher state
  const [postTitle, setPostTitle] = useState('14-Night Umrah & Istanbul Executive Offers');
  const [postCaption, setPostCaption] = useState(
    'Direct Saudia & Turkish Airlines departures from Lahore, Karachi & Islamabad. Instant WhatsApp consultation and verified e-ticketing.',
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>([
    'whatsapp',
    'facebook',
    'instagram',
    'tiktok',
    'telegram',
  ]);

  // Quick Social Lead Simulator Modal
  const [leadSimPlatform, setLeadSimPlatform] = useState<SocialPlatform | null>(null);
  const [simLeadName, setSimLeadName] = useState('');
  const [simLeadPhone, setSimLeadPhone] = useState('');
  const [simLeadService, setSimLeadService] = useState('umrah');
  const [simLeadMsg, setSimLeadMsg] = useState('');

  // Staff Invite form
  const [invName, setInvName] = useState('');
  const [invEmail, setInvEmail] = useState('');
  const [invRole, setInvRole] = useState<OsRole>('employee');

  // Chat input
  const [chatText, setChatText] = useState('');
  const [chatChannel, setChatChannel] = useState('WHATSAPP');

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

  const toggleTargetPlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  // ---------------------------------------------------------------------------
  // 1. SOCIAL MEDIA CONNECTORS & OMNICHANNEL HUB ('socialMedia' or 'integrations')
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'socialMedia' || store.activeModule === 'integrations') {
    const totalSocialLeads = store.socialConnectors.reduce(
      (sum, c) => sum + c.leadsCapturedCount,
      0,
    );
    const totalMessages = store.socialConnectors.reduce(
      (sum, c) => sum + c.messagesSyncedCount,
      0,
    );

    return (
      <div className="space-y-6">
        {renderBanner()}

        {/* Header & Omnichannel Summary */}
        <div className="rounded-2xl bg-gradient-to-r from-[#0A192F] to-[#13294B] p-6 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D9AD32]/20 px-3 py-1 text-xs font-bold text-[#D9AD32]">
                <Share2 className="h-3.5 w-3.5" /> Omnichannel Social Media Hub
              </span>
              <h2 className="mt-2 text-2xl font-black">
                Social Media Connectors &amp; Lead Webhooks
              </h2>
              <p className="mt-1 text-xs text-white/75">
                Connect WhatsApp Business Cloud API, Facebook Lead Ads, Instagram Direct, TikTok,
                YouTube, LinkedIn, and Telegram directly to AL-BAHR HORIZON.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
                <span className="block text-[11px] text-white/70">Social Leads Captured</span>
                <span className="text-xl font-black text-[#D9AD32]">{totalSocialLeads}</span>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-center">
                <span className="block text-[11px] text-white/70">Messages Synced</span>
                <span className="text-xl font-black text-white">{totalMessages}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 7 Social Media Connector Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {store.socialConnectors.map((conn) => (
            <div
              key={conn.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <SocialPlatformBadge platform={conn.platform} />
                    <div>
                      <h3 className="text-sm font-extrabold text-[#0A192F]">{conn.name}</h3>
                      <p className="text-xs font-semibold text-[#0A6C74]">{conn.handle}</p>
                    </div>
                  </div>
                  <StatusBadge
                    variant={conn.connected ? 'success' : 'warning'}
                    label={conn.connected ? 'Connected' : 'Paused'}
                  />
                </div>

                <div className="mt-3.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
                  <div className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-slate-400">
                      ACCOUNT / ID
                    </span>
                    <span className="block truncate font-mono font-bold text-[#0A192F]">
                      {conn.accountOrPageId}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-slate-400">
                      LEADS CAPTURED
                    </span>
                    <span className="block truncate font-extrabold text-[#117A4B]">
                      {conn.leadsCapturedCount} Leads
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="block truncate text-[10px] font-bold text-slate-400">
                      LAST SYNC
                    </span>
                    <span className="block truncate font-bold text-slate-700">
                      {conn.lastSyncedAt}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 truncate text-[11px] text-slate-500">
                  Webhook: <code className="font-mono text-slate-700">{conn.webhookUrl}</code>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => notify(store.testSocialConnector(conn.platform))}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0A192F] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#13294B]"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-[#D9AD32]" />
                  Test Ping
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLeadSimPlatform(conn.platform);
                    setSimLeadName('');
                    setSimLeadPhone('');
                    setSimLeadMsg('');
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#D9AD32] px-3 py-1.5 text-xs font-extrabold text-[#0A192F] transition hover:bg-[#c89d28]"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Capture Lead
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingConnector(conn);
                    setConnHandle(conn.handle);
                    setConnAccountId(conn.accountOrPageId);
                    setConnToken('');
                    setConnAutoLeads(conn.autoCaptureLeads);
                    setConnAutoPublish(conn.autoPublishPackages);
                  }}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#0A192F] hover:bg-slate-50"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  API Setup
                </button>

                <button
                  type="button"
                  onClick={() => notify(store.toggleSocialConnector(conn.platform))}
                  className="min-h-10 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {conn.connected ? 'Pause' : 'Connect'}
                </button>

                <a
                  href={conn.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex min-h-10 items-center gap-1 text-xs font-bold text-[#0A6C74] hover:underline"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Multi-Platform Social Post & Offer Publisher */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-extrabold text-[#0A192F]">
            Multi-Platform Travel &amp; Visa Offer Publisher
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Publish Umrah packages, Istanbul tours, and visa updates simultaneously across your
            connected social media channels.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              notify(
                store.publishSocialPost({
                  title: postTitle,
                  caption: postCaption,
                  platforms: selectedPlatforms,
                }),
              );
            }}
            className="mt-4 space-y-3"
          >
            <div>
              <label className="block text-xs font-bold text-slate-700">Campaign / Post Title</label>
              <input
                type="text"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">
                Post Caption &amp; Call-To-Action
              </label>
              <textarea
                rows={3}
                value={postCaption}
                onChange={(e) => setPostCaption(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 p-3 text-sm"
              />
            </div>

            <div>
              <span className="block text-xs font-bold text-slate-700">
                Select Target Social Channels:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {store.socialConnectors.map((c) => {
                  const active = selectedPlatforms.includes(c.platform);
                  return (
                    <button
                      key={c.platform}
                      type="button"
                      onClick={() => toggleTargetPlatform(c.platform)}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? 'border-[#0A192F] bg-[#0A192F] text-[#D9AD32]'
                          : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        readOnly
                        className="pointer-events-none"
                      />
                      {c.name.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0A192F] px-5 py-2.5 text-xs font-extrabold text-[#D9AD32] shadow-sm transition hover:bg-[#13294B]"
            >
              <Share2 className="h-4 w-4" />
              Publish Across Selected Social Networks
            </button>
          </form>

          {/* Published Social Posts Feed */}
          <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
            <h4 className="text-sm font-extrabold text-[#0A192F]">
              Published Social Campaigns &amp; Live Analytics
            </h4>
            {store.socialPosts.map((sp) => (
              <div
                key={sp.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="max-w-xl space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {sp.platforms.map((p) => (
                      <SocialPlatformBadge key={p} platform={p} />
                    ))}
                    <span className="text-[11px] font-semibold text-slate-400">
                      · {sp.publishedAt}
                    </span>
                  </div>
                  <h5 className="text-sm font-extrabold text-[#0A192F]">{sp.title}</h5>
                  <p className="text-xs text-slate-600">{sp.caption}</p>
                </div>

                <div className="flex gap-4 text-center text-xs">
                  <div>
                    <span className="block font-black text-[#0A192F]">
                      {sp.reachCount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500">Reach</span>
                  </div>
                  <div>
                    <span className="block font-black text-[#0A6C74]">{sp.clicksCount}</span>
                    <span className="text-[10px] text-slate-500">Clicks</span>
                  </div>
                  <div>
                    <span className="block font-black text-[#117A4B]">{sp.leadsGenerated}</span>
                    <span className="text-[10px] text-slate-500">Leads</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configure Social Connector API Modal */}
        {editingConnector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-base font-extrabold text-[#0A192F]">
                Configure {editingConnector.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Webhook Endpoint: <code className="font-mono">{editingConnector.webhookUrl}</code>
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Account Handle / Business Phone
                  </label>
                  <input
                    type="text"
                    value={connHandle}
                    onChange={(e) => setConnHandle(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Page ID / Business Account ID
                  </label>
                  <input
                    type="text"
                    value={connAccountId}
                    onChange={(e) => setConnAccountId(e.target.value)}
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    API Access Token (Current: {editingConnector.accessTokenMasked})
                  </label>
                  <input
                    type="password"
                    value={connToken}
                    onChange={(e) => setConnToken(e.target.value)}
                    placeholder="Paste new API Access Token..."
                    className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={connAutoLeads}
                    onChange={(e) => setConnAutoLeads(e.target.checked)}
                  />
                  Auto-capture incoming DMs &amp; Lead Forms into Inbox &amp; Leads
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={connAutoPublish}
                    onChange={(e) => setConnAutoPublish(e.target.checked)}
                  />
                  Enable 1-click Umrah &amp; Visa Package Publishing
                </label>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingConnector(null)}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = store.configureSocialConnector({
                      platform: editingConnector.platform,
                      handle: connHandle,
                      accountOrPageId: connAccountId,
                      accessToken: connToken,
                      autoCaptureLeads: connAutoLeads,
                      autoPublishPackages: connAutoPublish,
                    });
                    notify(res);
                    setEditingConnector(null);
                  }}
                  className="min-h-11 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
                >
                  Save &amp; Verify Webhook
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Capture Social Lead Modal */}
        {leadSimPlatform && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center gap-2">
                <SocialPlatformBadge platform={leadSimPlatform} />
                <h3 className="text-base font-extrabold text-[#0A192F]">
                  Capture Incoming Social Media Lead
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-600">
                Ingests lead into Inbox &amp; Leads, syncs chat message, and assigns the
                least-loaded available consultant.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  value={simLeadName}
                  onChange={(e) => setSimLeadName(e.target.value)}
                  placeholder="Customer Full Name (e.g. Omar Farooq)"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <input
                  type="text"
                  value={simLeadPhone}
                  onChange={(e) => setSimLeadPhone(e.target.value)}
                  placeholder="Phone / WhatsApp (+92 300 ...)"
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <select
                  value={simLeadService}
                  onChange={(e) => setSimLeadService(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="umrah">Umrah Package</option>
                  <option value="visa">Visa Consultation</option>
                  <option value="flight">Flight Booking</option>
                  <option value="study">Study Abroad</option>
                </select>
                <input
                  type="text"
                  value={simLeadMsg}
                  onChange={(e) => setSimLeadMsg(e.target.value)}
                  placeholder="Incoming DM / Inquiry message..."
                  className="min-h-11 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLeadSimPlatform(null)}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const res = store.ingestSocialLead({
                      platform: leadSimPlatform,
                      fullName: simLeadName.trim() || 'Omar Farooq (Social Lead)',
                      phone: simLeadPhone.trim() || '+92 300 5544332',
                      serviceType: simLeadService,
                      inquiryText:
                        simLeadMsg.trim() ||
                        `Interested in ${simLeadService.toUpperCase()} package details.`,
                    });
                    notify(res);
                    setLeadSimPlatform(null);
                  }}
                  className="min-h-11 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
                >
                  Ingest &amp; Auto-Assign Lead
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. VISA & CONSULTATION + MEET OUR EXPERTS (Reference Screen 3)
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
            Embassy checklists, appointment assistance &amp; specialist visa consultation.
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
                Assigns your inquiry immediately to an available specialist consultant.
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
                  placeholder="Phone / WhatsApp (+92 300 ...)"
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
                      phone: consultPhone.trim() || '+92 300 8442100',
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
  // 3. EMPLOYEES & HR (One-Time Invite Generator + Workload & Leave)
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
            Staff Directory &amp; Active Lead Workload
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
  // 4. WORKFLOW RULES STUDIO (Automated Routing + CEO Pause)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'rulesStudio') {
    return (
      <div className="space-y-5">
        {renderBanner()}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-extrabold text-[#0A192F]">
              Workflow Automation &amp; Lead Routing Rules
            </h2>
            <p className="text-xs text-slate-600">
              Automatically assigns incoming website and social media leads to the least-loaded
              specialist consultant.
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
                Resume Auto-Routing
              </>
            ) : (
              <>
                <PauseCircle className="h-4 w-4" />
                Pause Auto-Routing
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
  // 5. SUPPORT DESK (Call + Live WhatsApp Business Chat)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'support') {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#0A192F]">{t('support_center')}</h2>
          <p className="mt-1 text-xs text-slate-600">
            Direct 24/7 traveler &amp; B2B partner support via phone, WhatsApp Business Cloud, and
            portal ticket desk.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`tel:${store.whatsappBusinessNumber}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
            >
              <PhoneCall className="h-4 w-4 text-[#D9AD32]" />
              {t('call_support')}
            </a>
            <a
              href="https://wa.me/923008442100"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#117A4B] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#0d5f3a]"
            >
              <MessageCircle className="h-4 w-4" />
              {t('whatsapp_support')} (+92 300 8442100)
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 6. OMNICHANNEL CHAT (WhatsApp, Instagram DM, Facebook Messenger & Portal)
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'chat') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-extrabold text-[#0A192F]">
            Omnichannel Social &amp; Case Inbox
          </h2>
          <a
            href="https://wa.me/923008442100"
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#117A4B] px-3.5 py-1.5 text-xs font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Open WhatsApp Business Web
          </a>
        </div>

        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {store.chatMessages.map((m, i) => (
            <div key={i} className="rounded-xl bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#0A6C74]">{m.sender}</span>
                {m.channel && (
                  <span className="rounded-full bg-[#0A192F] px-2 py-0.5 text-[10px] font-bold text-[#D9AD32]">
                    {m.channel}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[#0A192F]">{m.body}</p>
            </div>
          ))}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!chatText.trim()) return;
              store.chatMessages.push({
                sender: store.currentUserName,
                channel: chatChannel,
                body: chatText.trim(),
              });
              setChatText('');
              store.notify();
            }}
            className="flex flex-wrap gap-2 pt-2"
          >
            <select
              value={chatChannel}
              onChange={(e) => setChatChannel(e.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold"
            >
              <option value="WHATSAPP">WhatsApp Reply</option>
              <option value="INSTAGRAM">Instagram DM</option>
              <option value="FACEBOOK">Facebook Messenger</option>
              <option value="PORTAL">Portal Note</option>
            </select>
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Reply to customer across WhatsApp / Instagram / Portal..."
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
  // 7. LANGUAGES (English LTR / Urdu RTL Switcher)
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
  // 8. ACTIVITY & AUDIT LOG
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'activityAudit') {
    return (
      <div className="space-y-3">
        <h2 className="text-xl font-extrabold text-[#0A192F]">Activity &amp; Security Audit Log</h2>
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
            <StatusBadge variant="neutral" label="Logged" />
          </div>
        ))}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 9. SETTINGS
  // ---------------------------------------------------------------------------
  if (store.activeModule === 'settings') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-extrabold text-[#0A192F]">
            Company Profile, Social API &amp; Server Settings
          </h2>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="font-bold text-[#0A192F]">
                WhatsApp Business Cloud API ({store.whatsappBusinessNumber})
              </span>
              <StatusBadge variant="success" label="Connected & Verified" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <span className="font-bold text-[#0A192F]">
                Connected Social Platforms (Meta, TikTok, YouTube, LinkedIn, Telegram)
              </span>
              <button
                type="button"
                onClick={() => store.setModule('socialMedia')}
                className="font-extrabold text-[#0A6C74] hover:underline"
              >
                Open Social Media Connectors →
              </button>
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
  // 10. OTHER OPERATIONAL MODULES
  // ---------------------------------------------------------------------------
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-extrabold text-[#0A192F]">
          {MODULE_TITLES[store.activeModule]}
        </h2>
        <StatusBadge variant="success" label="Active" />
      </div>
      <p className="mt-2 text-xs text-slate-600">
        AL-BAHR HORIZON workspace module for {MODULE_TITLES[store.activeModule]} with role-based
        access control and real-time social media lead integration.
      </p>
    </div>
  );
};
