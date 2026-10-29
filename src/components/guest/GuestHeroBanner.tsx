import React, { useState } from 'react';
import { formatPropertyTime, useNow } from '../../lib/time';
import { DEFAULT_COVER_IMAGE_URL } from '../../lib/config';

interface GuestHeroBannerProps {
  propertyName: string;
  city?: string;
  timezone?: string;
  houseName: string;
  houseTypeLabel?: string;
  checkOutDate?: string | null;
  guestTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | '';
  guestName?: string;
  photoUrl?: string;
  fallbackPhotoUrl?: string;
}

export const GuestHeroBanner: React.FC<GuestHeroBannerProps> = ({
  propertyName,
  city = 'Lusaka',
  timezone = 'Africa/Lusaka',
  houseName,
  houseTypeLabel,
  checkOutDate,
  guestTitle,
  guestName,
  photoUrl,
  fallbackPhotoUrl = DEFAULT_COVER_IMAGE_URL,
}) => {
  const now = useNow(30_000);
  const [primaryImgFailed, setPrimaryImgFailed] = useState(false);
  const [fallbackImgFailed, setFallbackImgFailed] = useState(false);

  const timeStr = formatPropertyTime(now, timezone);

  const guestDisplayName = guestName?.trim()
    ? `${guestTitle ? `${guestTitle} ` : ''}${guestName.trim()}`
    : null;

  // Quiet check-out format: e.g. "until Fri 30 Oct"
  const formattedQuietCheckOut = checkOutDate
    ? (() => {
        try {
          const raw = checkOutDate.trim();
          const parsed = raw.includes('T') ? raw : `${raw}T11:00:00+02:00`;
          const d = new Date(parsed.length === 16 ? `${parsed}:00+02:00` : parsed);
          if (Number.isNaN(d.getTime())) return null;
          const parts = new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            timeZone: timezone,
          }).formatToParts(d);
          const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
          return `until ${get('weekday')} ${get('day')} ${get('month')}`.trim();
        } catch {
          return null;
        }
      })()
    : null;

  const activePhotoSrc =
    !primaryImgFailed && photoUrl
      ? photoUrl
      : !fallbackImgFailed && fallbackPhotoUrl
      ? fallbackPhotoUrl
      : null;

  return (
    <header
      data-testid="guest-hero-banner"
      className="relative overflow-hidden text-[#F7F3EC] h-[430px] px-[22px] pt-[calc(18px+env(safe-area-inset-top))] pb-[40px] flex flex-col justify-between bg-[linear-gradient(165deg,#102620_0%,#1C3A31_52%,#2A4A3E_100%)]"
    >
      {activePhotoSrc ? (
        <>
          <img
            src={activePhotoSrc}
            alt={houseName}
            onError={() => {
              if (!primaryImgFailed && photoUrl && activePhotoSrc === photoUrl) {
                setPrimaryImgFailed(true);
              } else {
                setFallbackImgFailed(true);
              }
            }}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(10,16,13,0.45) 0%, rgba(10,16,13,0.12) 42%, rgba(10,16,13,0.86) 100%)',
            }}
          />
        </>
      ) : (
        <DuskIllustration />
      )}

      {/* Top row — property + city left, frosted time pill right (time only, city appears once only) */}
      <div className="relative z-10 flex items-center justify-between gap-3 text-xs tracking-[0.12em] uppercase text-[#F7F3EC]/90">
        <span className="inline-flex items-center gap-2 font-semibold min-w-0 flex-1 truncate">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E0B973] shadow-[0_0_0_4px_rgba(224,185,115,0.2)] shrink-0" />
          <span data-testid="banner-property-city" className="truncate">
            {propertyName} &middot; {city}
          </span>
        </span>
        <span
          data-testid="lusaka-clock-pill"
          className="shrink-0 px-2.5 py-1 rounded-full bg-black/35 backdrop-blur-md border border-white/15 tracking-[0.04em] font-medium text-xs text-white"
        >
          <span data-testid="banner-time">{timeStr}</span>
        </span>
      </div>

      {/* Bottom block — greeting, Welcome to House, House Type + quiet check-out */}
      <div className="relative z-10 space-y-1">
        {guestDisplayName && (
          <p
            data-testid="guest-greeting"
            className="text-[15px] font-medium text-[#E8C98A] tracking-[0.01em]"
          >
            Hello, {guestDisplayName}
          </p>
        )}

        <h1
          data-testid="guest-welcome-heading"
          className="font-serif font-medium text-[36px] leading-[1.08] tracking-[-0.01em] text-[#FBF8F1]"
        >
          Welcome to <em className="italic font-normal text-[#F3DEC0]">{houseName}</em>
        </h1>

        {houseTypeLabel && (
          <p
            data-testid="guest-house-type"
            className="pt-1 text-[13px] text-[#F7F3EC]/85"
          >
            <span data-testid="banner-quiet-checkout">
              {houseTypeLabel}
              {formattedQuietCheckOut && ` · ${formattedQuietCheckOut}`}
            </span>
          </p>
        )}
      </div>
    </header>
  );
};

const DuskIllustration: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 420 430"
    preserveAspectRatio="xMidYMax slice"
    className="pointer-events-none absolute inset-0 w-full h-full"
  >
    <defs>
      <radialGradient id="sunGlow" cx="78%" cy="28%" r="48%">
        <stop offset="0%" stopColor="#E8BA78" stopOpacity="0.42" />
        <stop offset="55%" stopColor="#E8BA78" stopOpacity="0.10" />
        <stop offset="100%" stopColor="#E8BA78" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="poolShimmer" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3B6B5C" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#0E201B" stopOpacity="0.55" />
      </linearGradient>
    </defs>

    <rect width="420" height="430" fill="url(#sunGlow)" />
    <circle cx="328" cy="94" r="26" fill="#ECC589" fillOpacity="0.28" />

    <path
      d="M0,296 Q95,278 185,290 T360,284 L420,288 L420,430 L0,430 Z"
      fill="#142C25"
      fillOpacity="0.65"
    />

    <g fill="#0E211C" fillOpacity="0.78">
      <polygon points="248,292 292,266 336,292" />
      <rect x="256" y="292" width="72" height="36" rx="1" />
    </g>
    <rect x="270" y="300" width="10" height="14" rx="1" fill="#F2C97D" fillOpacity="0.75" />
    <rect x="286" y="300" width="10" height="14" rx="1" fill="#F2C97D" fillOpacity="0.55" />
    <rect x="306" y="300" width="10" height="14" rx="1" fill="#F2C97D" fillOpacity="0.7" />

    <rect x="0" y="328" width="420" height="102" fill="url(#poolShimmer)" />
  </svg>
);
