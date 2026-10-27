import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService } from '../../lib/store';
import { ArrowLeft, AlertCircle, Sparkles, Wrench, Compass, Car, Check, Home, UtensilsCrossed, Clock } from 'lucide-react';
import { RequestPriority } from '../../types';

interface ServiceRequestFlowProps {
  initialCategory?: string;
  initialItem?: string;
  onBack: () => void;
  onSubmitted: (requestId: string) => void;
  onNavigateTab?: (view: string) => void;
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
      items: isRocks ? [
        'Private Hot Tub Prep & Bubbles',
        'Pool Towels & Sun Loungers',
        'Extra Fresh Towels',
        'Room Refresh & Bed Making',
        'Kitchen Dishware Cleaning',
        'Luxury Toiletries Kit',
      ] : [
        'Extra Fresh Towels',
        'Extra Pillow Set',
        'Room Refresh & Bed Making',
        'Luxury Toiletries Kit',
        'Dental / Shaving Kit',
        'Baby Cot / Extra Blanket',
      ]
    },
    { 
      id: 'maintenance', 
      title: 'Maintenance', 
      icon: Wrench,
      items: isRocks ? [
        'Air Conditioning Remote & Cooling Check',
        'Hot Tub Heater & Jets Check',
        'Smart TV & High-Speed WiFi',
        'Kitchen Gas Stove & Microwave',
        'Water Pressure & Plumbing',
      ] : [
        'Air Conditioning Support',
        'Hot Water / Plumbing Check',
        'TV & Media Remote',
        'Power Outlet / Adaptor',
        'Safe Box Assistance',
      ]
    },
    { 
      id: 'concierge', 
      title: 'Concierge', 
      icon: Compass,
      items: isRocks ? [
        'Luggage Assistance',
        'Morning Wake-up Call',
        'Laundry & Pressing Pickup',
        'Late Checkout Request',
        'Lusaka Attractions & Restaurant Tips',
      ] : [
        'Luggage Assistance',
        'Morning Wake-up Call',
        'Laundry & Pressing Pickup',
        'Late Checkout Request',
        'Livingstone Tour Desk',
      ]
    },
    { 
      id: 'transport', 
      title: 'Transport', 
      icon: Car,
      items: isRocks ? [
        'Kenneth Kaunda Airport Transfer (KKIA - 6.8 mi)',
        'Lusaka Golf Club Shuttle (11 mi)',
        'National Museum City Transfer (12 mi)',
        'Waterfalls Estate / Local Town Taxi',
      ] : [
        'Harry Mwanga Nkumbula Shuttle',
        'Victoria Falls Gorge Transfer',
        'Private Safari Vehicle Booking',
        'Local Town Taxi',
      ]
    },
  ] as const;

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedItem, setSelectedItem] = useState<string>(initialItem);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [guestName, setGuestName] = useState(room?.currentGuestName || '');
  const [guestPhone, setGuestPhone] = useState(room?.guestPhone || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeCatObj = categories.find((c) => c.id === selectedCategory) || categories[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) {
      setErrorMsg('Active property context required.');
      return;
    }
    if (!room) {
      setErrorMsg('Please select a valid room session before dispatching.');
      return;
    }
    if (!selectedItem && !description.trim()) {
      setErrorMsg('Please select a service item or describe what you need.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const effectiveGuestName = guestName.trim() || room.currentGuestName || `Guest in Room ${room.roomNumber}`;
      const effectivePhone = guestPhone.trim() || room.guestPhone || '';

      const newRequest = dbService.createRequest({
        propertyId: property.id,
        roomId: room.id,
        roomNumber: room.roomNumber,
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
      setErrorMsg(err.message || 'Failed to dispatch request.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-28 selection:bg-amber-100">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-900/[0.07] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onBack} 
            className="p-1.5 rounded-full hover:bg-stone-200/70 active:scale-[0.95] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-stone-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-tight">Request Service</h1>
            <p className="text-[11px] text-stone-500 font-medium">
              {room ? `Room: ${room.roomNumber} (${room.roomType})` : 'Room Not Selected'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase bg-emerald-100/90 text-emerald-950 px-2.5 py-0.5 rounded-full font-bold border border-emerald-900/[0.08]">
          Direct Line
        </span>
      </header>

      <form onSubmit={handleSubmit} className="p-5 max-w-lg mx-auto space-y-5">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200/90 text-red-700 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Category Tabs */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2 font-mono">
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
                  className={`flex flex-col items-center justify-center p-3 rounded-xl text-xs font-semibold select-none active:scale-[0.96] transition-[background-color,border-color,color,transform,box-shadow] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] border ${
                    isSelected
                      ? 'bg-brand-primary text-brand-secondary border-brand-primary shadow-xs ring-2 ring-brand-secondary/30'
                      : 'bg-white border-stone-900/[0.08] text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:border-stone-400'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">{cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Common Requests Quick Selection */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2 font-mono">
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
                  className={`p-3 rounded-xl border text-left text-xs font-medium active:scale-[0.98] transition-[background-color,border-color,color,transform] duration-140 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between select-none shadow-2xs ${
                    isChosen
                      ? 'border-brand-primary bg-amber-50/70 text-stone-950 font-semibold ring-1 ring-brand-primary/40'
                      : 'border-stone-900/[0.07] bg-white text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:border-stone-400'
                  }`}
                >
                  <span>{item}</span>
                  {isChosen && <Check className="w-3.5 h-3.5 text-brand-primary shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Freeform Note */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5 font-mono">
            3. Specific Instructions / Special Requests
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={isRocks ? "e.g. Please set hot tub to 38°C, or assist us with airport luggage..." : "e.g. Please leave extra towels outside door..."}
            className="w-full text-xs p-3 rounded-xl border border-stone-900/[0.1] bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary transition-shadow"
          />
        </div>

        {/* Priority Indicator */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5 font-mono">
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
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium capitalize border active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-140 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                    isSelected
                      ? p === 'urgent'
                        ? 'bg-rose-700 text-white border-rose-700 font-bold shadow-xs'
                        : p === 'high'
                        ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-xs'
                        : 'bg-brand-primary text-white border-brand-primary font-bold shadow-xs'
                      : 'bg-white border-stone-900/[0.08] text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:border-stone-400'
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
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block font-mono">
            Guest Details
          </label>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Your Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-stone-900/[0.1] bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
            <input
              type="tel"
              placeholder="WhatsApp / Phone"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="text-xs p-2.5 rounded-lg border border-stone-900/[0.1] bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 bg-brand-primary [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-95 text-brand-secondary rounded-xl font-semibold text-xs shadow-diffused active:scale-[0.98] transition-[transform,opacity] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 select-none"
        >
          {submitting ? 'Dispatching Request...' : 'Send Request to Staff'}
        </button>
      </form>

      {/* Sticky Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-900/[0.07] px-6 py-2.5 flex justify-around items-center z-40 max-w-md mx-auto shadow-lg">
        <button 
          onClick={onBack} 
          className="flex flex-col items-center gap-0.5 text-stone-500 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 active:scale-[0.93] transition-[color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        >
          <span className="text-[11px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => {}} 
          className="flex flex-col items-center gap-0.5 text-stone-900 font-bold active:scale-[0.93] transition-transform duration-120 select-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mb-0.5" />
          <span className="text-[11px]">Services</span>
        </button>
        <button 
          onClick={() => onNavigateTab ? onNavigateTab('dining') : onBack()} 
          className="flex flex-col items-center gap-0.5 text-stone-500 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 active:scale-[0.93] transition-[color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        >
          <span className="text-[11px] font-medium">{property?.diningEnabled !== false ? 'Dining' : 'House Guide'}</span>
        </button>
        <button 
          onClick={() => onNavigateTab ? onNavigateTab('my-requests') : onBack()} 
          className="flex flex-col items-center gap-0.5 text-stone-500 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 active:scale-[0.93] transition-[color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        >
          <span className="text-[11px] font-medium">My Orders</span>
        </button>
      </nav>
    </div>
  );
};
