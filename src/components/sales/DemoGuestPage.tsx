import React, { useState, useEffect } from 'react';
import {
  Wifi,
  Copy,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Bath,
  Droplets,
  Brush,
} from 'lucide-react';
import { Logo } from '../brand/Logo';

interface DemoGuestPageProps {
  onGetQuote: () => void;
  onBackToHome: () => void;
}

type DemoStep = 'browse' | 'sent' | 'confirmed' | 'in_progress' | 'completed';

export const DemoGuestPage: React.FC<DemoGuestPageProps> = ({ onGetQuote, onBackToHome }) => {
  const [wifiCopied, setWifiCopied] = useState(false);
  const [demoStep, setDemoStep] = useState<DemoStep>('browse');
  const [selectedRequest, setSelectedRequest] = useState<string>('Fresh towels');
  const [timerSeconds, setTimerSeconds] = useState(0);

  const copyWifi = () => {
    navigator.clipboard?.writeText('sunset2026').catch(() => {});
    setWifiCopied(true);
    setTimeout(() => setWifiCopied(false), 2000);
  };

  const handleSendRequest = (item: string) => {
    setSelectedRequest(item);
    setDemoStep('sent');
    setTimerSeconds(0);
  };

  useEffect(() => {
    if (demoStep === 'browse') return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [demoStep]);

  useEffect(() => {
    if (demoStep === 'sent') {
      const t = setTimeout(() => setDemoStep('confirmed'), 5000);
      return () => clearTimeout(t);
    }
    if (demoStep === 'confirmed') {
      const t = setTimeout(() => setDemoStep('in_progress'), 7000);
      return () => clearTimeout(t);
    }
    if (demoStep === 'in_progress') {
      const t = setTimeout(() => setDemoStep('completed'), 13000);
      return () => clearTimeout(t);
    }
  }, [demoStep]);

  return (
    <div className="min-h-screen bg-stone-100 font-sans antialiased text-stone-900 pb-16">
      {/* Top Demo Banner */}
      <div className="sticky top-0 z-40 bg-[#13233A] text-[#FAF7F0] px-4 py-2.5 text-xs font-medium flex items-center justify-between border-b border-[#FAF7F0]/10 shadow-sm">
        <div className="flex items-center gap-2 truncate">
          <Logo variant="mark" size="xs" tone="onDark" />
          <span className="truncate text-stone-200">Demo — this is what your guests see in their room</span>
        </div>
        <button
          onClick={onGetQuote}
          className="shrink-0 ml-3 px-3 py-1.5 rounded-full bg-[#FAF7F0] text-[#13233A] font-bold hover:bg-white transition-colors cursor-pointer text-xs flex items-center gap-1 shadow-xs"
        >
          Get a quote <ArrowRight className="w-3 h-3 text-[#C9A55C]" />
        </button>
      </div>

      <div className="max-w-md mx-auto shadow-modal min-h-dvh bg-[#FDFBF7] relative border-x border-stone-900/[0.08]">
        {/* Guest Hero Header */}
        <header className="relative w-full h-64 overflow-hidden rounded-b-3xl shadow-md">
          <img
            src="/brand/demo-house.jpg"
            alt="Sunset Villa 4"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/40 to-transparent" />

          {/* Lusaka Local Time Pill */}
          <div className="absolute top-4 right-4 bg-stone-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex items-center gap-1.5 text-white/90 text-xs">
            <Clock className="w-3 h-3 text-amber-300" />
            <span>SUNSET LODGE · LUSAKA</span>
          </div>

          <div className="absolute bottom-5 left-5 right-5 text-white space-y-1">
            <p className="text-xs uppercase tracking-wider text-amber-300 font-medium">
              Hello, Guest
            </p>
            <h1 className="text-2xl font-serif font-bold tracking-tight">
              Sunset Villa 4
            </h1>
            <p className="text-xs text-stone-300">
              Checkout: Tomorrow at 11:00
            </p>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-4 space-y-5">
          {/* Wi-Fi Card */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif text-sm font-semibold text-stone-900">Room Wi-Fi</h3>
                  <p className="text-xs text-stone-500">SunsetLodge-Guest</p>
                </div>
              </div>
              <button
                onClick={copyWifi}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                {wifiCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="px-3 py-2 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between text-xs">
              <span className="text-stone-500">Password:</span>
              <span className="font-semibold text-stone-800 tracking-wider">sunset2026</span>
            </div>
          </div>

          {/* Request Simulation View */}
          {demoStep === 'browse' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-base font-semibold text-stone-900">
                  Quick requests
                </h2>
                <span className="text-xs text-stone-400">Tap to test live dispatch</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { name: 'Fresh towels', Icon: Bath, desc: 'Extra bath or hand towels' },
                  { name: 'Extra drinking water', Icon: Droplets, desc: 'Bottled water to room' },
                  { name: 'Wi-Fi assistance', Icon: Wifi, desc: 'Signal or speed check' },
                  { name: 'Room housekeeping', Icon: Brush, desc: 'Tidy & fresh linens' },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => handleSendRequest(item.name)}
                    className="p-3.5 text-left bg-white rounded-2xl border border-stone-200/80 hover:border-[#C9A55C]/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#FAF7F0] text-[#13233A] flex items-center justify-center">
                      <item.Icon className="w-4 h-4 text-[#C9A55C]" />
                    </div>
                    <h3 className="text-xs font-semibold text-stone-900 group-hover:text-[#13233A] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[11px] text-stone-400 leading-tight">
                      {item.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Live Request Progress Card */
            <div className="p-5 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-amber-600 font-semibold block">
                    Active Request
                  </span>
                  <h3 className="font-serif text-base font-bold text-stone-900">
                    {selectedRequest}
                  </h3>
                </div>
                <button
                  onClick={() => setDemoStep('browse')}
                  className="text-xs text-stone-400 hover:text-stone-700 underline cursor-pointer"
                >
                  Test another
                </button>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3 py-1">
                {/* Step 1: Sent */}
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-stone-900">Request sent to front desk</p>
                    <p className="text-[11px] text-stone-400">Team notified on mobile desk</p>
                  </div>
                </div>

                {/* Step 2: Confirmed */}
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    demoStep === 'sent'
                      ? 'bg-amber-100 text-amber-700 animate-pulse'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {demoStep === 'sent' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${demoStep === 'sent' ? 'text-amber-800' : 'text-stone-900'}`}>
                      {demoStep === 'sent' ? 'Front desk confirming (5s)...' : 'Confirmed by GM'}
                    </p>
                    <p className="text-[11px] text-stone-400">Assigned to Housekeeping team</p>
                  </div>
                </div>

                {/* Step 3: In Progress */}
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    demoStep === 'sent'
                      ? 'bg-stone-100 text-stone-400'
                      : demoStep === 'confirmed'
                      ? 'bg-amber-100 text-amber-700 animate-pulse'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {demoStep === 'in_progress' || demoStep === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${demoStep === 'confirmed' ? 'text-amber-800' : 'text-stone-900'}`}>
                      {demoStep === 'sent'
                        ? 'Staff dispatch'
                        : demoStep === 'confirmed'
                        ? 'Staff heading to Sunset Villa 4 (12s)...'
                        : 'Staff on the way'}
                    </p>
                    <p className="text-[11px] text-stone-400">A team member is on the way</p>
                  </div>
                </div>

                {/* Step 4: Completed */}
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                    demoStep === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-100 text-stone-400'
                  }`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className={`text-xs font-semibold ${demoStep === 'completed' ? 'text-emerald-700 font-bold' : 'text-stone-500'}`}>
                      {demoStep === 'completed' ? 'Done — Delivered to your door!' : 'Completed (25s)'}
                    </p>
                    <p className="text-[11px] text-stone-400">Verified by GM & closed</p>
                  </div>
                </div>
              </div>

              {/* Reset / Try another button */}
              {demoStep === 'completed' && (
                <div className="pt-2">
                  <button
                    onClick={() => setDemoStep('browse')}
                    className="w-full py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800 transition-colors cursor-pointer"
                  >
                    Test another request
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Social Proof & Get A Quote CTA Card */}
          <div className="p-4 bg-gradient-to-br from-stone-900 to-stone-950 text-white rounded-2xl space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Ready for your lodge or apartments?</span>
            </div>
            <p className="text-xs text-stone-300 leading-relaxed">
              Every room gets a unique laminated QR card. No guest app download, instant notification to your staff, and live tracking for you.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onGetQuote}
                className="flex-1 py-2.5 rounded-xl bg-[#C9A55C] hover:bg-[#d8b46b] text-[#13233A] font-bold text-xs transition-colors cursor-pointer text-center"
              >
                Get a quote for your lodge
              </button>
              <button
                onClick={onBackToHome}
                className="px-3 py-2.5 rounded-xl border border-stone-700 hover:border-stone-500 text-stone-300 text-xs font-medium cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>

          {/* C2: Powered by Shekin line */}
          <div className="pt-2 pb-6 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs text-stone-400 select-none">
              <Logo variant="mark" size="xs" tone="onLight" />
              <span className="font-medium">Powered by Shekin</span>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
