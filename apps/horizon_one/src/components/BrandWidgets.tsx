import React from 'react';
import type { BookingRecord } from '../core/models.ts';

export const BrandWordmark: React.FC<{
  compact?: boolean;
  onDark?: boolean;
  showAssetPendingBadge?: boolean;
}> = ({ compact = false, onDark = false, showAssetPendingBadge = true }) => {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-2.5">
        <div
          className={`flex items-center justify-center rounded-xl border border-[#D9AD32] bg-[#0A192F] font-extrabold text-[#D9AD32] shadow-sm ${
            compact ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm'
          }`}
          aria-label="AL-BAHR HORIZON"
        >
          AB
        </div>
        <div className="flex flex-col leading-tight">
          <span
            className={`font-extrabold tracking-wide ${
              compact ? 'text-sm' : 'text-base'
            } ${onDark ? 'text-white' : 'text-[#0A192F]'}`}
          >
            HORIZON ONE
          </span>
          <span className="text-[11px] font-bold tracking-wider text-[#D9AD32]">
            AL-BAHR HORIZON
          </span>
        </div>
      </div>
      {showAssetPendingBadge && !compact && (
        <span className="inline-flex items-center rounded-md border border-[#D9AD32]/50 bg-[#D9AD32]/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-[#D9AD32]">
          OFFICIAL LOGO ASSET PENDING
        </span>
      )}
    </div>
  );
};

export const OrbitalLoader: React.FC<{ size?: number }> = ({ size = 76 }) => {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading workspace"
    >
      <div className="absolute inset-0 rounded-full border-2 border-[#0A8C98]/30 shadow-[0_0_24px_rgba(10,140,152,0.55)]" />
      <svg
        className="h-full w-full animate-spin"
        viewBox="0 0 100 100"
        style={{ animationDuration: '2.2s' }}
      >
        <defs>
          <linearGradient id="orbitalTealGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#26C6DA" />
            <stop offset="65%" stopColor="#0A8C98" />
            <stop offset="100%" stopColor="#D9AD32" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="url(#orbitalTealGold)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="175 90"
        />
      </svg>
      <div className="h-3 w-3 rounded-full bg-[#26C6DA] shadow-[0_0_12px_#26C6DA]" />
    </div>
  );
};

