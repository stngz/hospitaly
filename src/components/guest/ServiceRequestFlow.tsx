import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService } from '../../lib/store';
import { ArrowLeft, AlertCircle, Sparkles, Wrench, Compass, Car, Check } from 'lucide-react';
import { RequestPriority } from '../../types';
import { GuestBottomNav } from './GuestBottomNav';

interface ServiceRequestFlowProps {
  initialCategory?: string;
  initialItem?: string;
  onBack: () => void;
  onSubmitted: (requestId: string) => void;
  onNavigateTab?: (view: string, data?: any) => void;
}

export const ServiceRequestFlow: React.FC<ServiceRequestFlowProps> = ({
  initialCategory = 'housekeeping',
  initialItem = '',
  onBack,
  onSubmitted,
  onNavigateTab,
}) => {
  const { property, room } = useTenant();

  const isRocks = property?.slug === 'rocks-apartments' || property?.id === 'prop_rocks_lusaka';

  const categories = [
    {
      id: 'housekeeping',
      title: 'Housekeeping',
      icon: Sparkles,
      items: isRocks
        ? [
            'Pool Towels & Sun Loungers',
            'Extra Fresh Towels',
            'House Refresh & Bed Making',
            'Linen & Towel Change',
            'Kitchen Dishware Cleaning',
            'Braai / Outdoor Setup',
          ]
        : [
            'Extra Fresh Towels',
            'Extra Pillow Set',
            'House Refresh & Bed Making',
            'Luxury Toiletries Kit',
            'Dental / Shaving Kit',
            'Baby Cot / Extra Blanket',
          ],
    },
    {
      id: 'maintenance',
      title: 'Maintenance',
      icon: Wrench,
      items: isRocks
        ? [
            'Air Conditioning Remote & Cooling Check',
            'Pool & Garden Care',
            'Kitchen Gas Refill & Stove Check',
            'Smart TV & High-Speed Wi-Fi',
            'Water Pressure & Plumbing',
          ]
        : [
            'Air Conditioning Support',
            'Hot Water / Plumbing Check',
            'TV & Media Remote',
            'Power Outlet / Adaptor',
            'Safe Box Assistance',
          ],
    },
    {
      id: 'concierge',
      title: 'Concierge',
      icon: Compass,
      items: isRocks
        ? [
            'Luggage Assistance',
            'Morning Wake-up Call',
            'Laundry & Pressing Pickup',
            'Late Checkout Request',
            'Lusaka Attractions & Restaurant Tips',
          ]
        : [
            'Luggage Assistance',
            'Morning Wake-up Call',
            'Laundry & Pressing Pickup',
            'Late Checkout Request',
            'Local Tour Desk',
          ],
    },
    {
      id: 'transport',
      title: 'Transport',
      icon: Car,
      items: isRocks
        ? [
            'Kenneth Kaunda Airport Transfer (KKIA - 11 km)',
            'Lusaka Golf Club Shuttle (18 km)',
            'National Museum City Transfer (19 km)',
            'Waterfalls Estate / Local Town Taxi',
          ]
        : [
            'Airport Shuttle Transfer',
            'City Centre Transfer',
            'Private Vehicle Booking',
            'Local Town Taxi',
          ],
    },
  ] as const;

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedItem, setSelectedItem] = useState<string>(initialItem);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [guestName, setGuestName] = useState(
    room?.currentGuestName
      ? `${room.guestTitle ? `${room.guestTitle} ` : ''}${room.currentGuestName}`
      : ''
  );
  const [guestPhone, setGuestPhone] = useState(room?.guestPhone || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const activeCatObj = categories.find((c) => c.id === selectedCategory) || categories[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) {
      setErrorMsg('Active property context required.');
      return;
    }
    if (property.status === 'suspended') {
      setErrorMsg(
        `Requests are paused. Please call reception: ${property.contactPhone || '+260 97 000 0100'}`
      );
      return;
    }
    if (!room || !room.activeStayId) {
      setErrorMsg('Please scan your in-house QR code first to submit a request.');
      return;
    }
    if (!selectedItem && !description.trim()) {
      setErrorMsg('Please select a service item or describe what you need.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const fallbackName = room.currentGuestName
        ? `${room.guestTitle ? `${room.guestTitle} ` : ''}${room.currentGuestName}`
        : `Guest in ${room.roomNumber}`;
      const effectiveGuestName = guestName.trim() || fallbackName;
      const effectivePhone = guestPhone.trim() || room.guestPhone || '';

      const newRequest = dbService.createRequest({
        propertyId: property.id,
        roomId: room.id,
        roomNumber: room.roomNumber,
        stayId: room.activeStayId,
        guestSessionId: room.activeStayId,
        category: selectedCategory as any,
        title: selectedItem || 'Custom Service Request',
        description: description.trim(),
        priority,
        status: 'pending',
        guestName: effectiveGuestName,
        guestPhone: effectivePhone,
      });

      onSubmitted(newRequest.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send request.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-24 selection:bg-amber-100 overscroll-y-contain flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
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
            <h1 className="text-sm font-bold text-stone-900 leading-tight">Request Service</h1>
            <p className="text-xs text-stone-500">
              {room ? room.roomNumber : 'House Not Selected'}
            </p>
          </div>
        </div>
        <span className="text-xs uppercase bg-emerald-100 text-emerald-950 px-2.5 py-0.5 rounded-full font-bold border border-emerald-900/[0.08]">
          Direct Line
        </span>
      </header>

      <form onSubmit={handleSubmit} className="p-5 max-w-lg mx-auto space-y-5 w-full">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200/90 text-red-700 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Category Tabs */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
            1. Select Department
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedItem('');
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-semibold select-none active:scale-[0.96] transition-all border ${
                    isSelected
                      ? 'bg-[#1C3A31] text-[#E0B973] border-[#1C3A31] shadow-xs'
                      : 'bg-white border-stone-900/[0.08] text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-xs">{cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Common Requests Quick Selection */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
            2. Common Requests for {activeCatObj.title}
          </label>
          <div className="grid grid-cols-1 gap-2">
            {activeCatObj.items.map((item) => {
              const isChosen = selectedItem === item;
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => setSelectedItem(isChosen ? '' : item)}
                  className={`p-3 rounded-xl border text-left text-xs font-medium active:scale-[0.98] transition-all flex items-center justify-between select-none shadow-2xs ${
                    isChosen
                      ? 'border-[#1C3A31] bg-amber-50/70 text-stone-950 font-semibold ring-1 ring-[#1C3A31]/40'
                      : 'border-stone-900/[0.07] bg-white text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span>{item}</span>
                  {isChosen && <Check className="w-3.5 h-3.5 text-[#1C3A31] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Freeform Note */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
            3. Specific Instructions / Special Requests
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isRocks
                ? 'e.g. Please bring extra pool towels, or assist us with airport luggage...'
                : 'e.g. Please leave extra towels outside door...'
            }
            className="w-full text-base sm:text-xs p-3 rounded-xl border border-stone-900/[0.1] bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1C3A31]/25 focus:border-[#1C3A31]"
          />
        </div>

        {/* Priority Indicator */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
            Urgency
          </label>
          <div className="flex gap-2">
            {(['normal', 'high', 'urgent'] as RequestPriority[]).map((p) => {
              const isSelected = priority === p;
              return (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium capitalize border active:scale-[0.96] transition-all select-none ${
                    isSelected
                      ? p === 'urgent'
                        ? 'bg-rose-700 text-white border-rose-700 font-bold shadow-xs'
                        : p === 'high'
                        ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                        : 'bg-[#1C3A31] text-white border-[#1C3A31] font-bold shadow-xs'
                      : 'bg-white border-stone-900/[0.08] text-stone-600 hover:border-stone-400'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Guest Contact */}
        <div className="bg-white p-4 rounded-xl border border-stone-900/[0.08] shadow-diffused space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
            Guest Details
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-xs text-stone-400 block mb-1">Your Name</span>
              <input
                type="text"
                placeholder="e.g. Ms. Mazaba"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full text-base sm:text-xs p-2.5 rounded-lg border border-stone-900/[0.1] bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#1C3A31]"
              />
            </div>
            <div>
              <span className="text-xs text-stone-400 block mb-1">Phone / WhatsApp (Optional)</span>
              <input
                type="tel"
                placeholder="e.g. +260 97 000 0000"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full text-base sm:text-xs p-2.5 rounded-lg border border-stone-900/[0.1] bg-stone-50 focus:outline-none focus:ring-1 focus:ring-[#1C3A31]"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-[#1C3A31] text-[#E0B973] rounded-xl font-bold text-sm shadow-diffused active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer"
        >
          {submitting ? 'Sending Request...' : 'Send Request'}
        </button>
      </form>

      {/* Bottom Navigation */}
      <GuestBottomNav
        activeTab="request"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};
