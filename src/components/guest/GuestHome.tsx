import React, { useState, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { DeliveryPreference, Room } from '../../types';
import { GuestHeroBanner } from './GuestHeroBanner';
import { WifiCard } from './WifiCard';
import {
  Phone,
  Sparkles,
  ChevronRight,
  Waves,
  Feather,
  Wrench,
  Radio,
  ShieldAlert,
  Lock,
  QrCode,
  ChefHat,
  X,
  DoorClosed,
  BellRing,
  Moon,
  BookOpen,
} from 'lucide-react';
import { GuestBottomNav } from './GuestBottomNav';

interface GuestHomeProps {
  onNavigate: (view: string, data?: any) => void;
}

const getHouseTypeDisplay = (room: Room) => {
  return (room.houseType || room.roomType || '').trim() || undefined;
};

interface QuickRequestItem {
  id: string;
  label: string;
  eta: string;
  category: 'housekeeping' | 'maintenance' | 'pool_garden';
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
}

const QUICK_REQUESTS: QuickRequestItem[] = [
  {
    id: 'towels',
    label: 'Fresh towels',
    eta: 'About 15 min',
    category: 'housekeeping',
    icon: Waves,
    desc: 'Fresh bath towels for the house.',
  },
  {
    id: 'pool_towels',
    label: 'Pool towels',
    eta: 'About 15 min',
    category: 'pool_garden',
    icon: Waves,
    desc: 'Fresh swimming pool towels.',
  },
  {
    id: 'pillows',
    label: 'Extra pillows',
    eta: 'About 15 min',
    category: 'housekeeping',
    icon: Feather,
    desc: 'Extra pillows for the bedroom.',
  },
  {
    id: 'cleaning',
    label: 'Cleaning',
    eta: 'About 15 min',
    category: 'housekeeping',
    icon: Sparkles,
    desc: 'House refresh and cleaning.',
  },
  {
    id: 'gas_kitchen',
    label: 'Gas & kitchen help',
    eta: 'About 15 min',
    category: 'maintenance',
    icon: ChefHat,
    desc: 'Assistance with the kitchen gas stove or cookware.',
  },
  {
    id: 'broken',
    label: 'Something broken',
    eta: 'About 15 min',
    category: 'maintenance',
    icon: Wrench,
    desc: 'Maintenance check inside the house.',
  },
];

export const GuestHome: React.FC<GuestHomeProps> = ({ onNavigate }) => {
  const { property, room, stayState, clearGuestSession } = useTenant();
  const [confirmItem, setConfirmItem] = useState<QuickRequestItem | null>(null);
  const [quickNote, setQuickNote] = useState('');
  const [quickDelivery, setQuickDelivery] = useState<DeliveryPreference>('knock');
  const [sendingQuick, setSendingQuick] = useState(false);

  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  // Subscribe to media so uploaded house/property photos render live
  useSyncExternalStore(subscribeToStore, dbService.getAllMedia, dbService.getAllMedia);

  const activeRequests = room?.activeStayId
    ? allRequests.filter(
        (r) =>
          !r.archived &&
          r.propertyId === property?.id &&
          r.roomId === room.id &&
          r.stayId === room.activeStayId &&
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

  const receptionPhone = property.contactPhone || '+260 97 405 6547';
  const waPhone = (property.whatsappPhone || receptionPhone).replace(/[^0-9]/g, '');
  const cleanPhone = receptionPhone.replace(/[^0-9+]/g, '');

  const housePhotoUrl = room ? dbService.resolveRoomPhotoUrl(room, property) : property.coverImageUrl;

  // ============================================================================
  // 1. SUSPENDED PROPERTY VIEW (Spec §2 & §5)
  // Calm screen: house photo + "Welcome to {house}" + soft card.
  // Wi-Fi card and House Guide remain visible. No request buttons, no word "suspended".
  // ============================================================================
  if (property.status === 'suspended') {
    const houseLabel = room?.name || room?.roomNumber || stayState.houseName || property.name;
    const suspendNotice =
      property.suspendMessage ||
      `We're not taking requests through the app right now. Please contact reception: ${receptionPhone}`;

    return (
      <div
        data-testid="guest-suspended-view"
        className="min-h-dvh bg-[#FDFBF7] text-stone-900 select-none overflow-x-hidden pb-24"
      >
        <GuestHeroBanner
          propertyName={property.name}
          city={property.city}
          timezone={property.timezone}
          houseName={houseLabel}
          houseTypeLabel={room ? getHouseTypeDisplay(room) : undefined}
          guestTitle={room?.guestTitle}
          guestName={room?.currentGuestName}
          photoUrl={housePhotoUrl}
          fallbackPhotoUrl={property.coverImageUrl}
        />

        <main className="relative -mt-[18px] rounded-t-[22px] bg-[#FDFBF7] px-[18px] pt-[18px] pb-12 flex flex-col gap-4">
          <WifiCard
            ssid={room?.wifiName || property.wifiName || ''}
            password={room?.wifiPassword || property.wifiPassword || ''}
          />

          <div
            data-testid="guest-paused-card"
            className="rounded-2xl bg-white border border-stone-200 p-5 shadow-2xs space-y-3"
          >
            <p className="text-sm font-medium text-stone-800 leading-relaxed">{suspendNotice}</p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <a
                href={`tel:${cleanPhone}`}
                className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call {receptionPhone}</span>
              </a>
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-[#F5F1E8] text-[#1C3A31] border border-stone-900/[0.08] text-xs font-semibold inline-flex items-center justify-center gap-2"
              >
                <span>WhatsApp reception</span>
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('dining')}
            className="w-full min-h-11 p-4 rounded-2xl bg-white border border-stone-900/[0.08] flex items-center justify-between text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#1C3A31]/[0.08] text-[#1C3A31] flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-stone-900">House guide</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Pool, power &amp; water, gate instructions, and local tips
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
          </button>
        </main>
      </div>
    );
  }

  // ============================================================================
  // 2. UNOCCUPIED HOUSE / REVOKED QR / CHECKED-OUT STAY (Spec §2 Access)
  // ============================================================================
  if (stayState.status !== 'active' || !room || !room.activeStayId) {
    const isInvalid = stayState.status === 'invalid_token';
    const isUnoccupied = stayState.status === 'unoccupied';
    const isCheckedOut = stayState.status === 'checked_out';
    const houseLabel = room?.name || room?.roomNumber || stayState.houseName || property.name;

    if (isUnoccupied && room) {
      return (
        <div
          data-testid="guest-unoccupied-view"
          className="min-h-dvh bg-[#FDFBF7] text-stone-900 select-none overflow-x-hidden"
        >
          <GuestHeroBanner
            propertyName={property.name}
            city={property.city}
            timezone={property.timezone}
            houseName={houseLabel}
            houseTypeLabel={getHouseTypeDisplay(room)}
            photoUrl={housePhotoUrl}
            fallbackPhotoUrl={property.coverImageUrl}
          />
          <main className="relative -mt-[18px] rounded-t-[22px] bg-[#FDFBF7] px-[18px] pt-[18px] pb-12 space-y-4">
            <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-2xs space-y-3">
              <p className="text-sm font-medium text-stone-800 leading-relaxed">
                This house isn&apos;t checked in yet. Please contact reception: {receptionPhone}
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <a
                  href={`tel:${cleanPhone}`}
                  className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  <span>Call reception</span>
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-h-11 px-4 py-2.5 rounded-xl bg-[#F5F1E8] text-[#1C3A31] border border-stone-900/[0.08] text-xs font-semibold inline-flex items-center justify-center gap-2"
                >
                  <span>WhatsApp reception</span>
                </a>
              </div>
            </div>
          </main>
        </div>
      );
    }

    return (
      <div
        data-testid={`guest-gate-${stayState.status}`}
        className="min-h-dvh bg-[#FDFBF7] text-stone-900 flex flex-col justify-between p-6"
      >
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs uppercase tracking-widest text-stone-600 font-semibold">
            {property.name} &middot; {property.city}
          </span>
        </div>

        <div className="my-auto max-w-sm mx-auto w-full">
          <div className="p-6 rounded-3xl bg-white border border-stone-200 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F1E8] text-[#1C3A31] flex items-center justify-center mx-auto">
              {isInvalid ? (
                <ShieldAlert className="w-6 h-6 text-rose-700" />
              ) : isCheckedOut ? (
                <Lock className="w-6 h-6 text-[#1C3A31]" />
              ) : (
                <QrCode className="w-6 h-6 text-[#1C3A31]" />
              )}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-serif font-bold text-stone-900 leading-tight">
                {isInvalid
                  ? 'This QR code is no longer active. Please contact reception.'
                  : isCheckedOut
                  ? 'Thanks for staying with us'
                  : 'Scan your house QR code'}
              </h1>
              <p className="text-xs text-stone-600 leading-relaxed pt-1">
                {isInvalid
                  ? `Please contact reception at ${receptionPhone} for assistance.`
                  : isCheckedOut
                  ? `Your stay in ${houseLabel} has ended. We hope you enjoyed your time at ${property.name}.`
                  : `Scan the QR card inside your house to view Wi-Fi, the house guide, and send requests.`}
              </p>
            </div>

            <div className="pt-2 space-y-2">
              <a
                href={`tel:${cleanPhone}`}
                className="w-full min-h-11 py-3 bg-[#1C3A31] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call reception ({receptionPhone})</span>
              </a>

              {(isInvalid || isCheckedOut) && (
                <button
                  type="button"
                  onClick={clearGuestSession}
                  className="w-full min-h-11 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-stone-500">
          {property.name} &middot; {property.city}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 3. ACTIVE OCCUPIED STAY — GUEST HOME (Spec §2)
  // Order: Banner -> Wi-Fi -> Your request (if open) -> Quick requests (2x3)
  //        -> "Something else?" button -> House info (reception phone + WhatsApp)
  // ============================================================================
  const openQuickSheet = (item: QuickRequestItem) => {
    notificationService.triggerHaptic('light');
    setConfirmItem(item);
    setQuickNote('');
    setQuickDelivery('knock');
  };

  const handleConfirmQuickSend = () => {
    if (!confirmItem || !room || !room.activeStayId) return;
    setSendingQuick(true);
    notificationService.triggerHaptic('medium');

    const effectiveName = room.currentGuestName
      ? `${room.guestTitle ? `${room.guestTitle} ` : ''}${room.currentGuestName}`
      : `Guest in ${room.name || room.roomNumber}`;

    const created = dbService.createRequest({
      propertyId: property.id,
      roomId: room.id,
      roomNumber: room.name || room.roomNumber,
      stayId: room.activeStayId,
      guestSessionId: room.activeStayId,
      category: confirmItem.category,
      title: confirmItem.label,
      description: quickNote.trim() || confirmItem.desc,
      priority: 'normal',
      deliveryPreference: quickDelivery,
      guestName: effectiveName,
      guestPhone: room.guestPhone || '',
    });

    setSendingQuick(false);
    setConfirmItem(null);
    onNavigate('status', { requestId: created.id });
  };

  const getOpenRequestStatusCopy = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'On the way';
      case 'acknowledged':
        return 'Confirmed by reception';
      default:
        return "Request received — we've told reception";
    }
  };

  return (
    <div
      data-testid="guest-home-active"
      className="min-h-dvh bg-[#FDFBF7] text-stone-900 select-none overflow-x-hidden"
    >
      {/* 1. Banner (430px) */}
      <GuestHeroBanner
        propertyName={property.name}
        city={property.city}
        timezone={property.timezone}
        houseName={room.name || room.roomNumber}
        houseTypeLabel={getHouseTypeDisplay(room)}
        guestTitle={room.guestTitle}
        guestName={room.currentGuestName}
        photoUrl={housePhotoUrl}
        fallbackPhotoUrl={property.coverImageUrl}
      />

      {/* Main Sheet */}
      <main className="relative -mt-[18px] rounded-t-[22px] bg-[#FDFBF7] px-[18px] pt-[18px] pb-[calc(96px+env(safe-area-inset-bottom))] flex flex-col gap-3.5">
        {/* 2. Wi-Fi Card */}
        <WifiCard
          ssid={room.wifiName || property.wifiName || '8119 vip'}
          password={room.wifiPassword || property.wifiPassword || '@rocks.8119'}
        />

        {/* 3. "Your request" card (only if a request is open) */}
        {activeRequests.length > 0 && (
          <button
            type="button"
            data-testid="guest-open-request-card"
            onClick={() => onNavigate('status', { requestId: activeRequests[0].id })}
            className="w-full p-4 rounded-2xl bg-[#1C3A31] text-white shadow-sm border border-white/10 flex items-center justify-between text-left active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-[#E0B973] text-stone-950 flex items-center justify-center shrink-0">
                <Radio className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#E0B973] block">
                  Your request
                </span>
                <p className="text-sm font-bold text-white line-clamp-2 mt-0.5 leading-snug">
                  {activeRequests[0].title}
                </p>
                <p className="text-xs text-stone-200 mt-0.5">
                  {getOpenRequestStatusCopy(activeRequests[0].status)}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-[#E0B973] shrink-0 ml-2" />
          </button>
        )}

        {/* 4. Quick requests: 2 columns, max 6 tiles */}
        <section className="pt-1 space-y-2.5">
          <div className="px-0.5">
            <h2 className="text-sm font-bold text-stone-900">Quick requests</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Tap an item to send to our team
            </p>
          </div>

          <div data-testid="quick-requests-grid" className="grid grid-cols-2 gap-2.5">
            {QUICK_REQUESTS.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`quick-request-${item.id}`}
                  onClick={() => openQuickSheet(item)}
                  className="min-h-[88px] flex flex-col items-start justify-between p-3.5 rounded-2xl border bg-white hover:bg-stone-50/90 text-stone-900 border-stone-900/[0.08] text-left active:scale-[0.98] transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#F5F1E8] text-[#1C3A31] flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[15px] font-semibold leading-snug text-stone-900">
                    {item.label}
                  </span>
                  <span className="text-[13px] text-stone-500 mt-0.5">{item.eta}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. "Something else?" button -> opens full request form */}
        <button
          type="button"
          data-testid="something-else-btn"
          onClick={() => onNavigate('request', {})}
          className="w-full min-h-11 p-4 rounded-2xl bg-white border border-stone-900/[0.08] flex items-center justify-between text-left active:scale-[0.98] transition-transform cursor-pointer"
        >
          <div>
            <span className="text-sm font-bold text-stone-900 block">Something else?</span>
            <span className="text-xs text-stone-500">
              Send a custom request or note to reception
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
        </button>

        {/* 6. House info (compact): reception phone + WhatsApp button */}
        <section
          data-testid="guest-house-info"
          className="bg-white rounded-2xl p-4 border border-stone-900/[0.07] space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                Reception
              </span>
              <p className="text-sm font-semibold text-stone-900 mt-0.5">{receptionPhone}</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={`tel:${cleanPhone}`}
                className="min-h-11 px-3.5 py-2 rounded-xl bg-stone-100 text-stone-900 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call</span>
              </a>
              <a
                href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                  `Hello ${property.name} reception, I am staying in ${room.name || room.roomNumber}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 px-3.5 py-2 rounded-xl bg-[#F5F1E8] text-[#1C3A31] text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Quick Request Confirm Sheet */}
      {confirmItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Confirm ${confirmItem.label}`}
          data-testid="quick-request-confirm-sheet"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
                  Quick request &middot; {room.name || room.roomNumber}
                </span>
                <h3 className="text-lg font-serif font-bold text-stone-900 mt-0.5">
                  {confirmItem.label}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmItem(null)}
                aria-label="Close"
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-600 block mb-1.5">
                Any note? (optional)
              </label>
              <input
                type="text"
                data-testid="quick-request-note-input"
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="e.g. 2 bath towels please"
                className="w-full min-h-11 px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1C3A31]"
              />
            </div>

            <div>
              <span className="text-xs font-semibold text-stone-600 block mb-1.5">
                Delivery preference
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'knock', label: 'Knock', icon: DoorClosed },
                    { id: 'bell', label: 'Ring', icon: BellRing },
                    { id: 'leave_at_door', label: 'Leave at door', icon: Moon },
                  ] as const
                ).map((opt) => {
                  const OptIcon = opt.icon;
                  const active = quickDelivery === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`quick-delivery-${opt.id}`}
                      onClick={() => setQuickDelivery(opt.id)}
                      className={`min-h-11 p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        active
                          ? 'bg-[#1C3A31] text-white border-[#1C3A31]'
                          : 'bg-stone-50 text-stone-700 border-stone-200'
                      }`}
                    >
                      <OptIcon className="w-4 h-4" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              data-testid="quick-request-send-btn"
              disabled={sendingQuick}
              onClick={handleConfirmQuickSend}
              className="w-full min-h-11 py-3.5 rounded-xl bg-[#1C3A31] text-[#E0B973] font-bold text-sm shadow-sm active:scale-[0.99] cursor-pointer"
            >
              {sendingQuick ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <GuestBottomNav activeTab="home" onNavigate={onNavigate} />
    </div>
  );
};
