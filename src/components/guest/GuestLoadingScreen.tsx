import React, { useEffect, useState } from 'react';
import { Phone, RefreshCw } from 'lucide-react';
import { Logo } from '../brand/Logo';

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
}) => {
  const [doorOpen, setDoorOpen] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // 900ms swing animation starts immediately after mount
    const animTimer = setTimeout(() => {
      setDoorOpen(true);
    }, 100);

    // 10s timeout fallback
    const timeoutTimer = setTimeout(() => {
      setTimedOut(true);
    }, 10000);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(timeoutTimer);
    };
  }, []);

  const cleanPhone = receptionPhone.replace(/[^0-9+]/g, '');

  return (
    <div
      data-testid="guest-loading-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 sm:p-8 bg-[#13233A] text-[#FAF7F0] select-none transition-opacity duration-300"
    >
      {/* Top Property Title */}
      <div className="pt-6 text-center">
        <span className="text-xs uppercase tracking-[0.2em] font-semibold text-[#C9A55C] block">
          {propertyName}
        </span>
      </div>

      {/* Center Animated SVG Door (C6: 0 KB images, 3D perspective swing) */}
      <div className="flex flex-col items-center justify-center space-y-6 max-w-xs text-center my-auto">
        <div
          className="relative w-32 h-36 flex items-center justify-center"
          style={{ perspective: '400px' }}
        >
          {/* Subtle warm glow behind door */}
          <div
            className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(201,165,92,0.35)_0%,transparent_70%)] transition-opacity duration-700 ease-out ${
              doorOpen ? 'opacity-100 scale-125' : 'opacity-0 scale-95'
            }`}
          />

          <svg
            viewBox="0 0 100 100"
            className="w-28 h-28 relative z-10 overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Arch */}
            <path
              d="M28 90 L28 46 A22 22 0 0 1 72 46 L72 90"
              stroke="#FAF7F0"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Gold Door swinging open with CSS perspective */}
            <path
              d="M50 26 L66 34 L66 88 L50 90 Z"
              fill="#C9A55C"
              className="origin-[50px_58px] transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
              style={{
                transform: doorOpen ? 'rotateY(-70deg)' : 'rotateY(0deg)',
              }}
            />
          </svg>
        </div>

        {/* House Name or Loading indicator */}
        <div className="space-y-1.5">
          {houseName ? (
            <h2 className="text-xl font-serif font-bold text-white tracking-tight">
              Welcome to {houseName}
            </h2>
          ) : (
            <h2 className="text-lg font-serif font-medium text-stone-200">
              Opening your house…
            </h2>
          )}
          <p className="text-xs text-stone-300">
            {timedOut ? 'Taking longer than expected' : 'Connecting to house services'}
          </p>
        </div>

        {/* Fallback Retry UI if > 10s */}
        {timedOut && (
          <div className="w-full space-y-3 pt-2">
            <button
              type="button"
              onClick={onRetry || (() => window.location.reload())}
              className="w-full min-h-11 py-2.5 px-4 rounded-xl bg-[#FAF7F0] hover:bg-white text-[#13233A] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry connection</span>
            </button>
            {cleanPhone && (
              <a
                href={`tel:${cleanPhone}`}
                className="inline-flex items-center gap-1.5 text-xs text-[#C9A55C] hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call reception: {receptionPhone}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* C2: Powered by Shekin line at bottom */}
      <div className="pb-4 flex items-center justify-center gap-2 text-xs text-stone-400 select-none">
        <Logo variant="mark" size="xs" tone="onDark" />
        <span className="tracking-wide">Powered by Shekin</span>
      </div>
    </div>
  );
};
