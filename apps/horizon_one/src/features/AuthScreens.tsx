import React, { useState } from 'react';
import { useHorizonStore } from '../core/StoreContext.tsx';
import { ALL_ROLES, ROLE_DEFAULT_EMAILS, ROLE_TITLES } from '../core/models.ts';
import type { OsRole } from '../core/models.ts';
import { AlBahrCrestSvg, BrandWordmark, OrbitalLoader } from '../components/BrandWidgets.tsx';
import { Globe, KeyRound, Sparkles, UserCheck } from 'lucide-react';

export const SplashScreen: React.FC = () => {
  const { store, t } = useHorizonStore();

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#0A192F] px-6 py-10 text-white"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(10,25,47,0.52) 0%, rgba(10,25,47,0.82) 100%), url('./assets/images/travel-istanbul.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Centered Frosted Glassmorphic Card (Reference Screen 1) */}
      <div className="w-full max-w-[340px] rounded-[28px] border border-white/30 bg-white/14 px-7 py-9 text-center shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#D9AD32] bg-[#0A192F]/85 p-3 shadow-[0_10px_28px_rgba(217,173,50,0.35)]">
          <AlBahrCrestSvg className="h-full w-full" />
        </div>

        <h1 className="mt-4 text-3xl font-black tracking-wider text-white">AL-BAHR</h1>
        <p className="mt-1 text-xs font-extrabold tracking-widest text-white/95">
          HORIZON TRAVELS
        </p>
        <p className="mt-0.5 text-xs font-bold tracking-widest text-[#D9AD32]">
          &amp; CONSULTANTS
        </p>
      </div>

      {/* Teal / Gold Orbital Loader Below Card */}
      <div className="mt-8 flex flex-col items-center">
        <OrbitalLoader size={74} />
        <p className="mt-4 text-sm font-semibold tracking-wide text-white/95">
          {t('loading_workspace')}
        </p>

        <button
          type="button"
          onClick={() => store.skipSplash()}
          className="mt-5 min-h-11 rounded-full border border-white/35 bg-white/10 px-6 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-[#D9AD32]"
        >
          {t('skip_animation')}
        </button>
      </div>
    </div>
  );
};

