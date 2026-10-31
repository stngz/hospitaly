import React, { useState, useEffect } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService } from '../../lib/store';
import {
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Wrench,
  Waves,
  Car,
  Check,
  DoorClosed,
  BellRing,
  Moon,
} from 'lucide-react';
import { DeliveryPreference, RequestPriority } from '../../types';
import { GuestBottomNav } from './GuestBottomNav';

interface ServiceRequestFlowProps {
  initialCategory?: string;
  initialItem?: string;
  onBack: () => void;
  onSubmitted: (requestId: string, notice?: string) => void;
  onNavigateTab?: (view: string, data?: any) => void;
}

const CATEGORIES = [
  {
    id: 'housekeeping',
    title: 'Housekeeping',
    icon: Sparkles,
    items: [
      'Fresh towels',
      'Extra pillows',
      'House cleaning & bed making',
      'Linen & towel change',
      'Kitchen dishware help',
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    icon: Wrench,
    items: [
      'Air conditioning check',
      'Gas & kitchen stove help',
      'Hot water or plumbing check',
      'TV or Wi-Fi help',
      'Power or lighting check',
    ],
  },
  {
    id: 'pool_garden',
    title: 'Pool & garden',
    icon: Waves,
    items: [
      'Pool towels',
      'Pool skimming & cleaning',
      'Sun loungers setup',
      'Braai / outdoor area setup',
    ],
  },
  {
    id: 'transport',
    title: 'Transport',
    icon: Car,
    items: [
      'Airport transfer (KKIA)',
      'Local town taxi',
      'Shopping mall transfer',
    ],
  },
] as const;

export const ServiceRequestFlow: React.FC<ServiceRequestFlowProps> = ({
  initialCategory = 'housekeeping',
  initialItem = '',
  onBack,
  onSubmitted,
  onNavigateTab,
}) => {
  const { property, room } = useTenant();

  const normalizedInitialCategory = CATEGORIES.some((c) => c.id === initialCategory)
    ? initialCategory
    : 'housekeeping';

  const [selectedCategory, setSelectedCategory] = useState<string>(normalizedInitialCategory);
  const [selectedItem, setSelectedItem] = useState<string>(initialItem);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('normal');
  const [deliveryPreference, setDeliveryPreference] = useState<DeliveryPreference>('knock');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  const activeCatObj = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  const guestFullDisplay = room?.currentGuestName
    ? `${room.guestTitle ? `${room.guestTitle} ` : ''}${room.currentGuestName}`
    : room
    ? `Guest in ${room.name || room.roomNumber}`
    : 'Guest';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!property) {
      setErrorMsg('Property context unavailable.');
      return;
    }
    if (property.status === 'suspended') {
      setErrorMsg(
        property.suspendMessage ||
          `We're not taking requests through the app right now. Please contact reception: ${property.contactPhone}`
      );
      return;
    }
    if (!room || !room.activeStayId) {
      setErrorMsg('Please scan your house QR code first to send a request.');
      return;
    }
    if (!selectedItem && !description.trim()) {
      setErrorMsg('Please choose a request or write a short note.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const newRequest = dbService.createRequest({
        propertyId: property.id,
        roomId: room.id,
        roomNumber: room.name || room.roomNumber,
        stayId: room.activeStayId,
        guestSessionId: room.activeStayId,
        category: (selectedCategory as any) || 'housekeeping',
        title: selectedItem || description.trim().slice(0, 80) || 'Guest request',
        description: description.trim(),
        priority,
        deliveryPreference,
        guestName: guestFullDisplay,
        guestPhone: room.guestPhone || '',
      });

      if (newRequest.isDuplicate) {
        onSubmitted(newRequest.id, 'Already on its way');
      } else {
        onSubmitted(newRequest.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not send request.');
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="service-request-flow"
      className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-28 selection:bg-amber-100 overscroll-y-contain flex flex-col"
    >
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
            <h1 className="text-sm font-bold text-stone-900 leading-tight">Send a request</h1>
            <p className="text-xs text-stone-500">
              {room ? room.name || room.roomNumber : property?.name}
            </p>
          </div>
        </div>
        <span
          data-testid="sending-as-badge"
          className="text-xs bg-[#F5F1E8] text-[#1C3A31] px-2.5 py-1 rounded-full font-semibold border border-stone-900/[0.08]"
        >
          Sending as {guestFullDisplay}
        </span>
      </header>

      <form onSubmit={handleSubmit} className="p-4 max-w-lg mx-auto space-y-5 w-full">
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200/90 text-red-700 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Category Tabs */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
            Category
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  data-testid={`cat-${cat.id}`}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedItem('');
                  }}
                  className={`min-h-11 flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold select-none active:scale-[0.98] transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-[#1C3A31] text-[#E0B973] border-[#1C3A31] shadow-xs'
                      : 'bg-white border-stone-900/[0.08] text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{cat.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Common Requests */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-2">
            Common requests
          </label>
          <div className="grid grid-cols-1 gap-2">
            {activeCatObj.items.map((item) => {
              const isChosen = selectedItem === item;
              return (
                <button
                  type="button"
                  key={item}
                  onClick={() => setSelectedItem(isChosen ? '' : item)}
                  className={`min-h-11 p-3 rounded-xl border text-left text-xs font-medium active:scale-[0.99] transition-all flex items-center justify-between select-none cursor-pointer ${
                    isChosen
                      ? 'border-[#1C3A31] bg-amber-50/70 text-stone-950 font-semibold ring-1 ring-[#1C3A31]/40'
                      : 'border-stone-900/[0.07] bg-white text-stone-700 hover:border-stone-400'
                  }`}
                >
                  <span>{item}</span>
                  {isChosen && <Check className="w-4 h-4 text-[#1C3A31] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Anything else? note */}
        <div>
          <label
            htmlFor="guest-request-note"
            className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5"
          >
            Anything else?
          </label>
          <textarea
            id="guest-request-note"
            data-testid="request-note-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell us what you need"
            className="w-full text-sm p-3 rounded-xl border border-stone-900/[0.12] bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1C3A31]/25 focus:border-[#1C3A31]"
          />
        </div>

        {/* 4. Urgency (Normal / Urgent) */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
            Urgency
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'normal', label: 'Normal' },
                { id: 'urgent', label: 'Urgent' },
              ] as const
            ).map((p) => {
              const isSelected = priority === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  data-testid={`priority-${p.id}`}
                  onClick={() => setPriority(p.id)}
                  className={`min-h-11 py-2.5 px-3 rounded-xl text-xs font-semibold border active:scale-[0.98] transition-all select-none cursor-pointer ${
                    isSelected
                      ? p.id === 'urgent'
                        ? 'bg-rose-700 text-white border-rose-700'
                        : 'bg-[#1C3A31] text-white border-[#1C3A31]'
                      : 'bg-white border-stone-900/[0.08] text-stone-700'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Delivery preference (Knock / Ring / Leave at door) */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block mb-1.5">
            Delivery preference
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { id: 'knock', label: 'Knock', icon: DoorClosed },
                { id: 'leave_at_door', label: 'Leave at door', icon: Moon },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const isSelected = deliveryPreference === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  data-testid={`delivery-pref-${opt.id}`}
                  onClick={() => setDeliveryPreference(opt.id)}
                  className={`min-h-11 p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-[#1C3A31] text-white border-[#1C3A31]'
                      : 'bg-white border-stone-900/[0.08] text-stone-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          data-testid="submit-request-btn"
          disabled={submitting}
          className="w-full min-h-11 py-3.5 bg-[#1C3A31] text-[#E0B973] rounded-xl font-bold text-sm shadow-sm active:scale-[0.99] transition-all disabled:opacity-50 select-none cursor-pointer"
        >
          {submitting ? 'Sending...' : 'Send request'}
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
