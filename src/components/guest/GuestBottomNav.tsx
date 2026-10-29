import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { Home, ConciergeBell, BookOpen, ClipboardList } from 'lucide-react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';

interface GuestBottomNavProps {
  activeTab: 'home' | 'request' | 'dining' | 'my-requests';
  onNavigate: (view: string, data?: any) => void;
}

export const GuestBottomNav: React.FC<GuestBottomNavProps> = ({ activeTab, onNavigate }) => {
  const { property, room } = useTenant();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const handleFocusIn = (e: FocusEvent) => {
      if (isEditable(e.target)) {
        setKeyboardOpen(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        if (typeof document !== 'undefined' && !isEditable(document.activeElement)) {
          setKeyboardOpen(false);
        }
      }, 80);
    };

    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);
    return () => {
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  const activeRequestsCount = room?.activeStayId
    ? allRequests.filter(
        (r) =>
          !r.archived &&
          r.propertyId === property?.id &&
          r.roomId === room.id &&
          r.stayId === room.activeStayId &&
          (r.status === 'pending' || r.status === 'acknowledged' || r.status === 'in_progress')
      ).length
    : 0;

  if (keyboardOpen) {
    return null;
  }

  const navItems = [
    {
      id: 'home' as const,
      label: 'Home',
      icon: Home,
      action: () => onNavigate('home'),
    },
    {
      id: 'request' as const,
      label: 'Requests',
      icon: ConciergeBell,
      action: () => onNavigate('request', {}),
    },
    {
      id: 'dining' as const,
      label: 'House guide',
      icon: BookOpen,
      action: () => onNavigate('dining'),
    },
    {
      id: 'my-requests' as const,
      label: 'My requests',
      icon: ClipboardList,
      badge: activeRequestsCount,
      action: () => onNavigate('my-requests'),
    },
  ];

  return (
    <nav
      role="navigation"
      aria-label="Guest Navigation"
      data-testid="guest-bottom-nav"
      className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))] flex justify-around items-center z-40 max-w-md mx-auto shadow-nav"
    >
      {navItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            data-testid={`guest-nav-${item.id}`}
            onClick={item.action}
            aria-current={isActive ? 'page' : undefined}
            className={`relative flex-1 min-h-11 py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors select-none active:scale-95 cursor-pointer ${
              isActive
                ? 'text-[#1C3A31] font-bold'
                : 'text-stone-500 hover:text-stone-800 font-medium'
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className={`w-5 h-5 ${
                  isActive ? 'text-[#1C3A31] stroke-[2.25]' : 'text-stone-500 stroke-[1.8]'
                }`}
              />
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  data-testid="guest-nav-badge"
                  className="absolute -top-1.5 -right-3 bg-amber-400 text-stone-950 text-xs font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-2xs"
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-xs tracking-tight leading-none whitespace-nowrap">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
