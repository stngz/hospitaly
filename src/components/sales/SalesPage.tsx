import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowUpRight,
  Plus,
  Minus,
  Check,
  Camera,
  MessageSquare,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  ShieldCheck,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { dbService } from '../../lib/store';
import { Logo } from '../brand/Logo';

interface SalesPageProps {
  onNavigateToDemo: () => void;
  onNavigateToScan: () => void;
  onNavigateToStaff: () => void;
}

// Reusable Nova/Luvora Pill Button
interface PillButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'onPhoto' | 'outline' | 'outlinePhoto';
  className?: string;
  target?: string;
  rel?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

const PillButton: React.FC<PillButtonProps> = ({
  children,
  onClick,
  href,
  variant = 'primary',
  className = '',
  target,
  rel,
  type = 'button',
  disabled = false,
}) => {
  const isPhoto = variant === 'onPhoto';
  const isOutline = variant === 'outline';
  const isOutlinePhoto = variant === 'outlinePhoto';

  const baseClasses =
    'group inline-flex items-center justify-between gap-3 h-12 pl-6 pr-2 rounded-full font-semibold text-sm transition-all duration-300 cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:pointer-events-none';

  let colorClasses = 'bg-[#13233A] text-[#FAF7F0] hover:bg-[#1C2F4A] shadow-md';
  let circleClasses = 'bg-[#FAF7F0] text-[#13233A]';

  if (isPhoto) {
    colorClasses = 'bg-[#FAF7F0] text-[#13233A] hover:bg-white shadow-lg';
    circleClasses = 'bg-[#13233A] text-[#FAF7F0]';
  } else if (isOutline) {
    colorClasses = 'bg-transparent border border-[#13233A]/30 text-[#13233A] hover:bg-[#13233A]/5';
    circleClasses = 'bg-[#13233A] text-[#FAF7F0]';
  } else if (isOutlinePhoto) {
    colorClasses = 'bg-transparent border border-[#FAF7F0]/40 text-[#FAF7F0] hover:bg-[#FAF7F0]/10';
    circleClasses = 'bg-[#FAF7F0] text-[#13233A]';
  }

  const content = (
    <>
      <span className="truncate">{children}</span>
      <span
        className={`w-8 h-8 rounded-full ${circleClasses} flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:-rotate-45 group-hover:scale-110`}
      >
        <ArrowUpRight className="w-4 h-4" />
      </span>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        rel={rel}
        className={`${baseClasses} ${colorClasses} ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${colorClasses} ${className}`}
    >
      {content}
    </button>
  );
};

