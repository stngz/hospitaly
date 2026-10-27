import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { 
  ChevronRight,
  Copy,
  Check,
  MapPin,
  X,
  AlertCircle,
  Wifi,
  Clock,
  ShieldCheck,
  ExternalLink,
  History,
  Phone,
  Sparkles,
  Compass,
  Car,
  Headset,
  UtensilsCrossed,
  ConciergeBell,
  Waves,
  Bath,
  ChefHat,
  Wind,
  Sun,
  Coffee,
  Feather,
  Droplet,
  Moon,
  Volume2,
  VolumeX,
  Zap,
  ArrowRight,
  Radio,
  Send,
  Building2,
  ShoppingBag
} from 'lucide-react';

interface GuestHomeProps {
  onNavigate: (view: string, data?: any) => void;
  onOpenQRScanner?: () => void;
}

interface BedsideReceptor {
  id: string;
  label: string;
  category: 'housekeeping' | 'dining' | 'concierge' | 'maintenance';
  icon: any;
  desc: string;
  eta: string;
}

export const GuestHome: React.FC<GuestHomeProps> = ({ onNavigate, onOpenQRScanner }) => {
  const { property, room, stayState, isInvalidToken } = useTenant();

  const [copiedWifi, setCopiedWifi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [isFrontDeskOpen, setIsFrontDeskOpen] = useState(false);
  const [isNightstandOpen, setIsNightstandOpen] = useState(false);
  const [selectedReceptor, setSelectedReceptor] = useState<BedsideReceptor | null>(null);
  const [isDndActive, setIsDndActive] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('Knock softly');
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString('en-GB', {
      timeZone: property?.timezone || 'Africa/Lusaka',
      hour: '2-digit',
      minute: '2-digit',
    })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-GB', {
          timeZone: property?.timezone || 'Africa/Lusaka',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 30000);
    return () => clearInterval(timer);
  }, [property?.timezone]);

  // Receptors designed specifically for bedside in-room needs (no food/drinks when dining is disabled)
  const isDiningEnabled = property?.diningEnabled !== false;
  const unitLabel = property?.unitLabel || 'House';

  const BEDSIDE_RECEPTORS: BedsideReceptor[] = isDiningEnabled
    ? [
        {
          id: 'ice',
          label: 'Ice Bucket',
          category: 'dining',
          icon: Sparkles,
          desc: 'Freshly prepared crushed ice & insulated silver bucket with tongs',
          eta: '~8-10 mins',
        },
        {
          id: 'coffee',
          label: 'Espresso / Coffee',
          category: 'dining',
          icon: Coffee,
          desc: 'Freshly pressed artisanal roast coffee with whole milk & demerara sugar',
          eta: '~10-12 mins',
        },
        {
          id: 'towels',
          label: 'Plush Towels',
          category: 'housekeeping',
          icon: Waves,
          desc: 'Set of two oversized, warm Egyptian cotton bath sheets',
          eta: '~10-15 mins',
        },
        {
          id: 'pillows',
          label: 'Feather Pillows',
          category: 'housekeeping',
          icon: Feather,
          desc: 'Two hypoallergenic Hungarian goose-down pillows & soft duvet fresh refresh',
          eta: '~12-15 mins',
        },
        {
          id: 'water',
          label: 'Mineral Water',
          category: 'dining',
          icon: Droplet,
          desc: 'Chilled 750ml glass bottle of San Pellegrino mineral water with lemon slices',
          eta: '~6-8 mins',
        },
        {
          id: 'dnd',
          label: 'Do Not Disturb',
          category: 'concierge',
          icon: Moon,
          desc: 'Privacy toggle: alerts reception & room attendants to refrain from door knocks',
          eta: 'Instant',
        },
      ]
    : [
        {
          id: 'towels',
          label: 'Plush Towels',
          category: 'housekeeping',
          icon: Waves,
          desc: 'Set of two oversized, warm Egyptian cotton bath sheets',
          eta: '~10-15 mins',
        },
        {
          id: 'pool_towels',
          label: 'Pool Towels',
          category: 'housekeeping',
          icon: Waves,
          desc: 'Extra absorbent, quick-drying sun lounger pool towels for the private pool',
          eta: '~10-12 mins',
        },
        {
          id: 'pillows',
          label: 'Feather Pillows',
          category: 'housekeeping',
          icon: Feather,
          desc: 'Two hypoallergenic Hungarian goose-down pillows & soft duvet fresh refresh',
          eta: '~12-15 mins',
        },
        {
          id: 'hot_tub',
          label: 'Hot Tub Jets / Heat',
          category: 'maintenance',
          icon: Bath,
          desc: 'Request temperature boost or jet nozzle check for your private hot tub',
          eta: '~15-20 mins',
        },
        {
          id: 'ac_check',
          label: 'AC & Climate Check',
          category: 'maintenance',
          icon: Wind,
          desc: 'Air conditioning inverter temperature and remote control check',
          eta: '~15 mins',
        },
        {
          id: 'dnd',
          label: 'Do Not Disturb',
          category: 'concierge',
          icon: Moon,
          desc: 'Privacy toggle: alerts reception & house attendants to refrain from gate knocks',
          eta: 'Instant',
        },
      ];

  // Reactive store subscriptions
  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  const renderAmenityIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'pool':
        return <Waves className="w-3.5 h-3.5 text-brand-secondary shrink-0" />;
      case 'hot_tub':
        return <Bath className="w-3.5 h-3.5 text-brand-secondary shrink-0" />;
      case 'kitchen':
        return <ChefHat className="w-3.5 h-3.5 text-brand-secondary shrink-0" />;
      case 'ac_unit':
        return <Wind className="w-3.5 h-3.5 text-brand-secondary shrink-0" />;
      case 'deck':
        return <Sun className="w-3.5 h-3.5 text-brand-secondary shrink-0" />;
      case 'restaurant':
        return <UtensilsCrossed className="w-3.5 h-3.5 text-brand-secondary shrink-0" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-brand-secondary shrink-0" />;
    }
  };

  if (!property) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-10 h-10 text-amber-600 mb-3" />
        <h1 className="text-xl font-serif text-stone-800 mb-2">Hospitality Property Loading</h1>
        <p className="text-stone-600 text-xs mb-4">Please wait while your guest session initializes...</p>
      </div>
    );
  }

  // 1. Invalid or Revoked QR Code Screen
  if (stayState.status === 'invalid_token') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col justify-between p-6">
        <div className="space-y-6 pt-8 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block mb-1">
              {property.name}
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-900">
              Invalid Access Code
            </h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              {stayState.errorMessage ||
                'This QR code is invalid, revoked, or unassigned. Possession of an outdated or unassigned link does not grant guest access.'}
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs text-left space-y-2">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wide block">
              How to access in-house services:
            </span>
            <p className="text-xs text-stone-600 leading-relaxed">
              Please use your smartphone camera to scan the physical QR plaque inside your house, or contact reception to verify your stay.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-200 max-w-sm mx-auto w-full space-y-2">
          {property.contactPhone && (
            <a
              href={`tel:${property.contactPhone}`}
              className="w-full py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Call Reception ({property.contactPhone})</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // 2. Unoccupied House Screen (Posession of QR code alone does not grant access)
  if (stayState.status === 'unoccupied') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col justify-between p-6">
        <div className="space-y-6 pt-8 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mx-auto shadow-xs">
            <Building2 className="w-8 h-8 text-amber-700" />
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block mb-1">
              {property.name} &bull; {stayState.houseName || 'House'}
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-900">
              House Awaiting Check-In
            </h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              This house does not currently have an active guest stay registered. For your privacy and security, private guest services, Wi-Fi credentials, and request tracking will activate once check-in is recorded.
            </p>
          </div>

          <div className="p-4 bg-white rounded-2xl border border-stone-200/80 shadow-xs text-left space-y-2">
            <div className="flex items-center gap-2 text-stone-700 font-semibold text-xs">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Just arrived?</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Please contact reception or your host. Once reception completes check-in, refresh this page to instantly access your in-house guest services.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-200 max-w-sm mx-auto w-full space-y-2">
          {property.contactPhone && (
            <a
              href={`tel:${property.contactPhone}`}
              className="w-full py-3 bg-emerald-950 text-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs"
            >
              <Phone className="w-4 h-4" />
              <span>Contact Host &bull; Reception</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  // 3. Checked Out Screen
  if (stayState.status === 'checked_out') {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 flex flex-col justify-between p-6">
        <div className="space-y-6 pt-8 text-center max-w-sm mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-stone-100 border border-stone-200 text-stone-600 flex items-center justify-center mx-auto shadow-xs">
            <Check className="w-8 h-8 text-emerald-700" />
          </div>

          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold block mb-1">
              {property.name}
            </span>
            <h1 className="text-2xl font-serif font-bold text-stone-900">
              Stay Completed
            </h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed">
              Your stay has concluded and guest access has ended. We hope you enjoyed your time at {property.name}!
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-200 max-w-sm mx-auto w-full">
          {property.contactPhone && (
            <a
              href={`tel:${property.contactPhone}`}
              className="w-full py-3 bg-stone-900 text-stone-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs"
            >
              <Phone className="w-4 h-4 text-amber-400" />
              <span>Contact Reception</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  const activeRequests = room
    ? allRequests.filter(
        (r) =>
          r.propertyId === property.id &&
          r.roomId === room.id &&
          (r.status === 'pending' || r.status === 'in_progress' || r.status === 'acknowledged')
      )
    : [];

  const latestActiveRequest = activeRequests[0];

  const copyWifi = () => {
    if (property.wifiPassword) {
      navigator.clipboard?.writeText(property.wifiPassword);
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2000);
    }
  };

  const handleInstantDispatchReceptor = (receptor: BedsideReceptor) => {
    if (!room) {
      if (onOpenQRScanner) {
        onOpenQRScanner();
      } else {
        alert('Please scan your room QR plaque to activate in-room service.');
      }
      return;
    }

    if (receptor.id === 'dnd') {
      const nextDnd = !isDndActive;
      setIsDndActive(nextDnd);
      notificationService.triggerHaptic('medium');
      notificationService.notify({
        title: nextDnd ? 'Privacy Active (DND)' : 'Privacy Deactivated',
        subtitle: nextDnd ? 'Front desk alerted. Housekeeping is on hold.' : 'Standard room service resumed.',
        category: 'concierge',
        roomNumber: room.roomNumber,
      });
      setSelectedReceptor(null);
      return;
    }

    // Create the service request with Uber-style instant tracking
    const newReq = dbService.createRequest({
      propertyId: property.id,
      roomId: room.id,
      roomNumber: room.roomNumber,
      category: receptor.category,
      title: `Bedside Express: ${receptor.label}`,
      description: `${receptor.desc}\nDelivery Note: ${deliveryNote}`,
      priority: 'high',
      status: 'pending',
      guestName: room.currentGuestName || `Guest in Room ${room.roomNumber}`,
      guestPhone: room.guestPhone || '',
    });

    setSelectedReceptor(null);
    onNavigate('status', { requestId: newReq.id });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-stone-900 selection:bg-amber-100">
      
      {/* 1. EDGE-TO-EDGE TOP HERO IMAGE */}
      <div className="relative w-full h-72 overflow-hidden bg-stone-950">
        <img 
          src={property.coverImageUrl} 
          alt={property.name} 
          fetchPriority="high"
          decoding="async"
          className="h-72 w-full object-cover brightness-[0.78]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/30 to-stone-950/70" />

        {/* Subtle Top Header Overlay */}
        <header className="absolute top-0 inset-x-0 z-10 px-5 pt-5 pb-3 flex justify-between items-center text-white">
          <div>
            <span className="text-[10px] tracking-widest uppercase font-mono font-medium text-stone-300 block">
              {property.name}
            </span>
            <div className="text-xs font-medium tracking-tight text-white/90 flex items-center gap-1.5 mt-0.5">
              {room ? (
                <>
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{room.currentGuestName ? 'Welcome to Bobo' : `${unitLabel} ${room.roomNumber}`}</span>
                  <span className="text-white/60 font-mono text-[10px]">&bull; {room.roomNumber}</span>
                </>
              ) : (
                <span className="text-white/70 text-[11px] font-mono">
                  In-House Guest Portal &bull; {property.city}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsNightstandOpen(true)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-[0.92] backdrop-blur-md border border-white/20 text-amber-200 shadow-xs transition-all cursor-pointer"
              title="Open Bedside Nightstand Mode"
            >
              <Moon className="w-4 h-4" />
            </button>

            <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xs font-serif font-bold text-amber-200 overflow-hidden shadow-xs">
              {property.logoUrl ? (
                <img src={property.logoUrl} alt={property.name} className="w-full h-full object-cover" />
              ) : (
                property.name.split(' ').map(w => w[0]).slice(0, 2).join('')
              )}
            </div>
          </div>
        </header>

        {/* Hero Lower Title */}
        <div className="absolute bottom-9 inset-x-0 px-6 z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-mono tracking-wider text-amber-300/90 uppercase mb-1">
            <MapPin className="w-3.5 h-3.5 text-amber-300" />
            <span>{property.city}, {property.country} &bull; {room ? `${unitLabel} ${room.roomNumber}` : 'Holiday House'}</span>
          </div>
          <h1 className="text-2xl font-serif text-white font-medium tracking-tight leading-snug">
            {room ? (
              <>
                Welcome to Bobo
                <span className="block italic font-serif text-amber-100/80 text-sm font-light mt-0.5">
                  {room.roomNumber} &bull; Furnished Holiday House
                </span>
              </>
            ) : (
              <>
                {property.name}
                <span className="block italic font-serif text-amber-100/80 text-sm font-light mt-0.5">
                  Private holiday houses & in-house guest services.
                </span>
              </>
            )}
          </h1>
        </div>
      </div>

      {/* 2. SLEEK OVERLAPPING CONTENT SHEET */}
      <div className="relative -mt-6 rounded-t-3xl bg-[#FDFBF7] px-5 pt-6 z-20 space-y-6 pb-32 shadow-sm">
        
        {/* Invalid QR / Unrecognized Key Alert */}
        {isInvalidToken && (
          <div className="p-3.5 bg-rose-950 text-white rounded-2xl border border-rose-800 shadow-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block text-rose-200">Unrecognized Room Token</span>
              <span className="text-stone-300 text-[11px]">
                Please scan the official QR plaque in your room to activate bedside dispatch.
              </span>
            </div>
          </div>
        )}

        {/* Unattached Session Notice (Root URL direct visit) */}
        {!room && !isInvalidToken && (
          <div className="p-3.5 bg-stone-900 text-stone-200 rounded-2xl border border-stone-800 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-semibold block text-stone-100">Welcome to Rocks Apartments</span>
                <span className="text-stone-400 text-[11px]">Scan your room QR plaque to unlock bedside dispatch.</span>
              </div>
            </div>
            {onOpenQRScanner && (
              <button
                type="button"
                onClick={onOpenQRScanner}
                className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-stone-950 text-[11px] font-bold shrink-0 active:scale-95 transition-transform"
              >
                Scan QR
              </button>
            )}
          </div>
        )}
        
        {/* a) UBER-STYLE LIVE ACTIVITY BAR (If an order is currently active!) */}
        {latestActiveRequest && (
          <div 
            onClick={() => onNavigate('status', { requestId: latestActiveRequest.id })}
            role="button"
            tabIndex={0}
            className="w-full bg-stone-950 text-white rounded-2xl p-4 border border-stone-800 shadow-modal flex items-center justify-between active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold relative shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                    Live Dispatch
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <h4 className="text-xs font-semibold text-white truncate max-w-[200px]">
                  {latestActiveRequest.title}
                </h4>
                <p className="text-[11px] text-stone-400">
                  {latestActiveRequest.status === 'in_progress' ? 'Attendant heading to your room' : 'Staff assigned • Tap to track'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300">
              <span>Track</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* b) BEDSIDE RECEPTORS HUB (The core feature requested by user!) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 font-bold block">
                Bedside Receptors
              </span>
              <p className="text-xs text-stone-600 font-medium mt-0.5">
                1-tap express orders dispatched directly to your bed
              </p>
            </div>
            {isDndActive && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono text-[10px] font-bold border border-rose-200">
                DND Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {BEDSIDE_RECEPTORS.map((receptor) => {
              const Icon = receptor.icon;
              const isDnd = receptor.id === 'dnd';
              return (
                <button
                  key={receptor.id}
                  onClick={() => setSelectedReceptor(receptor)}
                  className={`group relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all select-none active:scale-[0.95] shadow-2xs ${
                    isDnd && isDndActive
                      ? 'bg-rose-50 border-rose-300 text-rose-900'
                      : 'bg-white border-stone-200/90 hover:border-amber-400/70 text-stone-800'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                    isDnd && isDndActive 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-stone-100 group-hover:bg-amber-100 text-stone-700 group-hover:text-amber-900'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold block leading-tight">
                    {receptor.label}
                  </span>
                  <span className="text-[10px] font-mono text-stone-400 mt-1 block">
                    {receptor.eta}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* c) Sleek Horizontal Pill Bar for Quick Amenities */}
        {property.amenities && property.amenities.length > 0 && (
          <div className="overflow-x-auto no-scrollbar -mx-5 px-5">
            <div className="flex items-center gap-2 w-max pb-1">
              {property.amenities.map((amenity, idx) => (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/80 text-stone-700 text-xs font-medium shadow-2xs"
                >
                  {renderAmenityIcon(amenity.icon)}
                  <span className="whitespace-nowrap">{amenity.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* d) Two Refined Editorial Action Cards */}
        <section className="grid grid-cols-2 gap-3.5">
          {/* Action 1: House Guide (when dining disabled) or In-Room Dining */}
          <button
            onClick={() => onNavigate('dining')}
            className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-amber-400/50 shadow-2xs text-left min-h-[148px] active:scale-[0.97] transition-all select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center group-hover:bg-amber-400 group-hover:text-stone-950 transition-colors shadow-2xs">
              {isDiningEnabled ? <UtensilsCrossed className="w-5 h-5" /> : <Waves className="w-5 h-5" />}
            </div>
            <div className="mt-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block mb-0.5 font-semibold">
                {isDiningEnabled ? 'Kitchen' : 'Holiday House'}
              </span>
              <span className="text-base font-serif font-bold text-stone-900 block leading-tight">
                {isDiningEnabled ? 'In-Room Dining' : 'House Guide'}
              </span>
              <span className="text-[11px] text-stone-500 block mt-1 leading-snug">
                {isDiningEnabled ? 'Culinary orders & room delivery' : 'Pool, hot tub & house guide'}
              </span>
            </div>
          </button>

          {/* Action 2: Request Service */}
          <button
            onClick={() => onNavigate('request')}
            className="group relative flex flex-col justify-between p-4 rounded-2xl bg-white border border-stone-200/80 hover:border-stone-400 shadow-2xs text-left min-h-[148px] active:scale-[0.97] transition-all select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center group-hover:bg-stone-900 group-hover:text-white transition-colors shadow-2xs">
              <ConciergeBell className="w-5 h-5" />
            </div>
            <div className="mt-3">
              <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 block mb-0.5 font-semibold">
                Concierge
              </span>
              <span className="text-base font-serif font-bold text-stone-900 block leading-tight">
                Service Request
              </span>
              <span className="text-[11px] text-stone-500 block mt-1 leading-snug">
                Housekeeping, linens & maintenance
              </span>
            </div>
          </button>
        </section>

        {/* Phase 7: Inactive Promotional Card for Errands */}
        <section className="bg-gradient-to-br from-amber-50/80 to-stone-50 border border-amber-900/[0.08] p-4 rounded-2xl shadow-2xs flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100/90 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
              <ShoppingBag className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-stone-900">Local Errands</span>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded">
                  Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-stone-600 mt-0.5 leading-snug">
                Errands coming soon. If you have any questions, please ask.
              </p>
            </div>
          </div>
          {property.contactPhone && (
            <a
              href={`https://wa.me/${property.contactPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `Hello Reception, I have a question regarding local errands/shopping for ${room ? `${unitLabel} ${room.roomNumber}` : 'my stay'}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white border border-stone-200/90 rounded-xl text-[11px] font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 shrink-0 select-none transition-colors"
            >
              Ask Us
            </a>
          )}
        </section>

        {/* e) Minimalist Quick Row */}
        <section className="pt-1">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 font-semibold">
              Residence Services
            </span>
            <span className="text-[10px] text-stone-400 font-mono">Direct dispatch</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Housekeeping', icon: Sparkles, action: () => onNavigate('request', { category: 'housekeeping' }) },
              { label: 'Concierge', icon: Compass, action: () => onNavigate('request', { category: 'concierge' }) },
              { label: 'Transport', icon: Car, action: () => onNavigate('request', { category: 'transport' }) },
              { label: 'Front Desk', icon: Headset, action: () => setIsFrontDeskOpen(true) },
            ].map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={item.action}
                  className="flex flex-col items-center gap-2 group text-center active:scale-[0.95] transition-transform p-1 select-none"
                >
                  <div className="w-12 h-12 rounded-2xl border border-stone-200/90 bg-white flex items-center justify-center text-stone-700 group-hover:border-stone-400 group-hover:text-stone-900 group-hover:bg-stone-50 transition-all shadow-2xs">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-stone-600 group-hover:text-stone-900 tracking-tight leading-tight">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* f) Good to Know - Wi-Fi, Checkout & Contact */}
        <section className="pt-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-stone-400 font-semibold block mb-1 px-0.5">
            Good to Know
          </span>
          <div className="divide-y divide-stone-200/70">
            {/* Wi-Fi with Instant Copy */}
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800">High-Speed Wi-Fi</p>
                  <p className="text-[11px] text-stone-500 font-mono">Network: {property.wifiName}</p>
                </div>
              </div>
              {property.wifiPassword && (
                <button
                  onClick={copyWifi}
                  className="text-xs font-mono font-medium px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg active:scale-[0.96] transition-all flex items-center gap-1.5 select-none"
                  title="Click to copy password"
                >
                  <span>{property.wifiPassword}</span>
                  {copiedWifi ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-stone-400" />}
                </button>
              )}
            </div>

            {/* Departure */}
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800">Departure & Checkout</p>
                  <p className="text-[11px] text-stone-500">
                    {room?.guestCheckOutDate ? (
                      <>
                        Checkout: <span className="font-medium text-stone-800">{room.guestCheckOutDate}</span> ({property.checkOutTime})
                      </>
                    ) : (
                      `Standard checkout at ${property.checkOutTime}`
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onNavigate('request', { category: 'concierge', item: 'Late Checkout Request' })}
                className="text-xs font-medium text-amber-700 hover:underline select-none"
              >
                Extend
              </button>
            </div>

            {/* Front Desk & Reception Assistance */}
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-stone-800">Reception & Duty Manager</p>
                  <p className="text-[11px] text-stone-500">
                    24/7 in-stay guest assistance &bull; Ext 0
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFrontDeskOpen(true)}
                className="text-xs font-mono font-medium px-2.5 py-1 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg active:scale-[0.96] transition-all select-none"
              >
                Contact
              </button>
            </div>
          </div>
        </section>

      </div>

      {/* MODAL / BOTTOM SHEET: BEDSIDE EXPRESS RECEPTOR DISPATCH */}
      {selectedReceptor && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-[modalBackdropIn_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-modal border border-stone-900/[0.08] space-y-4 animate-[sheetSlideUp_260ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shadow-2xs">
                  {React.createElement(selectedReceptor.icon, { className: 'w-5 h-5' })}
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 block">
                    Bedside Express
                  </span>
                  <h3 className="text-sm font-bold text-stone-900">{selectedReceptor.label}</h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedReceptor(null)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 active:scale-[0.92]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {selectedReceptor.desc}
            </p>

            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 flex items-center justify-between text-xs">
              <span className="text-stone-500">Destination:</span>
              <span className="font-mono font-bold text-stone-900">Room {room?.roomNumber || '—'}</span>
            </div>

            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 flex items-center justify-between text-xs">
              <span className="text-stone-500">Estimated Delivery:</span>
              <span className="font-mono font-bold text-amber-900">{selectedReceptor.eta}</span>
            </div>

            {selectedReceptor.id !== 'dnd' && (
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase text-stone-400 font-bold block">
                  Delivery Note:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['Knock softly', 'Leave outside door'].map((note) => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setDeliveryNote(note)}
                      className={`p-2 rounded-xl border text-center transition-all ${
                        deliveryNote === note
                          ? 'bg-stone-900 text-white font-semibold border-stone-900'
                          : 'bg-white border-stone-200 text-stone-600'
                      }`}
                    >
                      {note}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => handleInstantDispatchReceptor(selectedReceptor)}
              className="w-full py-3 bg-stone-900 hover:bg-stone-850 active:scale-[0.98] text-white text-xs font-bold rounded-2xl shadow-elevated flex items-center justify-center gap-2 select-none"
            >
              <span>{selectedReceptor.id === 'dnd' ? (isDndActive ? 'Turn Off DND' : 'Activate Do Not Disturb') : 'Dispatch to Bedside'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL: NIGHTSTAND AMBIENT OLED MODE */}
      {isNightstandOpen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col justify-between p-6 text-white animate-[modalBackdropIn_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-stone-400">
                Nightstand Hub &bull; Room {room?.roomNumber || 'Portal'}
              </span>
            </div>
            <button
              onClick={() => setIsNightstandOpen(false)}
              className="p-2 rounded-full bg-stone-900 text-stone-400 hover:text-white active:scale-[0.92]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Giant Minimalist Clock */}
          <div className="text-center my-auto space-y-3">
            <div className="text-7xl font-serif tracking-tight text-white/95 font-light">
              {currentTime}
            </div>
            <p className="text-xs font-mono text-stone-500 uppercase tracking-widest">
              {property.city} Local Time &bull; {property.name}
            </p>

            <div className="pt-6 flex justify-center gap-3">
              <button
                onClick={() => {
                  const nextDnd = !isDndActive;
                  setIsDndActive(nextDnd);
                  notificationService.triggerHaptic('medium');
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  isDndActive
                    ? 'bg-rose-950/80 border-rose-500 text-rose-200'
                    : 'bg-stone-900 border-stone-800 text-stone-300'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>{isDndActive ? 'DND Is On' : 'Turn On DND'}</span>
              </button>

              <button
                onClick={() => {
                  setIsNightstandOpen(false);
                  onNavigate('request', { category: 'concierge', item: 'Morning Wake-up Call' });
                }}
                className="px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 bg-stone-900 border border-stone-800 text-stone-300 hover:text-white"
              >
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Wake-up Call</span>
              </button>
            </div>
          </div>

          <div className="text-center text-[11px] font-mono text-stone-600">
            Tap screen or exit to return to normal hotel view
          </div>
        </div>
      )}

      {/* MODAL: FRONT DESK & RECEPTION DIRECT DISPATCH */}
      {isFrontDeskOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-[modalBackdropIn_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-modal border border-stone-900/[0.08] space-y-4 animate-[modalContentIn_240ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center shadow-2xs">
                  <Headset className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Hotel Reception Desk</h3>
                  <p className="text-[11px] text-stone-500">Direct In-Stay Assistance</p>
                </div>
              </div>
              <button
                onClick={() => setIsFrontDeskOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 active:scale-[0.92]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => {
                  setIsFrontDeskOpen(false);
                  onNavigate('request', { category: 'concierge', item: 'Late Checkout Request' });
                }}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-bold text-stone-900 block">Late Checkout Request</span>
                  <span className="text-[11px] text-stone-500">Extend departure time past {property.checkOutTime}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              <button
                onClick={() => {
                  setIsFrontDeskOpen(false);
                  onNavigate('request', { category: 'concierge', item: 'Luggage Collection & Porter' });
                }}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-bold text-stone-900 block">Luggage Collection & Porter</span>
                  <span className="text-[11px] text-stone-500">Assistance with luggage to lobby</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>

              <button
                onClick={() => {
                  setIsFrontDeskOpen(false);
                  onNavigate('request', { category: 'concierge', item: 'Morning Wake-up Call' });
                }}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 text-left flex items-center justify-between transition-colors"
              >
                <div>
                  <span className="font-bold text-stone-900 block">Morning Wake-up Call</span>
                  <span className="text-[11px] text-stone-500">Automated or reception call to room phone</span>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            <div className="pt-2 flex gap-2">
              <a
                href={`tel:${property.contactPhone}`}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-stone-600" />
                <span>Call Ext 0</span>
              </a>

              <button
                onClick={() => {
                  setIsFrontDeskOpen(false);
                  onNavigate('request', { category: 'concierge', item: 'Custom In-Room Assistance' });
                }}
                className="flex-1 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Note</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM STICKY NAVIGATION */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-6 py-2.5 flex justify-around items-center z-40 max-w-md mx-auto shadow-lg">
        <button 
          onClick={() => onNavigate('home')} 
          className="flex flex-col items-center gap-0.5 text-stone-900 active:scale-[0.93] transition-transform select-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mb-0.5" />
          <span className="text-[11px] font-bold">Home</span>
        </button>
        <button 
          onClick={() => onNavigate('request')} 
          className="flex flex-col items-center gap-0.5 text-stone-500 hover:text-stone-900 active:scale-[0.93] transition-transform select-none"
        >
          <span className="text-[11px] font-medium">Services</span>
        </button>
        <button 
          onClick={() => onNavigate(isDiningEnabled ? 'dining' : 'dining')} 
          className="flex flex-col items-center gap-0.5 text-stone-500 hover:text-stone-900 active:scale-[0.93] transition-transform select-none"
        >
          <span className="text-[11px] font-medium">{isDiningEnabled ? 'Dining' : 'House Guide'}</span>
        </button>
        <button 
          onClick={() => onNavigate('my-requests')} 
          className="flex flex-col items-center gap-0.5 text-stone-500 hover:text-stone-900 active:scale-[0.93] transition-transform select-none relative"
        >
          {activeRequests.length > 0 && (
            <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-amber-400 text-stone-950 font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
              {activeRequests.length}
            </span>
          )}
          <span className="text-[11px] font-medium">My Orders</span>
        </button>
      </nav>
    </div>
  );
};
