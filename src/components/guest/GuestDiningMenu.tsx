import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { notificationService } from '../../lib/notifications';
import { DEFAULT_HOUSE_GUIDE } from '../../lib/seeds/rocksApartments';
import {
  ArrowLeft,
  Waves,
  Wifi,
  ShieldCheck,
  Clock,
  Phone,
  Copy,
  Check,
  Zap,
  MapPin,
  BookOpen,
} from 'lucide-react';
import { GuestBottomNav } from './GuestBottomNav';

interface GuestDiningMenuProps {
  onBack: () => void;
  onRequestSubmitted: (requestId: string) => void;
  onNavigateTab?: (view: any, data?: any) => void;
}

export const GuestDiningMenu: React.FC<GuestDiningMenuProps> = ({
  onBack,
  onNavigateTab,
}) => {
  const { property, room } = useTenant();
  const [copiedWifi, setCopiedWifi] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const guide = {
    ...DEFAULT_HOUSE_GUIDE,
    ...(property?.houseGuide || {}),
  };

  const wifiSsid = room?.wifiName || property?.wifiName || '8119 vip';
  const wifiPass = room?.wifiPassword || property?.wifiPassword || '@rocks.8119';
  const emergencyPhone = guide.emergencyPhone || property?.contactPhone || '+260 97 405 6547';
  const cleanPhone = emergencyPhone.replace(/[^0-9+]/g, '');
  const waPhone = (property?.whatsappPhone || emergencyPhone).replace(/[^0-9]/g, '');

  const rawRules =
    room?.houseRules && (Array.isArray(room.houseRules) ? room.houseRules.length > 0 : Boolean(room.houseRules))
      ? room.houseRules
      : guide.houseRules || DEFAULT_HOUSE_GUIDE.houseRules;
  const houseRules = Array.isArray(rawRules)
    ? rawRules
    : typeof rawRules === 'string'
    ? rawRules.split('\n').map((s) => s.trim()).filter(Boolean)
    : [];

  const handleCopyWifi = async () => {
    if (!wifiPass) return;
    try {
      await navigator.clipboard.writeText(wifiPass);
      notificationService.triggerHaptic('light');
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2200);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="region"
      aria-label="House guide"
      data-testid="guest-house-guide"
      className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-24 overscroll-y-contain flex flex-col"
    >
      {/* Sticky Header */}
      <header className="sticky top-0 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-2 flex items-center justify-between z-30 shadow-2xs">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to home"
          className="w-11 h-11 -ml-1 rounded-xl flex items-center justify-center text-stone-700 hover:text-stone-950 active:bg-stone-200/60 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center px-2">
          <h1 className="text-sm font-serif font-bold text-stone-900 leading-tight">House guide</h1>
          <p className="text-xs text-stone-500 truncate max-w-[200px]">
            {room ? room.name || room.roomNumber : property?.name}
          </p>
        </div>

        <a
          href={`tel:${cleanPhone}`}
          aria-label="Call reception"
          className="w-11 h-11 -mr-1 rounded-xl flex items-center justify-center text-[#1C3A31] hover:bg-stone-100 active:scale-95 transition-all"
        >
          <Phone className="w-4 h-4" />
        </a>
      </header>

      <main className="p-4 space-y-3.5 flex-1">
        {/* 1. Check-in / Check-out times & Emergency Phone */}
        <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wider">
            <Clock className="w-4 h-4 text-[#1C3A31]" />
            <span>Check-in &amp; Check-out</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block">Check-in</span>
              <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                {property?.checkInTime || '14:00'}
              </span>
            </div>
            <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/60">
              <span className="text-stone-500 block">Check-out</span>
              <span className="font-bold text-stone-900 text-sm mt-0.5 block">
                {property?.checkOutTime || '11:00'}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs text-stone-500 block">Reception &amp; emergency</span>
              <span className="text-sm font-bold text-stone-900">{emergencyPhone}</span>
            </div>
            <div className="flex gap-2">
              <a
                href={`tel:${cleanPhone}`}
                className="min-h-11 px-3.5 py-2 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold inline-flex items-center"
              >
                Call
              </a>
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 px-3.5 py-2 rounded-xl bg-[#F5F1E8] text-[#1C3A31] text-xs font-semibold inline-flex items-center"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </section>

        {/* 2. Wi-Fi */}
        <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1C3A31]/[0.08] text-[#1C3A31] flex items-center justify-center shrink-0">
              <Wifi className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-stone-900 leading-tight">Wi-Fi</h2>
              <span className="text-xs text-stone-500">Available across house and pool area</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 flex items-center justify-between gap-2">
            <div className="space-y-1 text-xs min-w-0 flex-1">
              <div>
                <span className="text-stone-500 block">Network</span>
                <span className="font-bold text-stone-900 break-words">{wifiSsid}</span>
              </div>
              {wifiPass && (
                <div>
                  <span className="text-stone-500 block">Password</span>
                  <span className="font-bold text-sm text-[#1C3A31] break-all">{wifiPass}</span>
                </div>
              )}
            </div>

            {wifiPass && (
              <button
                type="button"
                onClick={handleCopyWifi}
                className="min-h-11 px-3.5 py-2 rounded-xl bg-white border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                {copiedWifi ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </section>

        {/* 3. Gate instructions */}
        <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-stone-900">Gate &amp; security</h2>
          </div>
          <p data-testid="guide-gate-instructions" className="text-xs text-stone-600 leading-relaxed">
            {guide.gateInstructions}
          </p>
        </section>

        {/* 4. Power & water */}
        <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-stone-900">Power &amp; water</h2>
          </div>
          <p data-testid="guide-power-water" className="text-xs text-stone-600 leading-relaxed">
            {guide.powerWaterNotes}
          </p>
        </section>

        {/* 5. Pool & garden */}
        <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Waves className="w-4 h-4" />
            </div>
            <h2 className="text-xs font-bold text-stone-900">Pool &amp; garden</h2>
          </div>
          <p data-testid="guide-pool-garden" className="text-xs text-stone-600 leading-relaxed">
            {guide.poolGardenRules}
          </p>
        </section>

        {/* 6. House rules */}
        {houseRules && houseRules.length > 0 && (
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-stone-900">House rules</h2>
            </div>
            <ul data-testid="guide-house-rules" className="space-y-1.5 text-xs text-stone-600 list-disc pl-5">
              {houseRules.map((rule: string, idx: number) => (
                <li key={idx}>{rule}</li>
              ))}
            </ul>
          </section>
        )}

        {/* 7. Local tips */}
        {guide.localTips && guide.localTips.length > 0 && (
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 className="text-xs font-bold text-stone-900">Nearby in {property?.city || 'Lusaka'}</h2>
            </div>
            <ul className="space-y-1.5 text-xs text-stone-600 list-disc pl-5">
              {guide.localTips.map((tip: string, idx: number) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* Bottom Navigation */}
      <GuestBottomNav
        activeTab="dining"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};