export const StatusBadge: React.FC<{
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  label: string;
}> = ({ variant, label }) => {
  const styles: Record<string, string> = {
    success: 'bg-[#E8F8F0] text-[#117A4B] border-[#117A4B]/20',
    warning: 'bg-[#FFF7E0] text-[#9A6700] border-[#D9AD32]/40',
    error: 'bg-[#FDECEC] text-[#B42318] border-[#B42318]/20',
    info: 'bg-[#E6F4F6] text-[#0A6C74] border-[#0A8C98]/25',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${styles[variant]}`}
    >
      {label}
    </span>
  );
};

export const DeterministicBarcodeSvg: React.FC<{ seed: string }> = ({ seed }) => {
  const bars: Array<{ x: number; w: number }> = [];
  let cursor = 4;
  for (let i = 0; i < 42; i++) {
    const code = seed.charCodeAt(i % seed.length) + i * 17;
    const w = code % 3 === 0 ? 4 : code % 2 === 0 ? 2.5 : 1.5;
    const gap = code % 2 === 0 ? 2.5 : 1.8;
    if (cursor + w < 294) {
      bars.push({ x: cursor, w });
    }
    cursor += w + gap;
  }

  return (
    <svg
      viewBox="0 0 300 50"
      className="h-12 w-full"
      role="img"
      aria-label={`Deterministic boarding pass barcode for ${seed}`}
    >
      {bars.map((b, idx) => (
        <rect key={idx} x={b.x} y={2} width={b.w} height={46} fill="#0A192F" rx={0.5} />
      ))}
    </svg>
  );
};

export const BoardingPassCard: React.FC<{
  booking: BookingRecord;
  customerName: string;
  canIssueTicket: boolean;
  onIssueTicketClick?: (booking: BookingRecord) => void;
  onDownloadTicketClick?: (booking: BookingRecord) => void;
}> = ({
  booking,
  customerName,
  canIssueTicket,
  onIssueTicketClick,
  onDownloadTicketClick,
}) => {
  const issued = booking.status === 'documents_issued';
  const barcodeSeed = `${booking.bookingNumber}-${booking.supplierRef ?? 'PENDING'}`;

  return (
    <div className="relative w-full max-w-[420px] overflow-hidden rounded-[20px] bg-[#0A192F] text-white shadow-lg transition-shadow hover:shadow-xl">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#D9AD32] bg-[#13294B] text-[11px] font-extrabold text-[#D9AD32]">
            AB
          </div>
          <span className="truncate text-xs font-bold text-white sm:text-[13px]">
            E-Ticket / Boarding Pass
          </span>
        </div>
        {issued ? (
          <StatusBadge variant="success" label="Verified" />
        ) : (
          <StatusBadge variant="warning" label="Pending Payment" />
        )}
      </div>

      {/* Gold gradient divider strip (Reference Screen 4) */}
      <div
        className="h-3.5 w-full"
        style={{
          background: 'linear-gradient(90deg, #9F7918 0%, #D9AD32 50%, #E7C766 100%)',
        }}
      />

      {/* Route & Passenger Details */}
      <div className="px-5 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <span className="text-3xl font-black tracking-wider text-white">LHE</span>
          <span className="text-sm font-medium text-white/70">to</span>
          <span className="text-3xl font-black tracking-wider text-white">JED</span>
        </div>
        <p className="mt-1.5 text-xs text-white/70">{booking.title}</p>

        <div className="mt-3.5">
          <span className="block text-[11px] text-white/55">Passenger</span>
          <span className="text-[15px] font-bold text-white">{customerName}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 border-t border-dashed border-white/15 pt-3">
          <div className="min-w-0">
            <span className="block text-[11px] text-white/55">Supplier PNR / Ref</span>
            <span className="block truncate text-[13px] font-bold text-[#D9AD32]">
              {booking.supplierRef ?? 'Pending Verify'}
            </span>
          </div>
          <div className="min-w-0 text-right">
            <span className="block text-[11px] text-white/55">Booking ID</span>
            <span className="block truncate text-[13px] font-bold text-white">
              {booking.bookingNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Side Circular Cutout Notches */}
      <div className="relative bg-white px-5 pt-3.5 pb-4 text-[#0A192F]">
        <div
          className="pointer-events-none absolute -top-3 -left-3 h-6 w-6 rounded-full bg-[#F6F8FB] shadow-inner"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-3 -right-3 h-6 w-6 rounded-full bg-[#F6F8FB] shadow-inner"
          aria-hidden="true"
        />

        <DeterministicBarcodeSvg seed={barcodeSeed} />

        {issued ? (
          <button
            type="button"
            onClick={() => onDownloadTicketClick?.(booking)}
            className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#D9AD32] px-4 py-2 text-xs font-extrabold text-[#0A192F] transition hover:bg-[#c89d28] focus-visible:ring-2 focus-visible:ring-[#0A192F] focus-visible:ring-offset-2"
          >
            Download Signed E-Ticket PDF ({booking.ticketOrVoucherFile})
          </button>
        ) : canIssueTicket ? (
          <button
            type="button"
            onClick={() => onIssueTicketClick?.(booking)}
            className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0A192F] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#13294B] focus-visible:ring-2 focus-visible:ring-[#0A192F] focus-visible:ring-offset-2"
          >
            Issue Verified Ticket / Upload Voucher
          </button>
        ) : (
          <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
            E-Ticket PDF unlocks automatically once Finance verifies payment &amp; PNR.
          </p>
        )}
      </div>
    </div>
  );
};
