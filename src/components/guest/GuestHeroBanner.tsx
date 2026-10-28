import React, { useEffect, useState } from 'react';

interface GuestHeroBannerProps {
  propertyName: string;          // "Rock Apartments"
  city?: string;                 // "Lusaka"
  country?: string;              // "Zambia"
  houseName: string;             // "Chisenga"
  houseTypeLabel?: string;       // "Studio" | "2 BHK" | "3 BHK"
  guestTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr';
  guestName?: string;            // "Princess Mazaba"
  checkOutDate?: string;         // ISO date or undefined
  checkOutTime?: string;         // "11:00"
  photoUrl?: string;             // only set when GM uploads a real house photo
}

const fmtTime = () =>
  new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Africa/Lusaka',
  }).format(new Date());

const fmtDate = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Africa/Lusaka',
      }).format(d);
};

export const GuestHeroBanner: React.FC<GuestHeroBannerProps> = ({
  propertyName,
  city = 'Lusaka',
  country = 'Zambia',
  houseName,
  houseTypeLabel,
  guestTitle,
  guestName,
  checkOutDate,
  checkOutTime = '11:00',
  photoUrl,
}) => {
  const [now, setNow] = useState(fmtTime);

  useEffect(() => {
    const id = setInterval(() => setNow(fmtTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  const guestDisplayName = guestName?.trim()
    ? `${guestTitle ? `${guestTitle} ` : ''}${guestName.trim()}`
    : null;

  const metaParts = [
    houseTypeLabel,
    checkOutDate ? `Check-out ${fmtDate(checkOutDate)} · ${checkOutTime}` : `Check-out ${checkOutTime}`,
  ].filter(Boolean);

  return (
    <header className="relative overflow-hidden text-[#F7F3EC] px-[22px] pt-[calc(14px+env(safe-area-inset-top))] pb-[34px] bg-[linear-gradient(165deg,#102620_0%,#1C3A31_52%,#2A4A3E_100%)]">
      {photoUrl ? (
        <>
          <img
            src={photoUrl}
            alt={houseName}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,24,20,0.55)_0%,rgba(12,24,20,0.78)_100%)]" />
        </>
      ) : (
        <DuskIllustration />
      )}

      {/* Row 1 — property + live Lusaka time */}
      <div className="relative z-10 flex items-center justify-between text-xs tracking-[0.14em] uppercase text-[#F7F3EC]/70">
        <span className="inline-flex items-center gap-2 font-semibold text-[#F7F3EC]/90">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E0B973] shadow-[0_0_0_4px_rgba(224,185,115,0.18)]" />
          {propertyName}
        </span>
        <span className="tracking-[0.06em] font-medium">
          {city}, {country} · {now}
        </span>
      </div>

      {/* Row 2 — personal greeting */}
      {guestDisplayName && (
        <p className="relative z-10 mt-[22px] text-sm font-medium text-[#E0B973] tracking-[0.01em]">
          Hello, {guestDisplayName}
        </p>
      )}

      {/* Row 3 — house name */}
      <h1
        className={`relative z-10 ${guestDisplayName ? 'mt-1' : 'mt-[22px]'} font-serif font-medium text-[34px] leading-[1.08] tracking-[-0.01em] text-[#FBF8F1]`}
      >
        Welcome to <em className="italic font-normal text-[#F3DEC0]">{houseName}</em>
      </h1>

      {/* Row 4 — house type + check-out */}
      <div className="relative z-10 mt-2.5 flex flex-wrap items-center gap-2 text-[13px] text-[#F7F3EC]/78">
        {metaParts.map((part, i) => (
          <React.Fragment key={part}>
            {i > 0 && <span className="opacity-45">·</span>}
            <span>{part}</span>
          </React.Fragment>
        ))}
      </div>
    </header>
  );
};

const DuskIllustration: React.FC = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 420 230"
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

    <rect width="420" height="230" fill="url(#sunGlow)" />
    <circle cx="328" cy="64" r="22" fill="#ECC589" fillOpacity="0.28" />

    <path
      d="M0,156 Q95,138 185,150 T360,144 L420,148 L420,230 L0,230 Z"
      fill="#142C25"
      fillOpacity="0.65"
    />

    <g fill="#0E211C" fillOpacity="0.78">
      <polygon points="248,152 292,126 336,152" />
      <rect x="256" y="152" width="72" height="30" rx="1" />
    </g>
    <rect x="270" y="160" width="10" height="12" rx="1" fill="#F2C97D" fillOpacity="0.75" />
    <rect x="286" y="160" width="10" height="12" rx="1" fill="#F2C97D" fillOpacity="0.55" />
    <rect x="306" y="160" width="10" height="12" rx="1" fill="#F2C97D" fillOpacity="0.7" />

    <g stroke="#0E211C" strokeOpacity="0.75" strokeWidth="2" fill="none" strokeLinecap="round">
      <path d="M232,182 Q234,154 230,132" />
      <path d="M230,132 Q216,128 208,134" />
      <path d="M230,132 Q222,120 214,120" />
      <path d="M230,132 Q240,122 248,126" />
      <path d="M230,132 Q242,130 250,138" />
    </g>

    <rect x="0" y="182" width="420" height="48" fill="url(#poolShimmer)" />
    <g stroke="#E8C98F" strokeOpacity="0.22" strokeWidth="1" fill="none">
      <line x1="252" y1="192" x2="328" y2="192" />
      <line x1="262" y1="200" x2="318" y2="200" />
      <line x1="274" y1="208" x2="308" y2="208" />
    </g>
  </svg>
);
