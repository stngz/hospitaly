import React, { useState, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { Room } from '../../types';
import { GuestHeroBanner } from './GuestHeroBanner';
import { WifiCard } from './WifiCard';
import {
  Phone,
  Sparkles,
  Check,
  Clock,
  ChevronRight,
  Plane,
  UtensilsCrossed,
  Waves,
  Feather,
  Wind,
  Moon,
  Radio,
  ShieldAlert,
  Lock,
  QrCode,
  ChefHat,
  MapPin,
} from 'lucide-react';
import { GuestBottomNav } from './GuestBottomNav';

interface GuestHomeProps {
  onNavigate: (view: string, data?: any) => void;
}

const houseTypeLabel = (room: Room) => {
  const map: Record<string, string> = {
    studio: 'Studio',
    '2bhk': '2 BHK',
    '3bhk': '3 BHK',
    '4bhk': '4 BHK',
  };
  return (room.houseType && map[room.houseType]) || room.roomType || undefined;
};

export const GuestHome: React.FC<GuestHomeProps> = ({ onNavigate }) => {
  const { property, room, stayState, clearGuestSession } = useTenant();
  const [dispatchedId, setDispatchedId] = useState<string | null>(null);

  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  // Strict privacy isolation: only show requests belonging to the current room AND current activeStayId
  const activeRequests = room?.activeStayId
    ? allRequests.filter(
        (r) =>
          r.propertyId === property?.id &&
          r.roomId === room.id &&
          (r.stayId === room.activeStayId || r.guestSessionId === room.activeStayId) &&
          (r.status === 'pending' || r.status === 'acknowledged' || r.status === 'in_progress')
      )
    : [];

  if (!property) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] text-stone-800 p-6 text-center">
        <div className="space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-950 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
            Loading Residence...
          </p>
        </div>
      </div>
    );
  }

  const unitName = property.unitLabel || 'House';
  const isDiningEnabled = property.diningEnabled === true;
  const cleanPhone = (property.contactPhone || '+260 97 000 0100').replace(/[^0-9+]/g, '');
  const cleanWaPhone = (property.contactPhone || '+260 97 000 0100').replace(/[^0-9]/g, '');

  // Property Suspended Guard: block requests and show direct reception phone call
  if (property.status === 'suspended') {
    return (
      <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 flex flex-col justify-between p-6">
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-stone-500">
            {property.name}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            Service Paused
          </span>
        </div>

        <div className="my-auto max-w-sm mx-auto w-full bg-white rounded-3xl p-6 border border-stone-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
            <Phone className="w-6 h-6 text-amber-800" />
          </div>
          <h1 className="text-xl font-serif font-bold text-stone-900">Requests are paused</h1>
          <p className="text-sm text-stone-600 leading-relaxed">
            Requests are paused. Please call reception:{' '}
            <strong className="text-stone-900">{property.contactPhone || '+260 97 000 0100'}</strong>
          </p>
          <a
            href={`tel:${cleanPhone}`}
            className="w-full py-3 bg-[#1C3A31] text-[#F7F3EC] font-semibold text-sm rounded-xl flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            <span>Call Reception ({property.contactPhone || '+260 97 000 0100'})</span>
          </a>
        </div>

        <div className="text-center text-xs text-stone-400 pb-2">
          {property.city}, {property.country}
        </div>
      </div>
    );
  }

  // ============================================================================
  // QR & STAY LIFECYCLE ACCESS GATE
  // Guests only gain private house access when they scan an active QR code for
  // an OCCUPIED house with a valid activeStayId.
  // ============================================================================
  if (stayState.status !== 'active' || !room || !room.activeStayId) {
    const isInvalid = stayState.status === 'invalid_token';
    const isUnoccupied = stayState.status === 'unoccupied';
    const isCheckedOut = stayState.status === 'checked_out';

    return (
      <div className="min-h-dvh bg-stone-950 text-stone-100 flex flex-col justify-between p-6 selection:bg-amber-300 selection:text-stone-950">
        {/* Top Property Header */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-serif font-bold text-sm">
              RA
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-300 font-semibold block">
                {property.name}
              </span>
              <span className="text-xs text-stone-400">
                {property.city}, {property.country}
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-stone-900 border border-white/10 text-xs uppercase tracking-wider text-stone-400">
            In-House QR Access
          </span>
        </div>

        {/* Center Lifecycle Status Card */}
        <div className="my-auto max-w-sm mx-auto w-full space-y-5 text-center">
          <div className="p-6 rounded-3xl bg-stone-900/90 border border-white/10 shadow-modal space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-800 border border-amber-400/30 flex items-center justify-center mx-auto">
              {isInvalid ? (
                <ShieldAlert className="w-7 h-7 text-rose-400" />
              ) : isUnoccupied || isCheckedOut ? (
                <Lock className="w-7 h-7 text-amber-400" />
              ) : (
                <QrCode className="w-7 h-7 text-amber-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 block">
                {isInvalid
                  ? 'Unrecognised QR Token'
                  : isUnoccupied
                  ? `${unitName} Currently Unoccupied`
                  : isCheckedOut
                  ? 'Stay Concluded'
                  : `Private ${unitName} Portal`}
              </span>
              <h1 className="text-2xl font-serif font-bold text-white leading-tight">
                {isInvalid
                  ? 'Invalid or Revoked QR Code'
                  : isUnoccupied
                  ? `${stayState.houseName || unitName} Awaiting Check-In`
                  : isCheckedOut
                  ? 'Thank You for Staying With Us'
                  : `Scan Your In-${unitName} QR Code`}
              </h1>
              <p className="text-xs text-stone-300 leading-relaxed pt-1">
                {stayState.errorMessage ||
                  `To protect guest privacy and ensure requests reach your exact ${unitName.toLowerCase()}, please scan the physical QR plaque inside your ${unitName.toLowerCase()} after check-in.`}
              </p>
            </div>

            {/* Public Property Information Summary */}
            <div className="p-3.5 rounded-2xl bg-stone-950/80 border border-white/[0.06] text-left space-y-2 text-xs">
              <div className="flex items-center justify-between text-stone-300">
                <span className="text-stone-400">Location</span>
                <span className="font-medium text-white">Waterfalls Estate, Lusaka</span>
              </div>
              <div className="flex items-center justify-between text-stone-300">
                <span className="text-stone-400">Check-In / Out</span>
                <span className="text-amber-300 font-medium">
                  {property.checkInTime} / {property.checkOutTime}
                </span>
              </div>
              <div className="flex items-center justify-between text-stone-300">
                <span className="text-stone-400">Reception Desk</span>
                <span className="text-emerald-400 font-medium">{property.contactPhone}</span>
              </div>
            </div>

            {/* Direct Reception Contact Button */}
            <div className="pt-1 space-y-2">
              {property.contactPhone && (
                <a
                  href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(
                    `Hello ${property.name} Reception, I need assistance with my ${unitName.toLowerCase()} check-in.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>Contact Reception via WhatsApp</span>
                </a>
              )}

              {(isInvalid || isCheckedOut) && (
                <button
                  onClick={clearGuestSession}
                  className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Reset Session
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-stone-500">
          <span>{property.name} &bull; Verified Guest Access</span>
        </div>
      </div>
    );
  }

  // Quick 1-Tap Requests (plain wording, no "Bedside Receptors" or "Hot Tub")
  const quickRequests = [
    {
      id: 'towels',
      label: 'Fresh Bath Towels',
      eta: '~10-15 mins',
      category: 'housekeeping' as const,
      icon: Waves,
      desc: 'Please deliver 2 fresh bath towels.',
    },
    {
      id: 'pool_towels',
      label: 'Pool Towels',
      eta: '~10-12 mins',
      category: 'housekeeping' as const,
      icon: Waves,
      desc: 'Deliver fresh swimming pool towels.',
    },
    {
      id: 'pillows',
      label: 'Extra Pillows',
      eta: '~12-15 mins',
      category: 'housekeeping' as const,
      icon: Feather,
      desc: 'Deliver 2 extra pillows.',
    },
    {
      id: 'gas_kitchen',
      label: 'Gas & Kitchen Help',
      eta: '~10-15 mins',
      category: 'maintenance' as const,
      icon: ChefHat,
      desc: 'Please assist with the kitchen gas stove or cookware.',
    },
    {
      id: 'ac_check',
      label: 'AC & Climate Check',
      eta: '~15 mins',
      category: 'maintenance' as const,
      icon: Wind,
      desc: 'Maintenance check on the air conditioning unit.',
    },
    {
      id: 'dnd',
      label: 'Privacy / Quiet Mode',
      eta: 'Instant',
      category: 'concierge' as const,
      icon: Moon,
      desc: 'Guest requested privacy — please hold routine housekeeping until further notice.',
    },
  ];

  const handleQuickRequest = (item: (typeof quickRequests)[0]) => {
    if (!room || !room.activeStayId) return;

    notificationService.triggerHaptic('medium');
    setDispatchedId(item.id);

    const effectiveName = room.currentGuestName
      ? `${room.guestTitle ? `${room.guestTitle} ` : ''}${room.currentGuestName}`
      : `${unitName} ${room.roomNumber} Guest`;

    const created = dbService.createRequest({
      propertyId: property.id,
      roomId: room.id,
      roomNumber: room.roomNumber,
      stayId: room.activeStayId,
      guestSessionId: room.activeStayId,
      category: item.category,
      title: item.label,
      description: `${item.desc} (Estimated time: ${item.eta})`,
      priority: 'normal',
      status: 'pending',
      guestName: effectiveName,
      guestPhone: room.guestPhone || '',
    });

    setTimeout(() => {
      setDispatchedId(null);
      onNavigate('status', { requestId: created.id });
    }, 350);
  };

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 select-none overflow-x-hidden">
      {/* ★ NEW HERO BANNER */}
      <GuestHeroBanner
        propertyName={property.name}
        city={property.city}
        country={property.country}
        houseName={room.roomNumber}
        houseTypeLabel={houseTypeLabel(room)}
        guestTitle={room.guestTitle}
        guestName={room.currentGuestName}
        checkOutDate={room.guestCheckOutDate}
        checkOutTime={property.checkOutTime}
        photoUrl={room.imageUrl}
      />

      {/* ★ MAIN SHEET */}
      <main className="relative -mt-[18px] rounded-t-[22px] bg-[#FDFBF7] px-[18px] pt-[18px] pb-[calc(96px+env(safe-area-inset-bottom))] flex flex-col gap-3.5">
        {/* 1. Wi-Fi Card directly under hero banner */}
        <WifiCard
          ssid={room.wifiName || property.wifiName || 'RockApartments_Guest'}
          password={room.wifiPassword || property.wifiPassword || ''}
        />

        {/* 2. Active Request Pill (strictly scoped to current activeStayId) */}
        {activeRequests.length > 0 && (
          <button
            type="button"
            onClick={() => onNavigate('status', { requestId: activeRequests[0].id })}
            className="w-full p-4 rounded-2xl bg-[#1C3A31] text-white shadow-sm border border-white/10 flex items-center justify-between text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#E0B973] text-stone-950 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E0B973]">
                    Active Request
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                </div>
                <p className="text-sm font-bold text-white truncate mt-0.5">
                  {activeRequests[0].title}
                </p>
                <p className="text-xs text-stone-200 mt-0.5">
                  {activeRequests[0].status === 'in_progress'
                    ? 'On the way to your house'
                    : activeRequests[0].status === 'acknowledged'
                    ? 'Staff assigned · Tap to view'
                    : 'Sent to reception · Tap to view'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[#E0B973] text-xs font-bold shrink-0 pl-2">
              <span>View</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        )}

        {/* 3. Quick 1-Tap Requests */}
        <section className="pt-1 space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div>
              <h2 className="text-sm font-bold text-stone-900">Quick requests</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Tap an item to send directly to our team
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('request', {})}
              className="text-xs font-semibold text-[#1C3A31] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>Custom request</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {quickRequests.map((item) => {
              const Icon = item.icon;
              const isJustSent = dispatchedId === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleQuickRequest(item)}
                  className={`flex flex-col items-center justify-between p-3.5 rounded-2xl border text-center active:scale-[0.96] transition-all cursor-pointer ${
                    isJustSent
                      ? 'bg-[#1C3A31] text-white border-[#1C3A31]'
                      : 'bg-white hover:bg-stone-50/90 text-stone-900 border-stone-900/[0.08]'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-colors ${
                      isJustSent ? 'bg-[#E0B973] text-stone-950' : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    {isJustSent ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>

                  <span className="text-xs font-bold leading-snug line-clamp-2">
                    {isJustSent ? 'Request Sent' : item.label}
                  </span>

                  <span
                    className={`text-xs mt-1 ${
                      isJustSent ? 'text-[#E0B973]' : 'text-stone-500'
                    }`}
                  >
                    {item.eta}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. House Guide & Airport Transfer Action Cards */}
        <section className="pt-1 space-y-2.5">
          {isDiningEnabled ? (
            <button
              type="button"
              onClick={() => onNavigate('dining')}
              className="w-full p-4 rounded-2xl bg-white border border-stone-900/[0.08] flex items-center justify-between text-left active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">In-Room Dining Menu</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Order freshly prepared dishes &amp; drinks
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('dining')}
              className="w-full p-4 rounded-2xl bg-white border border-stone-900/[0.08] flex items-center justify-between text-left active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#1C3A31]/[0.08] text-[#1C3A31] flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">House Guide &amp; Amenities</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Private pool, full kitchen, gated parking &amp; house timings
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
            </button>
          )}

          {property.airportTransfersEnabled !== false && (
            <button
              type="button"
              onClick={() =>
                onNavigate('request', {
                  category: 'concierge',
                  item: 'Kenneth Kaunda Airport Transfer (KKIA - 11 km)',
                })
              }
              className="w-full p-4 rounded-2xl bg-white border border-stone-900/[0.08] flex items-center justify-between text-left active:scale-[0.98] transition-transform cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                  <Plane className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">Airport &amp; City Transfers</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    11 km to Kenneth Kaunda Airport (KKIA) · Book pickup or drop-off
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
            </button>
          )}
        </section>

        {/* 5. Good to Know (No duplicate Wi-Fi row, distances in km) */}
        <section className="bg-white rounded-2xl p-4 border border-stone-900/[0.07] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              House Essentials
            </span>
            {property.contactPhone && (
              <a
                href={`https://wa.me/${cleanWaPhone}?text=${encodeURIComponent(
                  `Hello Reception, I am in ${unitName} ${room.roomNumber} at ${property.name} and need assistance.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F1E8] text-[#1C3A31] text-xs font-semibold active:scale-95 transition-transform"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp Desk</span>
              </a>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
              <div className="flex items-center gap-1.5 text-stone-500">
                <Clock className="w-3.5 h-3.5 text-amber-700" />
                <span>Check-in / Check-out</span>
              </div>
              <p className="font-bold text-stone-900 mt-1">
                {property.checkInTime} / {property.checkOutTime}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/60">
              <div className="flex items-center gap-1.5 text-stone-500">
                <MapPin className="w-3.5 h-3.5 text-emerald-800" />
                <span>Airport (KKIA)</span>
              </div>
              <p className="font-bold text-stone-900 mt-1">11 km · ~12 mins</p>
            </div>
          </div>

          {property.nearbyAttractions && property.nearbyAttractions.length > 0 && (
            <div className="pt-2 border-t border-stone-100 space-y-1.5">
              <span className="text-xs font-semibold text-stone-500 block">
                Nearby in Lusaka
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {property.nearbyAttractions.map((place, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200/50"
                  >
                    <span className="text-stone-700 truncate pr-1.5">{place.name}</span>
                    <span className="font-semibold text-stone-900 shrink-0">{place.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <GuestBottomNav activeTab="home" onNavigate={onNavigate} />
    </div>
  );
};
