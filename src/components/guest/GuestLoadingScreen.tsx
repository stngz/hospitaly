import React, { useEffect, useState } from 'react';
import { Phone, RefreshCw } from 'lucide-react';

interface GuestLoadingScreenProps {
  propertyName?: string;
  houseName?: string;
  receptionPhone?: string;
  onRetry?: () => void;
  isReady?: boolean;
}

export const GuestLoadingScreen: React.FC<GuestLoadingScreenProps> = ({
  propertyName = 'Rock Apartments',
  houseName,
  receptionPhone = '+260 97 405 6547',
  onRetry,
  isReady = false,
}) => {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Enforce minimum 600ms display so there is no flicker
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // 10s maximum wait before showing friendly retry
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  const cleanPhone = receptionPhone.replace(/[^0-9+]/g, '');

  return (
    <div
      data-testid="guest-loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-8 bg-[linear-gradient(165deg,#102620_0%,#1C3A31_55%,#2A4A3E_100%)] text-[#F7F3EC] select-none transition-opacity duration-300"
    >
      {/* Top Branding */}
      <div className="pt-6 text-center">
        <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E0B973] block">
          {propertyName}
        </span>
      </div>

      {/* Center Animated Element */}
      <div className="flex flex-col items-center justify-center space-y-6 max-w-xs text-center">
        {/* Lightweight SVG House & Key Looping Animation */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          <svg
            className="w-20 h-20 text-[#E0B973] transition-all motion-safe:animate-pulse"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* House Outline */}
            <path
              d="M32 8 L8 28 L14 28 L14 54 L50 54 L50 28 L56 28 Z"
              className="stroke-[#E0B973] opacity-80"
              style={{
                strokeDasharray: 200,
                strokeDashoffset: 0,
              }}
            />
            {/* Door Arch */}
            <path
              d="M26 54 L26 36 Q32 30 38 36 L38 54"
              className="stroke-[#E0B973]"
            />
            {/* Keyhole */}
            <circle cx="32" cy="42" r="2" fill="#E0B973" />
            <line x1="32" y1="44" x2="32" y2="48" stroke="#E0B973" strokeWidth="1.5" />
          </svg>

          {/* Gentle rotating gold orbit */}
          <div
            className="absolute inset-0 rounded-full border border-[#E0B973]/20 border-t-[#E0B973] motion-safe:animate-spin"
            style={{ animationDuration: '2.5s' }}
          />
        </div>

        <div className="space-y-2">
          {houseName ? (
            <h2 className="text-2xl font-serif font-medium text-white tracking-tight">
              Welcome to <span className="italic text-[#E0B973]">{houseName}</span>
            </h2>
          ) : (
            <h2 className="text-2xl font-serif font-medium text-white tracking-tight">
              Welcome
            </h2>
          )}
          <p className="text-xs uppercase tracking-[0.14em] text-white/80 font-medium">
            Preparing your stay…
          </p>
        </div>

        {/* Retry / Reception contact after 10s wait */}
        {timedOut && !isReady && (
          <div className="pt-4 space-y-3 animate-fade-in">
            <p className="text-xs text-stone-300 leading-relaxed">
              Taking longer than usual to connect.
            </p>
            <div className="flex flex-col gap-2 w-full">
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="min-h-11 px-4 py-2 rounded-xl bg-[#E0B973] text-[#102620] text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#edd097] active:scale-95 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try again</span>
                </button>
              )}
              <a
                href={`tel:${cleanPhone}`}
                className="min-h-11 px-4 py-2 rounded-xl border border-white/20 text-white text-xs font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#E0B973]" />
                <span>Call reception ({receptionPhone})</span>
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Quiet Pill */}
      <div className="pb-4">
        <span className="text-xs text-white/50 tracking-wider">
          Hospitaly &middot; Private Guest Portal
        </span>
      </div>
    </div>
  );
};
