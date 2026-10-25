import React, { useState, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { ArrowLeft, Plus, Check, ShoppingBag, UtensilsCrossed, AlertCircle } from 'lucide-react';
import { DiningItem } from '../../types';

interface GuestDiningMenuProps {
  onBack: () => void;
  onRequestSubmitted: (requestId: string) => void;
  onNavigateTab?: (view: string) => void;
}

export const GuestDiningMenu: React.FC<GuestDiningMenuProps> = ({ 
  onBack, 
  onRequestSubmitted,
  onNavigateTab 
}) => {
  const { property, room } = useTenant();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{ item: DiningItem; quantity: number }[]>([]);
  const [notes, setNotes] = useState('');
  const [isOrdering, setIsOrdering] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        return prev.map((p) => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    notificationService.triggerHaptic('light');
    setCart((prev) => {
      const existing = prev.find((p) => p.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((p) => p.item.id === itemId ? { ...p, quantity: p.quantity - 1 } : p);
      }
      return prev.filter((p) => p.item.id !== itemId);
    });
  };

  const totalAmount = cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
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

      const itemsSummary = cart.map(c => `${c.quantity}x ${c.item.name}`).join(', ');
      const desc = `In-Room Dining Order (${property.currency} ${totalAmount.toLocaleString()}):\n${itemsSummary}${notes ? `\nSpecial Notes: ${notes.trim()}` : ''}`;

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
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-36 selection:bg-amber-100">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-900/[0.07] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-stone-200/70 active:scale-[0.95] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] text-stone-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-stone-900 leading-tight">In-Room Dining & Refreshments</h1>
            <p className="text-[11px] text-stone-500 font-medium">
              {room ? `Delivered to Room ${room.roomNumber}` : 'Dining Menu'}
            </p>
          </div>
        </div>
        <div className="text-xs font-mono font-bold bg-amber-100/90 text-amber-950 px-2.5 py-1 rounded-md border border-amber-900/[0.08]">
          {property?.currency || 'ZMW'}
        </div>
      </header>

      {errorMsg && (
        <div className="m-4 p-3 bg-red-50 border border-red-200/90 text-red-700 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Category Pills */}
      <div className="p-4 overflow-x-auto flex gap-2 no-scrollbar">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap active:scale-[0.96] transition-[background-color,border-color,color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                isSelected
                  ? 'bg-brand-primary text-brand-secondary shadow-xs border border-transparent'
                  : 'bg-white border border-stone-900/[0.08] text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:border-stone-400'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Food Items Grid */}
      <div className="px-4 space-y-3.5 max-w-lg mx-auto">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-900/[0.07] p-8 text-center shadow-diffused">
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
                className="bg-white rounded-2xl border border-stone-900/[0.07] overflow-hidden shadow-diffused flex flex-col sm:flex-row [@media(hover:hover)_and_(pointer:fine)]:hover:border-brand-primary/40 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]"
              >
                <div className="w-full sm:w-32 h-36 sm:h-auto aspect-[4/3] sm:aspect-square bg-stone-100 shrink-0 overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 ease-out"
                  />
                </div>
                <div className="p-4 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-sm font-bold text-stone-900 leading-snug">{item.name}</h3>
                      <span className="text-xs font-mono font-bold text-brand-primary whitespace-nowrap bg-stone-100/90 px-2 py-0.5 rounded border border-stone-900/[0.05]">
                        {property?.currency} {item.price}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">{item.description}</p>
                    {item.dietary && item.dietary.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 text-[11px] text-stone-500 font-medium">
                        <span>{item.dietary.join(' · ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[11px] text-stone-400 capitalize font-medium">{item.category}</span>
                    {inCart ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-7 h-7 rounded-lg bg-stone-100 text-stone-800 font-bold flex items-center justify-center [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 active:scale-[0.92] transition-transform duration-120"
                        >
                          -
                        </button>
                        <span className="text-xs font-mono font-bold w-4 text-center">{inCart.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-7 h-7 rounded-lg bg-brand-primary text-white font-bold flex items-center justify-center [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 active:scale-[0.92] transition-transform duration-120"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="px-3.5 py-1.5 bg-brand-primary [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 text-brand-secondary text-xs font-semibold rounded-xl flex items-center gap-1 active:scale-[0.96] transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add to Order
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Bottom Sheet */}
      {cart.length > 0 && (
        <div className="fixed bottom-14 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-900/[0.08] p-4 shadow-modal z-30 max-w-md mx-auto rounded-t-2xl sheet-slide-up-animate">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-bold text-stone-900">{totalCount} items in tray</span>
              <p className="text-sm font-bold font-mono text-brand-primary">
                Total: {property?.currency} {totalAmount.toLocaleString()}
              </p>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">
              {room ? `Bill to Room ${room.roomNumber}` : 'Dining Order'}
            </span>
          </div>

          <input
            type="text"
            placeholder="Special dietary requests or delivery time..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-stone-900/[0.1] bg-white mb-2.5 focus:outline-none focus:ring-1 focus:ring-brand-primary"
          />

          <button
            onClick={handlePlaceOrder}
            disabled={isOrdering}
            className="w-full py-3 bg-brand-primary text-brand-secondary rounded-xl font-bold text-xs shadow-diffused flex items-center justify-center gap-2 active:scale-[0.98] transition-[transform,opacity] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 select-none"
          >
            <ShoppingBag className="w-4 h-4" />
            {isOrdering ? 'Dispatching to Kitchen...' : `Place Room Order (${property?.currency} ${totalAmount.toLocaleString()})`}
          </button>
        </div>
      )}

      {/* Sticky Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-900/[0.07] px-6 py-2.5 flex justify-around items-center z-40 max-w-md mx-auto shadow-lg">
        <button 
          onClick={onBack} 
          className="flex flex-col items-center gap-0.5 text-stone-500 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 active:scale-[0.93] transition-[color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        >
          <span className="text-[11px] font-medium">Home</span>
        </button>
        <button 
          onClick={() => onNavigateTab ? onNavigateTab('request') : onBack()} 
          className="flex flex-col items-center gap-0.5 text-stone-500 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 active:scale-[0.93] transition-[color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        >
          <span className="text-[11px] font-medium">Services</span>
        </button>
        <button 
          onClick={() => {}} 
          className="flex flex-col items-center gap-0.5 text-stone-900 font-bold active:scale-[0.93] transition-transform duration-120 select-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand-primary mb-0.5" />
          <span className="text-[11px]">Dining</span>
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
