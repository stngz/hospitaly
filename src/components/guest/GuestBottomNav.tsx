import React from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';

export type GuestNavTab = 'home' | 'request' | 'dining' | 'my-requests';

interface GuestBottomNavProps {
  activeTab: GuestNavTab;
  onNavigate: (tab: GuestNavTab, data?: any) => void;
}

export const GuestBottomNav: React.FC<GuestBottomNavProps> = ({ activeTab, onNavigate }) => {
  const { property, room } = useTenant();

  const allRequests = React.useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  const activeRequestsCount = React.useMemo(() => {
    if (!room || !property) return 0;
    return allRequests.filter(
      (r) => r.propertyId === property.id && r.roomId === room.id && r.status !== 'completed' && r.status !== 'cancelled'
    ).length;
  }, [allRequests, property, room]);

  const isDiningEnabled = property?.diningEnabled === true;
  const guideTabLabel = isDiningEnabled ? 'Dining' : 'House Guide';

  const handleTabClick = (tab: GuestNavTab) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    onNavigate(tab);
  };

  return (
    <nav 
      role="navigation"
      aria-label="Guest Experience Navigation"
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200/70 px-3 py-1 flex justify-around items-center z-40 max-w-md mx-auto shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
    >
      {/* 1. Home Tab */}
      <button
        type="button"
        onClick={() => handleTabClick('home')}
        aria-label="Navigate to Home"
        aria-current={activeTab === 'home' ? 'page' : undefined}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform cursor-pointer select-none"
      >
        <div className={`w-1 h-1 rounded-full mb-0.5 transition-all ${
          activeTab === 'home' ? 'bg-amber-500 scale-100' : 'bg-transparent scale-0'
        }`} />
        <span className={`text-[11px] leading-none transition-colors ${
          activeTab === 'home' ? 'font-bold text-stone-950' : 'font-medium text-stone-400 hover:text-stone-700'
        }`}>
          Home
        </span>
      </button>

      {/* 2. Services Tab */}
      <button
        type="button"
        onClick={() => handleTabClick('request')}
        aria-label="Navigate to Services"
        aria-current={activeTab === 'request' ? 'page' : undefined}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform cursor-pointer select-none"
      >
        <div className={`w-1 h-1 rounded-full mb-0.5 transition-all ${
          activeTab === 'request' ? 'bg-amber-500 scale-100' : 'bg-transparent scale-0'
        }`} />
        <span className={`text-[11px] leading-none transition-colors ${
          activeTab === 'request' ? 'font-bold text-stone-950' : 'font-medium text-stone-400 hover:text-stone-700'
        }`}>
          Services
        </span>
      </button>

      {/* 3. House Guide / Dining Tab */}
      <button
        type="button"
        onClick={() => handleTabClick('dining')}
        aria-label={`Navigate to ${guideTabLabel}`}
        aria-current={activeTab === 'dining' ? 'page' : undefined}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform cursor-pointer select-none"
      >
        <div className={`w-1 h-1 rounded-full mb-0.5 transition-all ${
          activeTab === 'dining' ? 'bg-amber-500 scale-100' : 'bg-transparent scale-0'
        }`} />
        <span className={`text-[11px] leading-none transition-colors ${
          activeTab === 'dining' ? 'font-bold text-stone-950' : 'font-medium text-stone-400 hover:text-stone-700'
        }`}>
          {guideTabLabel}
        </span>
      </button>

      {/* 4. My Orders / Requests Tab */}
      <button
        type="button"
        onClick={() => handleTabClick('my-requests')}
        aria-label="Navigate to My Orders"
        aria-current={activeTab === 'my-requests' ? 'page' : undefined}
        className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform cursor-pointer select-none relative"
      >
        <div className={`w-1 h-1 rounded-full mb-0.5 transition-all ${
          activeTab === 'my-requests' ? 'bg-amber-500 scale-100' : 'bg-transparent scale-0'
        }`} />
        <div className="relative inline-flex items-center">
          <span className={`text-[11px] leading-none transition-colors ${
            activeTab === 'my-requests' ? 'font-bold text-stone-950' : 'font-medium text-stone-400 hover:text-stone-700'
          }`}>
            My Orders
          </span>
          {activeRequestsCount > 0 && (
            <span 
              aria-label={`${activeRequestsCount} active requests`}
              className="absolute -top-1.5 -right-3 min-w-[14px] h-[14px] px-1 rounded-full bg-amber-400 text-stone-950 font-mono text-[9px] font-bold flex items-center justify-center shadow-2xs"
            >
              {activeRequestsCount}
            </span>
          )}
        </div>
      </button>
    </nav>
  );
};