export const LoginScreen: React.FC = () => {
  const { store, t } = useHorizonStore();
  const [selectedRole, setSelectedRole] = useState<OsRole>(store.currentRole);
  const [email, setEmail] = useState(ROLE_DEFAULT_EMAILS[store.currentRole]);
  const [password, setPassword] = useState('AlBahrHorizon#2026');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');

  const handleRoleChange = (role: OsRole) => {
    setSelectedRole(role);
    setEmail(ROLE_DEFAULT_EMAILS[role]);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await store.signIn({
      email,
      password,
      role: selectedRole,
    });
    if (!res.ok) {
      setFeedback(res.message);
    }
  };

  const handleRedeemInvite = (e: React.FormEvent) => {
    e.preventDefault();
    const res = store.redeemInviteToken(inviteToken, invitePassword);
    setFeedback(res.message);
    if (res.ok) {
      setShowInviteModal(false);
      setInviteToken('');
      setInvitePassword('');
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F6F8FB] lg:flex-row">
      {/* Left Desktop Brand Hero */}
      <div
        className="relative hidden flex-col justify-between bg-[#0A192F] p-12 text-white lg:flex lg:w-5/12"
        style={{
          backgroundImage: `linear-gradient(160deg, rgba(10,25,47,0.88) 0%, rgba(10,108,116,0.78) 100%), url('./assets/images/travel-istanbul.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <BrandWordmark onDark />

        <div className="my-auto max-w-md space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D9AD32]/50 bg-[#D9AD32]/15 px-3 py-1 text-xs font-bold text-[#D9AD32]">
            <Globe className="h-3.5 w-3.5" /> Connected Travel, Visa &amp; Social Media OS
          </span>
          <h1 className="text-3xl font-black leading-tight text-white">
            Flights, Umrah, Visa Consultation &amp; Social Media Lead Hub
          </h1>
          <p className="text-sm leading-relaxed text-white/80">
            Unified portal for AL-BAHR HORIZON TRAVELS &amp; CONSULTANTS with live WhatsApp
            Business, Facebook, Instagram, TikTok, YouTube, LinkedIn, and Telegram connectors.
          </p>
        </div>

        <div className="text-xs text-white/60">
          Official Website: <span className="text-[#D9AD32]">www.albahrtravels.com</span>
        </div>
      </div>

      {/* Right Sign-In Form */}
      <div className="flex flex-1 flex-col justify-center px-5 py-8 sm:px-10">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between">
            <BrandWordmark />
            <button
              type="button"
              onClick={() => store.setLocale(store.locale === 'en' ? 'ur' : 'en')}
              className="min-h-11 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-[#0A192F] transition hover:bg-slate-100"
            >
              {store.locale === 'en' ? 'اردو (RTL)' : 'English'}
            </button>
          </div>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label
                htmlFor="portal-role-select"
                className="block text-xs font-bold uppercase tracking-wider text-slate-600"
              >
                Select Portal Account / Role
              </label>
              <select
                id="portal-role-select"
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value as OsRole)}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-[#0A192F] focus-visible:ring-2 focus-visible:ring-[#0A8C98]"
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_TITLES[r]} ({ROLE_DEFAULT_EMAILS[r]})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-bold text-slate-700"
              >
                {t('email')}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@albahrtravels.com"
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0A8C98]"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-bold text-slate-700"
              >
                {t('password')}
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#0A8C98]"
              />
            </div>

            {feedback && (
              <div
                role="alert"
                className="rounded-xl border border-[#D9AD32] bg-[#FFF7E0] p-3 text-xs font-semibold text-[#9A6700]"
              >
                {feedback}
              </div>
            )}

            <button
              type="submit"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#0A192F] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#13294B] focus-visible:ring-2 focus-visible:ring-[#D9AD32]"
            >
              <UserCheck className="h-4 w-4 text-[#D9AD32]" />
              {t('sign_in')}
            </button>
          </form>

          {/* Quick Action Footer Links */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="min-h-11 inline-flex items-center gap-1 text-[#0A6C74] hover:underline"
            >
              <KeyRound className="h-3.5 w-3.5" />
              {t('activate_invite')}
            </button>

            <button
              type="button"
              onClick={() => store.showSplashPreview()}
              className="min-h-11 inline-flex items-center gap-1 text-[#0A192F] hover:underline"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#D9AD32]" />
              Preview Splash
            </button>

            <button
              type="button"
              onClick={() => setShowForgotModal(true)}
              className="min-h-11 text-slate-500 hover:underline"
            >
              {t('forgot_password')}
            </button>
          </div>
        </div>
      </div>

      {/* Activate Employee Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-extrabold text-[#0A192F]">{t('activate_invite')}</h2>
            <p className="mt-1 text-xs text-slate-600">
              Enter your single-use 48-hour invitation token issued by CEO/Manager.
            </p>
            <form onSubmit={handleRedeemInvite} className="mt-4 space-y-3">
              <input
                type="text"
                value={inviteToken}
                onChange={(e) => setInviteToken(e.target.value)}
                placeholder="ALBAHR-INV-..."
                aria-label="Invite Token"
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
              <input
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="New password (min 10 chars)"
                aria-label="New Password"
                className="min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
                >
                  Redeem &amp; Activate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-extrabold text-[#0A192F]">Password Recovery</h2>
            <p className="mt-1 text-xs text-slate-600">
              Enter your registered work or customer email to request a time-bound reset link.
            </p>
            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              placeholder="email@albahrtravels.com"
              className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setFeedback('If the account exists, a recovery link has been sent.');
                  setShowForgotModal(false);
                }}
                className="min-h-11 rounded-xl bg-[#0A192F] px-4 py-2 text-xs font-bold text-white"
              >
                Send Recovery Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