export const SalesPage: React.FC<SalesPageProps> = ({
  onNavigateToDemo,
  onNavigateToScan,
  onNavigateToStaff,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Scroll state for sticky navbar after hero
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const heroRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom;
      setScrolledPastHero(heroBottom < 60);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Glass card live simulation in Hero
  const sampleRequests = [
    { title: 'Fresh towels', steps: ['Sent', 'On the way', 'Done ✓'] },
    { title: 'Something broken (AC)', steps: ['Sent', 'Technician assigned', 'Done ✓'] },
    { title: 'Gas & kitchen', steps: ['Sent', 'On the way', 'Done ✓'] },
  ];
  const [requestIdx, setRequestIdx] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const nextRequest = () => {
    setRequestIdx((prev) => (prev + 1) % sampleRequests.length);
    setStepIdx(0);
  };

  const prevRequest = () => {
    setRequestIdx((prev) => (prev - 1 + sampleRequests.length) % sampleRequests.length);
    setStepIdx(0);
  };

  // How it works accordion state (single expanded row)
  const [activeStep, setActiveStep] = useState(0);
  const steps = [
    {
      num: '01',
      title: 'Scan the card in the room',
      desc: 'Every room or villa has a laminated card with its Wi-Fi details, room name, and custom QR code. Guests just point their regular phone camera.',
      img: '/brand/step-scan.jpg',
    },
    {
      num: '02',
      title: 'Ask for what you need',
      desc: 'Guests tap for extra towels, housekeeping, AC repairs, or kitchen supplies in two clicks. No typing long messages, no app download required.',
      img: '/brand/step-request.jpg',
    },
    {
      num: '03',
      title: 'Track it until it’s done',
      desc: 'Front desk assigns staff instantly. Guests see live dispatch updates right on their screen, with automatic confirmation when resolved.',
      img: '/brand/step-done.jpg',
    },
    {
      num: '04',
      title: 'Owners see every request, live',
      desc: 'Real-time visibility across all rooms and houses. Timestamps, staff accountability, and house turnover status right from your phone.',
      img: '/brand/hero.jpg',
    },
  ];

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqItems = [
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
      a: 'Pricing is based on your total number of rooms or houses. Fill out the quote form below or reach out on WhatsApp for exact pricing for your lodge.',
    },
  ];

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
    honeypot: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedName, setSubmittedName] = useState<string | null>(null);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const [formError, setFormError] = useState<string | null>(null);

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
    } catch {
      setFormError('Could not send quote request. Please try again or tap Chat on WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const whatsappHref = `https://wa.me/260979850598?text=${encodeURIComponent(
    `Hi, I'd like a quote for Shekin (${formData.propertyName || 'my property'}, ${
      formData.roomCount || '10'
    } rooms)`
  )}`;

  return (
    <div className="min-h-screen bg-[#FAF7F0] text-[#13233A] font-sans antialiased selection:bg-[#C9A55C]/30 overflow-x-hidden">
      {/* Sticky Top Bar (Fades in when scrolled past hero) */}
      <AnimatePresence>
        {scrolledPastHero && (
          <motion.header
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed top-0 inset-x-0 z-50 bg-[#FAF7F0]/95 backdrop-blur-md border-b border-[#E7E1D4] px-4 sm:px-8 py-3 flex items-center justify-between shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Logo variant="full" size="sm" tone="onLight" />
            </div>

            <nav className="hidden md:flex items-center gap-8 text-[14px] font-medium text-[#13233A]/80">
              <a href="#about" className="hover:text-[#13233A] transition-colors">
                About
              </a>
              <a href="#how-it-works" className="hover:text-[#13233A] transition-colors">
                How it works
              </a>
              <a href="#why-shekin" className="hover:text-[#13233A] transition-colors">
                Why Shekin
              </a>
              <a href="#demo" className="hover:text-[#13233A] transition-colors">
                Demo
              </a>
              <a href="#faq" className="hover:text-[#13233A] transition-colors">
                FAQ
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToDemo}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-[#13233A] hover:bg-[#E7E1D4]/40 transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C9A55C]" />
                Try demo
              </button>
              <PillButton href="#quote" variant="primary" className="h-10 text-xs pl-4 pr-1.5">
                Get a quote
              </PillButton>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      {/* 1. Hero Section (Nova: framed photo/video, headline bottom-left, property card + CTA bottom-right) */}
      <div className="p-3 sm:p-4">
        <div
          ref={heroRef}
          className="relative rounded-[24px] overflow-hidden min-h-[82vh] lg:min-h-[92vh] flex flex-col justify-between bg-[#13233A] text-white p-6 sm:p-10 lg:p-14 shadow-xl"
        >
          {/* Background Loop Video */}
          <video
            src="/brand/hero-loop.mp4"
            poster="/brand/hero-poster.jpg"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover opacity-85"
          />

          {/* Soft Navy Gradient (Lower 45%) */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#13233A] via-[#13233A]/60 to-[#13233A]/20 pointer-events-none" />

          {/* Top Nav inside the frame */}
          <div className="relative z-10 flex items-center justify-between">
            <Logo variant="full" size="md" tone="onDark" />

            <div className="hidden lg:flex items-center gap-8 text-[14px] font-medium text-[#FAF7F0]/85 bg-white/10 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/15">
              <a href="#how-it-works" className="hover:text-[#FAF7F0] transition-colors">
                How it works
              </a>
              <span className="text-[#FAF7F0]/40">·</span>
              <a href="#demo" className="hover:text-[#FAF7F0] transition-colors">
                Demo
              </a>
              <span className="text-[#FAF7F0]/40">·</span>
              <a href="#quote" className="hover:text-[#FAF7F0] transition-colors">
                Pricing
              </a>
              <span className="text-[#FAF7F0]/40">·</span>
              <a href="#faq" className="hover:text-[#FAF7F0] transition-colors">
                FAQ
              </a>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onNavigateToScan}
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-[#FAF7F0] bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 transition-colors cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-[#C9A55C]" />
                Scan QR
              </button>
              <PillButton href="#quote" variant="onPhoto" className="h-11 pl-5 pr-1.5 text-xs">
                Get a quote
              </PillButton>
            </div>
          </div>

          {/* Hero Content (Bottom layout) */}
          <div className="relative z-10 pt-24 sm:pt-32 pb-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* Bottom Left: Headline + Nova-style Glass Card */}
            <div className="lg:col-span-7 space-y-6">
              <motion.h1
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="font-serif text-[42px] sm:text-[60px] lg:text-[74px] font-bold tracking-tight text-[#FAF7F0] leading-[1.04] max-w-2xl"
              >
                Never miss a guest request again.
              </motion.h1>

              {/* Glass Card (Nova Aurelia residence reference) */}
              <motion.div
                initial={shouldReduceMotion ? {} : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white/15 backdrop-blur-md border border-white/25 rounded-[20px] p-3.5 sm:p-4 text-white flex items-center justify-between gap-4 max-w-md shadow-2xl"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src="/brand/demo-house.jpg"
                    alt="Sunset Lodge"
                    className="w-14 h-14 rounded-[14px] object-cover shrink-0 border border-white/20"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#FAF7F0]/75 font-medium tracking-wide">
                      Sunset Lodge · Lusaka
                    </p>
                    <p className="text-[14px] font-bold text-[#FAF7F0] truncate">
                      {sampleRequests[requestIdx].title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          stepIdx === 2
                            ? 'bg-[#1F4D3A]'
                            : stepIdx === 1
                            ? 'bg-[#C9A55C]'
                            : 'bg-amber-400'
                        } animate-pulse`}
                      />
                      <span className="text-[12px] font-medium text-[#FAF7F0]/90">
                        {sampleRequests[requestIdx].steps[stepIdx]}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tiny switcher buttons */}
                <div className="flex flex-col gap-1 shrink-0 border-l border-white/20 pl-3">
                  <button
                    onClick={prevRequest}
                    className="p-1 rounded-md hover:bg-white/20 text-[#FAF7F0]/80 hover:text-white transition-colors cursor-pointer"
                    aria-label="Previous request sample"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={nextRequest}
                    className="p-1 rounded-md hover:bg-white/20 text-[#FAF7F0]/80 hover:text-white transition-colors cursor-pointer"
                    aria-label="Next request sample"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Bottom Right: Value Proposition + Primary CTA */}
            <div className="lg:col-span-5 space-y-4 lg:text-right flex flex-col lg:items-end">
              <p className="text-[16px] sm:text-[18px] text-[#FAF7F0]/90 font-light leading-relaxed max-w-md">
                Guests scan. Your team delivers. You see everything.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                <PillButton
                  onClick={onNavigateToDemo}
                  variant="onPhoto"
                  className="w-full sm:w-auto justify-center"
                >
                  Try the demo
                </PillButton>
                <PillButton
                  onClick={onNavigateToScan}
                  variant="outlinePhoto"
                  className="w-full sm:w-auto justify-center sm:hidden"
                >
                  Scan room QR
                </PillButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. "/ About Shekin" (Nova: "More than property" + stat tiles) */}
      <section id="about" className="py-20 lg:py-32 px-4 sm:px-8 max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-[13px] font-semibold text-[#C9A55C] tracking-widest uppercase">
              / About Shekin
            </span>
            <h2 className="font-serif text-[34px] sm:text-[46px] lg:text-[54px] font-bold text-[#13233A] leading-[1.1] tracking-tight">
              More than a QR code. We run the requests behind it.
            </h2>
            <div className="space-y-4 text-[17px] text-[#5B6575] leading-[1.6]">
              <p>
                Hotels and lodges lose guests over forgotten towels, slow AC repairs, and unread
                WhatsApp messages.
              </p>
              <p>
                Shekin connects every bedside card straight to your front desk and maintenance team,
                giving owners real-time control and zero lost tickets.
              </p>
            </div>
            <div className="pt-2">
              <PillButton href="#how-it-works" variant="primary">
                See how it works
              </PillButton>
            </div>
          </div>

          {/* Right Column: 2x2 Grid of True Product Facts */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tile 1 */}
            <div className="bg-white rounded-[20px] p-7 border border-[#E7E1D4] shadow-xs space-y-3">
              <span className="font-serif text-[42px] sm:text-[50px] font-bold text-[#13233A] leading-none tabular-nums">
                0
              </span>
              <p className="text-[15px] font-medium text-[#5B6575] leading-snug">
                apps to install
              </p>
            </div>

            {/* Tile 2 */}
            <div className="bg-white rounded-[20px] p-7 border border-[#E7E1D4] shadow-xs space-y-3">
              <span className="font-serif text-[42px] sm:text-[50px] font-bold text-[#13233A] leading-none tabular-nums">
                2 taps
              </span>
              <p className="text-[15px] font-medium text-[#5B6575] leading-snug">
                to ask for anything
              </p>
            </div>

            {/* Tile 3 (Highlighted in Navy per Nova reference) */}
            <div className="bg-[#13233A] rounded-[20px] p-7 border border-[#13233A] text-white shadow-md space-y-3">
              <span className="font-serif text-[42px] sm:text-[50px] font-bold text-[#FAF7F0] leading-none tabular-nums">
                Live
              </span>
              <p className="text-[15px] font-medium text-[#FAF7F0]/80 leading-snug">
                every request, every house
              </p>
            </div>

            {/* Tile 4 */}
            <div className="bg-white rounded-[20px] p-7 border border-[#E7E1D4] shadow-xs space-y-3">
              <span className="font-serif text-[42px] sm:text-[50px] font-bold text-[#13233A] leading-none tabular-nums">
                Same day
              </span>
              <p className="text-[15px] font-medium text-[#5B6575] leading-snug">
                cards printed & team live
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "/ How it works" (Nova: numbered list with one expanded row) */}
      <section id="how-it-works" className="py-20 lg:py-32 px-4 sm:px-8 max-w-[1200px] mx-auto border-t border-[#E7E1D4]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end mb-12">
          <div className="lg:col-span-7 space-y-3">
            <span className="text-[13px] font-semibold text-[#C9A55C] tracking-widest uppercase">
              / How it works
            </span>
            <h2 className="font-serif text-[34px] sm:text-[46px] lg:text-[54px] font-bold text-[#13233A] leading-[1.1] tracking-tight">
              Three steps. No app.
            </h2>
          </div>
          <div className="lg:col-span-5 text-[#5B6575] text-[17px] leading-[1.6]">
            Guests point their ordinary phone camera at the card in their room. No downloads, no
            passwords, no messy WhatsApp groups.
          </div>
        </div>

        {/* Numbered Rows Accordion */}
        <div className="border-t border-[#E7E1D4]">
          {steps.map((step, idx) => {
            const isOpen = activeStep === idx;
            return (
              <div
                key={step.num}
                className="border-b border-[#E7E1D4] transition-colors"
              >
                {/* Collapsed / Row Header */}
                <button
                  onClick={() => setActiveStep(idx)}
                  className="w-full py-6 flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-6 sm:gap-10">
                    <span className="text-[16px] font-mono font-semibold text-[#C9A55C]">
                      {step.num}
                    </span>
                    <h3 className="font-serif text-[22px] sm:text-[28px] font-bold text-[#13233A] group-hover:text-[#C9A55C] transition-colors">
                      {step.title}
                    </h3>
                  </div>
                  <span
                    className={`w-9 h-9 rounded-full border border-[#E7E1D4] flex items-center justify-center transition-all ${
                      isOpen
                        ? 'bg-[#13233A] text-white rotate-45'
                        : 'bg-white text-[#13233A] group-hover:border-[#13233A]'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                  </span>
                </button>

                {/* Expanded Content (Left image, Right text) */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pb-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-2">
                        <div className="lg:col-span-7">
                          <div className="rounded-[20px] overflow-hidden aspect-[16/10] bg-stone-200 border border-[#E7E1D4] shadow-sm">
                            <img
                              src={step.img}
                              alt={step.title}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        <div className="lg:col-span-5 space-y-4">
                          <span className="text-[12px] font-mono uppercase tracking-wider text-[#C9A55C] font-semibold">
                            Step {step.num} of 04
                          </span>
                          <h4 className="font-serif text-[24px] font-bold text-[#13233A]">
                            {step.title}
                          </h4>
                          <p className="text-[17px] text-[#5B6575] leading-[1.6]">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. "/ Why Shekin" (Nova: list + tall image) */}
      <section id="why-shekin" className="py-20 lg:py-32 px-4 sm:px-8 max-w-[1200px] mx-auto border-t border-[#E7E1D4]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Mobile Image (on top per spec) */}
          <div className="lg:hidden">
            <div className="rounded-[24px] overflow-hidden h-[55vh] max-h-[460px] border border-[#E7E1D4] shadow-lg">
              <img
                src="/brand/door-open.png"
                alt="Shekin hospitality doorway"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Left: Headline + 4 rows */}
          <div className="lg:col-span-7 space-y-8">
            <div className="space-y-3">
              <span className="text-[13px] font-semibold text-[#C9A55C] tracking-widest uppercase">
                / Why Shekin
              </span>
              <h2 className="font-serif text-[34px] sm:text-[46px] lg:text-[54px] font-bold text-[#13233A] leading-[1.1] tracking-tight">
                A calmer way to run your stay.
              </h2>
            </div>

            <div className="space-y-6">
              {[
                {
                  title: 'Messages stop getting lost',
                  desc: 'No direct WhatsApp chats with individual staff that get buried or forgotten on shift changes.',
                },
                {
                  title: 'Owners see who did what',
                  desc: 'Every ticket has a timestamp, the assigned worker name, and completion verification.',
                },
                {
                  title: 'Check-outs never slip',
                  desc: 'Housekeeping receives immediate room turnaround notification so incoming guests never wait.',
                },
                {
                  title: 'Your own branding on every screen',
                  desc: 'Your property photos, colors, amenities, and house rules appear seamlessly on every guest device.',
                },
              ].map((item) => (
                <div key={item.title} className="pb-5 border-b border-[#E7E1D4] space-y-1.5">
                  <h3 className="font-serif text-[20px] font-bold text-[#13233A]">
                    {item.title}
                  </h3>
                  <p className="text-[16px] text-[#5B6575] leading-[1.6]">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Right: Tall rounded image */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="rounded-[24px] overflow-hidden h-[620px] border border-[#E7E1D4] shadow-xl">
              <img
                src="/brand/door-open.png"
                alt="Shekin hospitality doorway"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 5. Demo Band (Luvora: photo card with centered CTAs) */}
      <section id="demo" className="px-3 sm:px-4 max-w-[1200px] mx-auto py-10">
        <div className="relative rounded-[24px] overflow-hidden bg-[#13233A] text-white p-10 sm:p-16 lg:p-20 text-center shadow-xl">
          <img
            src="/brand/demo-house.jpg"
            alt="Demo property"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#13233A]/95 via-[#13233A]/85 to-[#13233A]/90 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="text-[12px] font-semibold text-[#C9A55C] tracking-widest uppercase">
              / Experience Shekin
            </span>
            <h2 className="font-serif text-[34px] sm:text-[48px] lg:text-[56px] font-bold text-[#FAF7F0] leading-[1.08]">
              See what your guests see.
            </h2>
            <p className="text-[17px] text-[#FAF7F0]/85 font-light leading-relaxed">
              Test sending a live request from a sample room, watch how dispatch works, and feel the
              speed of instant service.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PillButton onClick={onNavigateToDemo} variant="onPhoto">
                Open the live demo
              </PillButton>
              <PillButton onClick={onNavigateToScan} variant="outlinePhoto">
                Scan a room QR
              </PillButton>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Quote Section (Nova: card overlay over dark photo) */}
      <section id="quote" className="py-20 px-3 sm:px-4 max-w-[1200px] mx-auto scroll-mt-20">
        <div className="relative rounded-[24px] overflow-hidden bg-[#13233A] shadow-2xl min-h-[680px] flex items-center p-4 sm:p-10 lg:p-14">
          <img
            src="/brand/hero.jpg"
            alt="Hospitality lodge"
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#13233A]/95 via-[#13233A]/85 to-transparent pointer-events-none" />

          {/* Form Card */}
          <div className="relative z-10 bg-white rounded-[24px] p-6 sm:p-10 border border-[#E7E1D4] shadow-2xl max-w-xl w-full">
            <div className="space-y-2 mb-6">
              <span className="text-[13px] font-semibold text-[#C9A55C] tracking-widest uppercase">
                / Pricing & Onboarding
              </span>
              <h2 className="font-serif text-[28px] sm:text-[36px] font-bold text-[#13233A] leading-tight">
                Get a quote for your property
              </h2>
              <p className="text-[15px] text-[#5B6575] leading-relaxed">
                Pricing is tailored to your room count. We design and print your cards, and get your team live the same day.
              </p>
            </div>

            {submittedName ? (
              <div className="p-8 bg-[#FAF7F0] rounded-[20px] border border-[#C9A55C]/40 text-center space-y-5 animate-fade-in">
                <div className="w-14 h-14 rounded-full bg-[#1F4D3A]/10 text-[#1F4D3A] flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-[#13233A]">
                  Thanks, {submittedName}!
                </h3>
                <p className="text-[14px] text-[#5B6575] leading-relaxed max-w-md mx-auto">
                  We’ve received your quote request and will WhatsApp you within 24 hours with custom pricing for your property.
                </p>
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#1F4D3A] hover:bg-[#1F4D3A]/90 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" /> Or chat now on WhatsApp
                  </a>
                  <button
                    onClick={() => setSubmittedName(null)}
                    className="w-full sm:w-auto px-5 py-3 rounded-full border border-[#E7E1D4] text-[#13233A] text-xs font-medium hover:bg-white cursor-pointer"
                  >
                    Submit another request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-4">
                {/* Honeypot field (hidden from users, traps bots) */}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#13233A] mb-1">
                      Your Name <span className="text-[#C9A55C]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Chileshe Mwamba"
                      className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] placeholder:text-stone-400 focus:outline-none focus:border-[#13233A] focus:ring-1 focus:ring-[#13233A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#13233A] mb-1">
                      Property Name <span className="text-[#C9A55C]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.propertyName}
                      onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                      placeholder="e.g. Zambezi Sun Lodge"
                      className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] placeholder:text-stone-400 focus:outline-none focus:border-[#13233A] focus:ring-1 focus:ring-[#13233A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#13233A] mb-1">
                      Property Type <span className="text-[#C9A55C]">*</span>
                    </label>
                    <select
                      value={formData.propertyType}
                      onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] focus:outline-none focus:border-[#13233A]"
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
                    <label className="block text-xs font-semibold text-[#13233A] mb-1">
                      Rooms / Houses <span className="text-[#C9A55C]">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      required
                      value={formData.roomCount}
                      onChange={(e) => setFormData({ ...formData, roomCount: e.target.value })}
                      placeholder="e.g. 12"
                      className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] placeholder:text-stone-400 focus:outline-none focus:border-[#13233A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#13233A] mb-1">
                      Town / City <span className="text-[#C9A55C]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Lusaka"
                      className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] placeholder:text-stone-400 focus:outline-none focus:border-[#13233A]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#13233A] mb-1">
                      WhatsApp Number <span className="text-[#C9A55C]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.whatsappPhone}
                      onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                      placeholder="+260 97 ..."
                      className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] placeholder:text-stone-400 focus:outline-none focus:border-[#13233A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#13233A] mb-1">
                      Email <span className="text-[#5B6575] font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="owner@property.zm"
                      className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] placeholder:text-stone-400 focus:outline-none focus:border-[#13233A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#13233A] mb-1">
                    Message or specific notes <span className="text-[#5B6575] font-normal">(Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Tell us about your property, current challenges, or launch timeline..."
                    className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#E7E1D4] bg-[#FAF7F0]/40 text-base text-[#13233A] placeholder:text-stone-400 focus:outline-none focus:border-[#13233A]"
                  />
                </div>

                <div className="pt-2">
                  <PillButton
                    type="submit"
                    disabled={isSubmitting}
                    variant="primary"
                    className="w-full justify-center"
                  >
                    {isSubmitting ? 'Sending your quote request...' : 'Get my quote'}
                  </PillButton>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* 7. FAQ (Luvora split layout) */}
      <section id="faq" className="py-20 lg:py-32 px-4 sm:px-8 max-w-[1200px] mx-auto border-t border-[#E7E1D4]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          {/* Left Column */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[13px] font-semibold text-[#C9A55C] tracking-widest uppercase">
              / FAQ
            </span>
            <h2 className="font-serif text-[42px] sm:text-[56px] font-bold text-[#13233A] leading-tight">
              Questions?
            </h2>
            <p className="text-[17px] text-[#5B6575] leading-[1.6]">
              Everything you need to know about setting up Shekin at your property.
            </p>
            <div className="pt-4">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#13233A] hover:text-[#C9A55C] transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#1F4D3A]" />
                <span>Chat with us on WhatsApp for custom questions →</span>
              </a>
            </div>
          </div>

          {/* Right Column: Accordion */}
          <div className="lg:col-span-7 divide-y divide-[#E7E1D4]">
            {faqItems.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q} className="py-5">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left cursor-pointer group"
                  >
                    <span className="font-serif text-[19px] sm:text-[21px] font-bold text-[#13233A] group-hover:text-[#C9A55C] transition-colors pr-4">
                      {item.q}
                    </span>
                    <span
                      className={`w-8 h-8 rounded-full border border-[#E7E1D4] flex items-center justify-center shrink-0 transition-transform ${
                        isOpen ? 'bg-[#13233A] text-white' : 'bg-white text-[#13233A]'
                      }`}
                    >
                      {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <p className="text-[16px] text-[#5B6575] leading-[1.6] pt-3 pr-6">
                          {item.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Footer (Navy + Giant cropped wordmark) */}
      <footer className="bg-[#13233A] text-[#FAF7F0] rounded-t-[32px] overflow-hidden pt-16 sm:pt-20 pb-8 px-4 sm:px-8 mt-12">
        <div className="max-w-[1200px] mx-auto space-y-16">
          {/* Top Columns */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Column 1: Brand & Product links */}
            <div className="md:col-span-5 space-y-4">
              <Logo variant="full" size="md" tone="onDark" />
              <p className="text-[14px] text-[#FAF7F0]/70 max-w-sm leading-relaxed">
                The QR room service and guest operations platform built for lodges, boutique hotels,
                and holiday homes.
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-[#FAF7F0]/80 pt-2">
                <a href="#how-it-works" className="hover:text-white transition-colors">
                  How it works
                </a>
                <span>·</span>
                <button
                  onClick={onNavigateToDemo}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Demo
                </button>
                <span>·</span>
                <a href="#quote" className="hover:text-white transition-colors">
                  Pricing
                </a>
                <span>·</span>
                <a href="#faq" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </div>
            </div>

            {/* Column 2: Guests */}
            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-widest text-[#C9A55C] font-semibold">
                Guests
              </h4>
              <p className="text-xs text-[#FAF7F0]/70 leading-relaxed">
                Staying at a property? No app needed. Scan the card in your room.
              </p>
              <button
                onClick={onNavigateToScan}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#FAF7F0] hover:text-[#C9A55C] transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4 text-[#C9A55C]" />
                <span>Scan room QR card</span>
              </button>
            </div>

            {/* Column 3: Contact */}
            <div className="md:col-span-4 space-y-3">
              <h4 className="text-xs uppercase font-mono tracking-widest text-[#C9A55C] font-semibold">
                Contact & Support
              </h4>
              <p className="text-xs text-[#FAF7F0]/70">Lusaka, Zambia (CAT GMT+2)</p>
              <a
                href="https://wa.me/260979850598"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#FAF7F0] hover:text-[#C9A55C] transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-[#1F4D3A]" />
                <span>WhatsApp: +260 97 985 0598</span>
              </a>
              <div className="pt-2">
                <button
                  onClick={onNavigateToStaff}
                  className="text-xs text-[#FAF7F0]/60 hover:text-white underline transition-colors cursor-pointer"
                >
                  Staff & owner sign in →
                </button>
              </div>
            </div>
          </div>

          {/* Giant Cropped "Shekin" Wordmark (Cream at 10% opacity) */}
          <div className="relative border-t border-white/10 pt-10 select-none pointer-events-none overflow-hidden">
            <div className="flex items-baseline justify-center sm:justify-start gap-4 sm:gap-8">
              <span className="font-serif font-bold text-[22vw] sm:text-[19vw] leading-[0.72] tracking-tight text-[#FAF7F0]/10">
                Shekin
              </span>
              <div className="hidden sm:block w-[6vw] h-[6vw] max-w-[80px] max-h-[80px] opacity-25">
                <Logo variant="mark" size="lg" tone="onDark" />
              </div>
            </div>
          </div>

          {/* Bottom Line */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#FAF7F0]/60 pt-4 border-t border-white/5">
            <div>© {new Date().getFullYear()} Shekin · All rights reserved · Privacy</div>
            <div>Built for hospitality in Zambia</div>
          </div>
        </div>
      </footer>
    </div>
  );
};
