import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  MessageSquare,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronDown,
  Building2,
  Phone,
  Send,
  Zap,
  MapPin,
  Camera,
} from 'lucide-react';
import { dbService } from '../../lib/store';
import { APP_NAME } from '../../lib/config';

interface SalesPageProps {
  onNavigateToDemo: () => void;
  onNavigateToScan: () => void;
  onNavigateToStaff: () => void;
}

export const SalesPage: React.FC<SalesPageProps> = ({
  onNavigateToDemo,
  onNavigateToScan,
  onNavigateToStaff,
}) => {
  // Quote form state
  const [formData, setFormData] = useState({
    name: '',
    propertyName: '',
    propertyType: 'Lodge',
    roomCount: '',
    city: 'Lusaka',
    whatsappPhone: '',
    email: '',
    message: '',
    honeypot: '', // hidden field to catch bots
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq((prev) => (prev === index ? null : index));
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Spam honeypot detection
    if (formData.honeypot) {
      setSubmittedName(formData.name || 'Friend');
      return;
    }

    // Rate limiting: 1 submit per 60s
    const now = Date.now();
    if (now - lastSubmitTime < 60000) {
      setFormError('Please wait a moment before submitting another quote request.');
      return;
    }

    if (!formData.name.trim() || !formData.propertyName.trim() || !formData.whatsappPhone.trim()) {
      setFormError('Please complete all required fields.');
      return;
    }

    const roomsNum = parseInt(formData.roomCount, 10);
    if (isNaN(roomsNum) || roomsNum < 1 || roomsNum > 2000) {
      setFormError('Please enter a valid room count between 1 and 2,000.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.createLead({
        name: formData.name.trim().slice(0, 120),
        propertyName: formData.propertyName.trim().slice(0, 120),
        propertyType: formData.propertyType.slice(0, 50),
        roomCount: roomsNum,
        city: formData.city.trim().slice(0, 120),
        whatsappPhone: formData.whatsappPhone.trim().slice(0, 60),
        email: formData.email.trim() ? formData.email.trim().slice(0, 120) : undefined,
        message: formData.message.trim() ? formData.message.trim().slice(0, 1000) : undefined,
        source: 'landing',
      });

      setLastSubmitTime(now);
      setSubmittedName(formData.name.trim());
    } catch (err: any) {
      setFormError('Could not send quote request. Please try again or tap Chat on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappHref = `https://wa.me/260979850598?text=${encodeURIComponent(
    `Hi, I'd like a quote for ${APP_NAME} (${formData.propertyName || 'my property'}, ${
      formData.roomCount || '10'
    } rooms)`
  )}`;

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 font-sans antialiased selection:bg-amber-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-900/[0.08] px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-stone-950 text-amber-400 flex items-center justify-center font-serif font-bold text-base shadow-xs">
            {APP_NAME.charAt(0)}
          </div>
          <span className="font-serif font-bold text-xl tracking-tight text-stone-950">
            {APP_NAME}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToDemo}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-stone-700 hover:text-stone-950 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Try the demo
          </button>
          <a
            href="#quote"
            className="px-4 py-2 rounded-xl bg-stone-950 text-white hover:bg-stone-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Get a quote
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-8 pt-12 pb-16 max-w-5xl mx-auto text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>QR Room Service Platform for Lodges & Hotels in Zambia</span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-stone-950 leading-[1.15]">
            Never miss a guest request again.
          </h1>
          <p className="text-sm sm:text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto">
            {APP_NAME} gives every room a unique QR code. Guests ask for towels, repairs or help in seconds — your team sees it instantly and you track everything live. No app to install.
          </p>
        </div>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <a
            href="#quote"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            Get a quote for your property <ArrowRight className="w-4 h-4" />
          </a>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4 text-emerald-400" /> Chat on WhatsApp
          </a>
          <button
            onClick={onNavigateToDemo}
            className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-amber-500" /> Try the demo
          </button>
        </div>

        {/* Hero Phone Preview Display */}
        <div className="pt-4 max-w-md sm:max-w-xl mx-auto">
          <div className="p-3 bg-white/70 rounded-3xl border border-stone-900/[0.08] shadow-2xl backdrop-blur-xs">
            <div className="relative rounded-2xl overflow-hidden aspect-[16/10] bg-stone-950 flex items-center justify-center">
              <video
                src="/brand/hero-loop.mp4"
                poster="/brand/hero-poster.jpg"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-transparent flex items-end p-4 text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">
                    Guest Room Experience
                  </span>
                  <p className="text-white text-xs font-serif font-medium">
                    Bedside QR Card · Live Request Dispatch · Staff Mobile Desk
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="bg-stone-950 text-white py-16 px-4 sm:px-8 border-y border-stone-800">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
              The Problem with WhatsApp & Paper
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold">
              Why hotel & lodge operations break down
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 bg-stone-900/60 rounded-2xl border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="font-serif text-base font-semibold text-white">
                Messages Get Forgotten
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Guests WhatsApp the caretaker or receptionist directly. Requests get buried in chat, ignored or lost during shift changes.
              </p>
            </div>

            <div className="p-6 bg-stone-900/60 rounded-2xl border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-base">
                2
              </div>
              <h3 className="font-serif text-base font-semibold text-white">
                Owners are Blind
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Owners can’t see who handled what, how long tickets took to resolve, or why unhappy guests leave bad reviews online.
              </p>
            </div>

            <div className="p-6 bg-stone-900/60 rounded-2xl border border-stone-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-base">
                3
              </div>
              <h3 className="font-serif text-base font-semibold text-white">
                Check-outs Slip
              </h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Staff don't know when rooms are vacated. Turnaround falls behind and incoming guests arrive to unprepared rooms.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (3 Steps) */}
      <section className="py-20 px-4 sm:px-8 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs uppercase tracking-widest text-amber-600 font-semibold">
            How It Works
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-950">
            Three simple steps. No app required.
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-xl mx-auto">
            Guests simply point their regular phone camera at the card on their table or bedside.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-stone-100">
                <img
                  src="/brand/step-scan.jpg"
                  alt="Scan QR in room"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-amber-600">Step 1</span>
                <h3 className="font-serif text-lg font-bold text-stone-950">
                  Scan the QR in the room
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Every room has a high-res card with room name, Wi-Fi details, and personalized greeting.
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-stone-100">
                <img
                  src="/brand/step-request.jpg"
                  alt="Ask for what you need"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-amber-600">Step 2</span>
                <h3 className="font-serif text-lg font-bold text-stone-950">
                  Ask for what you need
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Guests tap for extra towels, AC repairs, room dining, or housekeeping in 2 clicks.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-stone-100">
                <img
                  src="/brand/step-done.jpg"
                  alt="Track live until done"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs uppercase font-bold text-amber-600">Step 3</span>
                <h3 className="font-serif text-lg font-bold text-stone-950">
                  Track live until it’s done
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Front desk assigns staff instantly. Guests see live dispatch updates right on their screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What Owners & Managers Get */}
      <section className="bg-stone-100/70 py-16 px-4 sm:px-8 border-y border-stone-200">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs uppercase tracking-widest text-amber-700 font-semibold">
              Platform Features
            </span>
            <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-950">
              Built for owners who value high standards
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-sm font-bold text-stone-900">
                Every request logged
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Tickets are assigned, tracked with timestamps, and audited. Nothing slips through.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-sm font-bold text-stone-900">
                Live house status
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Know which rooms are occupied, overdue for check-out, or ready for housekeeping in real time.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-sm font-bold text-stone-900">
                Your own branding
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Your photos, property colors, Wi-Fi details, and house rules on every guest screen.
              </p>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-sm font-bold text-stone-900">
                Zero hardware required
              </h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                Runs entirely in the mobile browser. No tablets to buy, no apps to update, and works on any phone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Built for Zambia Strip */}
      <section className="bg-stone-900 text-stone-200 py-8 px-4 sm:px-8 border-b border-stone-800">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Lusaka local time (CAT GMT+2)</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>Works fast on slow 3G/4G connections</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
            <span>WhatsApp-friendly dispatch alerts</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Local on-site setup in Lusaka</span>
          </div>
        </div>
      </section>

      {/* Try It Live / Demo Trigger Section */}
      <section className="py-16 px-4 sm:px-8 max-w-3xl mx-auto text-center space-y-6">
        <div className="p-8 bg-white rounded-3xl border border-stone-200 shadow-sm space-y-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <QrCode className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950">
            Try the live guest experience right now
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            Test sending a request on a sample villa and watch how front desk dispatch works in real time.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onNavigateToDemo}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Open the live demo
            </button>
            <button
              onClick={onNavigateToScan}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Camera className="w-4 h-4" /> Scan a room QR
            </button>
          </div>
        </div>
      </section>

      {/* Get A Quote Form Section (#quote) */}
      <section id="quote" className="py-16 px-4 sm:px-8 max-w-2xl mx-auto space-y-8 scroll-mt-16">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-amber-600 font-semibold">
            Pricing & Onboarding
          </span>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-stone-950">
            Get a quote for your property
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
            Pricing is tailored to your room count. We design and print your QR cards, and get your team live the same day.
          </p>
        </div>

        {submittedName ? (
          <div className="p-8 bg-white rounded-3xl border border-emerald-300 shadow-md text-center space-y-5 animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              Thanks, {submittedName}!
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
              We’ve received your quote request and will WhatsApp you within 24 hours with custom pricing for your property.
            </p>
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4" /> Or chat now on WhatsApp
              </a>
              <button
                onClick={() => setSubmittedName(null)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-50 cursor-pointer"
              >
                Submit another request
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleQuoteSubmit}
            className="p-6 sm:p-8 bg-white rounded-3xl border border-stone-200/90 shadow-md space-y-4"
          >
            {/* Honeypot field (hidden from users, traps automated bots) */}
            <input
              type="text"
              name="website"
              value={formData.honeypot}
              onChange={(e) => setFormData({ ...formData, honeypot: e.target.value })}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Your Name <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Chileshe Mwamba"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Property Name <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.propertyName}
                  onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                  placeholder="e.g. Zambezi Sun Lodge"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Property Type <span className="text-amber-600">*</span>
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 focus:outline-none focus:border-amber-500"
                >
                  <option value="Lodge">Lodge</option>
                  <option value="Hotel">Hotel</option>
                  <option value="Holiday homes">Holiday homes</option>
                  <option value="Guest house">Guest house</option>
                  <option value="Apartments">Apartments</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Rooms or Houses <span className="text-amber-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="2000"
                  required
                  value={formData.roomCount}
                  onChange={(e) => setFormData({ ...formData, roomCount: e.target.value })}
                  placeholder="e.g. 12"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Town / City <span className="text-amber-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g. Lusaka, Livingstone"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  WhatsApp Number <span className="text-amber-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.whatsappPhone}
                  onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                  placeholder="+260 97 ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-800 mb-1">
                  Email <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="owner@property.zm"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-800 mb-1">
                Message or specific requirements <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Tell us about your property, current challenges, or when you'd like to launch..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Sending your quote request...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Get my quote
                </>
              )}
            </button>
          </form>
        )}
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-8 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <span className="text-xs uppercase tracking-widest text-amber-600 font-semibold">
            Frequently Asked Questions
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-950">
            Common questions from property owners
          </h2>
        </div>

        <div className="space-y-3">
          {[
            {
              q: 'Do guests need to download an app?',
              a: 'No. Guests simply open the standard camera on their iPhone or Android and scan the QR code card in the room. The web experience opens instantly in under 1 second.',
            },
            {
              q: 'What do I need at my property to get started?',
              a: 'All you need is Wi-Fi or mobile data at reception and in guest rooms. We handle QR code generation, room cards, and staff onboarding.',
            },
            {
              q: 'How long does setup take?',
              a: 'Most properties are fully live within the same day. We configure your rooms, house rules, and staff accounts, then deliver your laminated QR cards.',
            },
            {
              q: 'How much does it cost?',
              a: 'Pricing is based on your total number of rooms or houses. Fill out the quote form above or reach out on WhatsApp for exact pricing for your lodge.',
            },
          ].map((item, idx) => (
            <div
              key={item.q}
              className="p-4 bg-white rounded-2xl border border-stone-200/90 shadow-2xs space-y-2"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between text-left font-serif text-sm font-semibold text-stone-950 cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-stone-500 transition-transform ${
                    openFaq === idx ? 'rotate-180 text-amber-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <p className="text-xs text-stone-600 leading-relaxed pt-1 border-t border-stone-100">
                  {item.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-10 px-4 sm:px-8 text-stone-600 text-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-base text-stone-900">{APP_NAME}</span>
            <span>· Lusaka, Zambia</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <button
              onClick={onNavigateToScan}
              className="text-stone-800 font-semibold hover:text-amber-600 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5" /> Staying at a property? Scan your room QR
            </button>
            <a
              href="https://wa.me/260979850598"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-stone-950 transition-colors flex items-center gap-1"
            >
              <Phone className="w-3 h-3" /> WhatsApp: +260 97 985 0598
            </a>
            <button
              onClick={onNavigateToStaff}
              className="hover:text-stone-950 transition-colors cursor-pointer"
            >
              Staff sign in
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
