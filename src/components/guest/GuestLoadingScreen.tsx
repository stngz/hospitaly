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
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [imageTimeout, setImageTimeout] = useState(false);
  const [doorOpen, setDoorOpen] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // 300ms timeout for door image loading before falling back to shimmer skeleton
    const timeoutTimer = setTimeout(() => {
      setImageTimeout(true);
    }, 300);

    const closedImg = new Image();
    const openImg = new Image();
    let closedReady = false;
    let openReady = false;

    const checkBoth = () => {
      if (closedReady && openReady) {
        clearTimeout(timeoutTimer);
        setImagesLoaded(true);
      }
    };

    closedImg.onload = () => {
      closedReady = true;
      checkBoth();
    };
    closedImg.onerror = () => {
      clearTimeout(timeoutTimer);
      setImageTimeout(true);
    };

    openImg.onload = () => {
      openReady = true;
      checkBoth();
    };
    openImg.onerror = () => {
      clearTimeout(timeoutTimer);
      setImageTimeout(true);
    };

    closedImg.src = '/brand/door-closed.png';
    openImg.src = '/brand/door-open.png';

    return () => {
      clearTimeout(timeoutTimer);
    };
  }, []);

  useEffect(() => {
    if (imagesLoaded) {
      // Trigger smooth 0.5s ease opening transition
      const openTimer = setTimeout(() => {
        setDoorOpen(true);
      }, 150);
      return () => clearTimeout(openTimer);
    }
  }, [imagesLoaded]);

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
        {/* Door Opening Animation / Fallback Shimmer */}
        <div className="relative w-32 h-44 flex items-center justify-center">
          {imagesLoaded && !imageTimeout ? (
            <div className="relative w-full h-full flex items-center justify-center">
              {/* Soft warm glow behind door when opening */}
              <div
                className={`absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(224,185,115,0.6)_0%,transparent_70%)] transition-opacity duration-500 ease-out ${
                  doorOpen ? 'opacity-100 scale-110' : 'opacity-0 scale-95'
                }`}
              />
              {/* Closed Door */}
              <img
                src="/brand/door-closed.png"
                alt="Door Closed"
                className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ease-out ${
                  doorOpen ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                }`}
              />
              {/* Open Door */}
              <img
                src="/brand/door-open.png"
                alt="Door Open"
                className={`absolute inset-0 w-full h-full object-contain transition-all duration-500 ease-out ${
                  doorOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
                }`}
              />
            </div>
          ) : (
            /* Warm Shimmer Skeleton Fallback */
            <div className="relative w-28 h-40 rounded-2xl bg-white/5 border border-[#E0B973]/30 overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-[#E0B973]/20 via-[#E0B973]/5 to-transparent animate-pulse" />
              <div className="w-8 h-8 rounded-full border border-[#E0B973]/40 border-t-[#E0B973] animate-spin" />
            </div>
          )}
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
            Opening your door…
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
          Private Guest Stay
        </span>
      </div>
    </div>
  );
};
