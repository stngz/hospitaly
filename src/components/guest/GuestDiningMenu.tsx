import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { 
  ArrowLeft, 
  Plus, 
  ShoppingBag, 
  UtensilsCrossed, 
  AlertCircle,
  Waves,
  Bath,
  ChefHat,
  Wifi,
  ShieldCheck,
  Plane,
  Clock,
  Sparkles,
  Phone,
  Copy,
  Check,
  ChevronRight
} from 'lucide-react';
import { DiningItem } from '../../types';
import { GuestBottomNav } from './GuestBottomNav';

interface GuestDiningMenuProps {
  onBack: () => void;
  onRequestSubmitted: (requestId: string) => void;
  onNavigateTab?: (view: any, data?: any) => void;
}

/**
 * Mobile-First, Accessible House Guide for Self-Catering Properties (e.g. Rock Apartments)
 */
const HouseGuideView: React.FC<{
  onBack: () => void;
  onNavigateTab?: (view: any, data?: any) => void;
}> = ({ onBack, onNavigateTab }) => {
  const { property, room } = useTenant();
  const [copiedWifi, setCopiedWifi] = useState(false);

  // Always ensure smooth top entry on mobile navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const handleCopyWifi = async () => {
    if (!property?.wifiPassword) return;
    try {
      await navigator.clipboard.writeText(property.wifiPassword);
      notificationService.triggerHaptic('light');
      setCopiedWifi(true);
      setTimeout(() => setCopiedWifi(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleAction = (category: string, item: string) => {
    if (onNavigateTab) {
      onNavigateTab('request', { category, item });
    } else {
      onBack();
    }
  };

  const unitName = property?.unitLabel || 'House';
  const cleanPhone = property?.contactPhone?.replace(/[^0-9]/g, '') || '';

  return (
    <div 
      role="region"
      aria-label="House Guide and Amenities"
      className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-20 overscroll-y-contain flex flex-col"
    >
      {/* 1. Accessible Sticky Header with Large 44px Touch Targets */}
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
          <h1 className="text-sm font-serif font-bold text-stone-900 leading-tight">House Guide</h1>
          <p className="text-[10px] text-stone-500 font-mono tracking-tight truncate max-w-[200px]">
            {room ? `${unitName} ${room.roomNumber}` : (property?.name || 'In-House Essentials')}
          </p>
        </div>

        {property?.contactPhone ? (
          <a
            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(
              `Hello Reception, I am contacting you from ${room ? `${unitName} ${room.roomNumber}` : 'Rock Apartments'}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contact reception on WhatsApp"
            className="w-11 h-11 -mr-1 rounded-xl flex items-center justify-center text-emerald-800 hover:bg-emerald-50 active:scale-95 transition-all cursor-pointer"
          >
            <Phone className="w-4 h-4" />
          </a>
        ) : (
          <div className="w-11" />
        )}
      </header>

      {/* 2. Main Guide Content */}
      <main className="p-4 space-y-3.5 flex-1">
        {/* Editorial Welcome Banner */}
        <section className="p-4 bg-emerald-950 text-white rounded-2xl shadow-sm border border-emerald-900/80 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
              Self-Catering Holiday House
            </span>
            <span className="text-[10px] font-mono text-emerald-300/80">
              {property?.city || 'Lusaka'}, {property?.country || 'Zambia'}
            </span>
          </div>
          <h2 className="text-base font-serif font-bold text-amber-100">
            Welcome to Rock Apartments
          </h2>
          <p className="text-xs text-stone-300 leading-relaxed">
            Separate furnished holiday houses with private swimming pool and hot tub. We do not sell food or drink, allowing full private use of your fully equipped kitchen.
          </p>
        </section>

        {/* Essential Amenities Cards with One-Touch Mobile Actions */}
        <div className="space-y-3">
          {/* Card 1: Private Swimming Pool */}
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <Waves className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900 leading-tight">Private Swimming Pool & Sun Deck</h3>
                  <span className="text-[10px] text-stone-500 font-mono">Depth 1.2m – 1.8m &bull; Exclusive for in-house guests</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Enjoy your private pool and terrace loungers. Extra plush pool towels are provided fresh on request.
            </p>
            <button
              type="button"
              onClick={() => handleAction('housekeeping', 'Plush Pool Towels')}
              className="w-full py-2 px-3 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 text-blue-900 text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Request Fresh Pool Towels</span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-700" />
            </button>
          </section>

          {/* Card 2: Private Heated Hot Tub */}
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                  <Bath className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900 leading-tight">Private Heated Hot Tub</h3>
                  <span className="text-[10px] text-stone-500 font-mono">Hydrotherapy Jets &bull; Up to 38°C</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              The heated tub is serviced daily. For temperature adjustments or assistance with jets, send a quick note to Maintenance.
            </p>
            <button
              type="button"
              onClick={() => handleAction('maintenance', 'Hot Tub Temperature & Jets')}
              className="w-full py-2 px-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Hot Tub Assistance / Jets</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-800" />
            </button>
          </section>

          {/* Card 3: Fully Equipped Kitchen */}
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                <ChefHat className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 leading-tight">Fully Equipped Kitchen</h3>
                <span className="text-[10px] text-stone-500 font-mono">Gas Cooktop, Microwave & Cookware</span>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Equipped with a gas stove, microwave, full-size refrigerator, electric kettle, pots, cutlery, and family dinnerware.
            </p>
            <button
              type="button"
              onClick={() => handleAction('maintenance', 'Gas Refill & Kitchen Support')}
              className="w-full py-2 px-3 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Gas Refill / Kitchen Assistance</span>
              <ChevronRight className="w-3.5 h-3.5 text-emerald-800" />
            </button>
          </section>

          {/* Card 4: High-Speed Wi-Fi */}
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center shrink-0">
                  <Wifi className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-stone-900 leading-tight">High-Speed Wi-Fi</h3>
                  <span className="text-[10px] text-stone-500 font-mono">Coverage across house and poolside patio</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 flex items-center justify-between gap-2">
              <div className="space-y-0.5 text-xs">
                <div>
                  <span className="text-stone-400 font-mono text-[10px] block">NETWORK</span>
                  <span className="font-bold text-stone-900 font-mono">{property?.wifiName || 'RocksApartments_UltraFast'}</span>
                </div>
                {property?.wifiPassword && (
                  <div className="pt-1">
                    <span className="text-stone-400 font-mono text-[10px] block">PASSWORD</span>
                    <span className="font-bold text-emerald-800 font-mono tracking-wider">{property.wifiPassword}</span>
                  </div>
                )}
              </div>

              {property?.wifiPassword && (
                <button
                  type="button"
                  onClick={handleCopyWifi}
                  aria-label="Copy Wi-Fi password"
                  className="px-3 py-2 rounded-lg bg-white border border-stone-200 text-stone-800 text-xs font-semibold flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                >
                  {copiedWifi ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 text-[11px]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-stone-500" />
                      <span className="text-[11px]">Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </section>

          {/* Card 5: Gated Security & Secure Parking */}
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 leading-tight">24/7 Gated Security & Parking</h3>
                <span className="text-[10px] text-stone-500 font-mono">Waterfalls Estate, Airport Road Corridor</span>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Manned estate security 24 hours daily. Dedicated secure parking is inside the perimeter wall directly in front of your house.
            </p>
            <button
              type="button"
              onClick={() => handleAction('concierge', 'Gate Entry / Security Clearance')}
              className="w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Gate Entry / Visitor Clearance</span>
              <ChevronRight className="w-3.5 h-3.5 text-stone-600" />
            </button>
          </section>

          {/* Card 6: Airport Connections */}
          <section className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
                <Plane className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-stone-900 leading-tight">Airport & City Connections</h3>
                <span className="text-[10px] text-stone-500 font-mono">6.8 mi to Kenneth Kaunda Airport (KKIA)</span>
              </div>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Convenient 12-minute drive to the international airport. Schedule departure or arrival transfers easily with our concierge.
            </p>
            <button
              type="button"
              onClick={() => handleAction('concierge', 'Airport Transfer to KKIA')}
              className="w-full py-2 px-3 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Schedule Airport Transfer</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-800" />
            </button>
          </section>

          {/* Card 7: House Timing & Quiet Hours */}
          <section className="bg-stone-50 p-4 rounded-2xl border border-stone-200/70 text-xs text-stone-600 space-y-2">
            <div className="flex items-center gap-2 text-stone-900 font-bold">
              <Clock className="w-4 h-4 text-stone-700" />
              <span>House Timings & Courtesy</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-white p-2 rounded-lg border border-stone-200/60">
                <span className="text-stone-400 block text-[9px]">CHECK-IN</span>
                <span className="font-bold text-stone-900">{property?.checkInTime || '14:00'}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-stone-200/60">
                <span className="text-stone-400 block text-[9px]">CHECK-OUT</span>
                <span className="font-bold text-stone-900">{property?.checkOutTime || '11:00'}</span>
              </div>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 leading-normal">
              Quiet hours are 22:00 – 07:00 for the peaceful enjoyment of all guests. Smoking is strictly prohibited inside houses.
            </p>
          </section>
        </div>
      </main>

      {/* 3. Sleek, Slim Bottom Navigation */}
      <GuestBottomNav
        activeTab="dining"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};

/**
 * Dining Menu View for properties with active culinary operations
 */
const DiningMenuView: React.FC<GuestDiningMenuProps> = ({
  onBack,
  onRequestSubmitted,
  onNavigateTab,
}) => {
  const { property, room } = useTenant();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{ item: DiningItem; quantity: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const allDining = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllDining,
    dbService.getAllDining
  );

  const diningItems = property 
    ? allDining.filter((d) => d.propertyId === property.id && d.available)
    : [];

  const categories = ['all', 'breakfast', 'lunch', 'dinner', 'drinks'];

  const filtered = selectedCategory === 'all'
    ? diningItems
    : diningItems.filter((d) => d.category === selectedCategory);

  const addToCart = (item: DiningItem) => {
    notificationService.triggerHaptic('light');
    setCart((prev) => {
      const existing = prev.find((p) => p.item.id === item.id);
      if (existing) {
        return prev.map((p) => (p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    notificationService.triggerHaptic('light');
    setCart((prev) => {
      const existing = prev.find((p) => p.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((p) => (p.item.id === itemId ? { ...p, quantity: p.quantity - 1 } : p));
      }
      return prev.filter((p) => p.item.id !== itemId);
    });
  };

  const totalAmount = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
  const totalCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handlePlaceOrder = () => {
    if (!property) {
      setErrorMsg('No active property context.');
      return;
    }
    if (!room) {
      setErrorMsg('Please select an active in-room session first.');
      return;
    }
    if (cart.length === 0) return;

    try {
      setIsOrdering(true);
      setErrorMsg(null);

      const itemsSummary = cart.map((c) => `${c.quantity}x ${c.item.name}`).join(', ');
      const desc = `In-Room Dining Order (${property.currency} ${totalAmount.toLocaleString()}):\n${itemsSummary}${
        notes ? `\nSpecial Notes: ${notes.trim()}` : ''
      }`;

      const effectiveGuestName = room.currentGuestName || `Room ${room.roomNumber} Guest`;

      const newReq = dbService.createRequest({
        propertyId: property.id,
        roomId: room.id,
        roomNumber: room.roomNumber,
        category: 'dining',
        title: `Lodge Dining: ${totalCount} items (${cart[0].item.name}${cart.length > 1 ? ` +${cart.length - 1} more` : ''})`,
        description: desc,
        priority: 'normal',
        status: 'pending',
        guestName: effectiveGuestName,
        guestPhone: room.guestPhone || '',
      });

      setCart([]);
      onRequestSubmitted(newReq.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order.');
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-20 overscroll-y-contain flex flex-col">
      <header className="sticky top-0 z-20 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-2 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="w-11 h-11 -ml-1 rounded-xl flex items-center justify-center text-stone-700 hover:text-stone-950 active:bg-stone-200/60 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-tight">In-Room Dining</h1>
            <p className="text-[10px] text-stone-500 font-mono">
              {room ? `Room ${room.roomNumber}` : 'Dining Menu'}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono font-bold bg-amber-100 text-amber-950 px-2.5 py-1 rounded-md border border-amber-900/[0.08]">
          {property?.currency || 'ZMW'}
        </div>
      </header>

      {errorMsg && (
        <div className="m-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="p-3 overflow-x-auto flex gap-2 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap active:scale-[0.96] transition-all cursor-pointer ${
                isSelected
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Food Items Grid */}
      <main className="px-4 space-y-3 max-w-lg mx-auto flex-1">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center shadow-2xs">
            <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-stone-800">No menu items found</p>
            <p className="text-xs text-stone-500 mt-1">Check back shortly or browse other categories.</p>
          </div>
        ) : (
          filtered.map((item) => {
            const inCart = cart.find((c) => c.item.id === item.id);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs flex flex-col sm:flex-row hover:border-stone-400 transition-all"
              >
                <div className="w-full sm:w-28 h-32 sm:h-auto bg-stone-100 shrink-0 overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-3.5 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-xs font-bold text-stone-900 leading-snug">{item.name}</h3>
                      <span className="text-xs font-mono font-bold text-stone-900 whitespace-nowrap bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                        {property?.currency} {item.price}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400 capitalize font-medium">{item.category}</span>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg bg-stone-100 text-stone-800 font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold w-4 text-center">{inCart.quantity}</span>
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-lg bg-stone-900 text-white font-bold flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(item)}
                        className="px-3 py-1.5 bg-stone-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Cart Tray */}
      {cart.length > 0 && (
        <div className="fixed bottom-14 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3.5 shadow-modal z-30 max-w-md mx-auto rounded-t-2xl">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-stone-900">{totalCount} items in tray</span>
              <p className="text-sm font-bold font-mono text-stone-900">
                Total: {property?.currency} {totalAmount.toLocaleString()}
              </p>
            </div>
            <span className="text-[10px] text-stone-500 font-medium">
              {room ? `House ${room.roomNumber}` : 'Dining Order'}
            </span>
          </div>

          <input
            type="text"
            placeholder="Special dietary requests or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-base sm:text-xs p-2.5 rounded-xl border border-stone-200 bg-white mb-2 focus:outline-none focus:ring-1 focus:ring-stone-900"
          />

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isOrdering}
            className="w-full py-2.5 bg-stone-900 text-white rounded-xl font-bold text-xs shadow-2xs flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            {isOrdering ? 'Placing Order...' : `Place Room Order (${property?.currency} ${totalAmount.toLocaleString()})`}
          </button>
        </div>
      )}

      {/* Slim Bottom Navigation */}
      <GuestBottomNav
        activeTab="dining"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};

export const GuestDiningMenu: React.FC<GuestDiningMenuProps> = (props) => {
  const { property } = useTenant();
  const isDiningEnabled = property?.diningEnabled === true;

  if (!isDiningEnabled) {
    return <HouseGuideView onBack={props.onBack} onNavigateTab={props.onNavigateTab} />;
  }

  return <DiningMenuView {...props} />;
};
