import React, { useState, useEffect } from 'react';
import { notificationService, InAppNotification } from '../../lib/notifications';
import { 
  Bell, 
  UtensilsCrossed, 
  Sparkles, 
  Compass, 
  CheckCircle2, 
  X, 
  ArrowRight,
  Volume2,
  VolumeX
} from 'lucide-react';

interface InAppNotificationBannerProps {
  onNavigateToRequest?: (requestId: string) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  onNavigateToRequest
}) => {
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(notificationService.isSoundEnabled());

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notif) => {
      setActiveNotification(notif);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!activeNotification) return;
    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 5500);
    return () => clearTimeout(timer);
  }, [activeNotification]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundEnabled;
    notificationService.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) {
      notificationService.playStatusUpdateChime();
    }
  };

  if (!activeNotification) return null;

  const getIcon = () => {
    switch (activeNotification.category) {
      case 'dining':
        return <UtensilsCrossed className="w-4 h-4 text-amber-500" />;
      case 'housekeeping':
        return <Sparkles className="w-4 h-4 text-emerald-500" />;
      case 'concierge':
        return <Compass className="w-4 h-4 text-blue-500" />;
      default:
        return <Bell className="w-4 h-4 text-amber-400" />;
    }
  };

  const handleClick = () => {
    if (activeNotification.onAction) {
      activeNotification.onAction();
    }
    setActiveNotification(null);
  };

  return (
    <div className="fixed top-3 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
      <div 
        onClick={handleClick}
        role="button"
        tabIndex={0}
        className="pointer-events-auto w-full max-w-sm bg-stone-950/95 text-white backdrop-blur-xl border border-white/[0.12] rounded-2xl p-3.5 shadow-modal flex items-start gap-3 select-none active:scale-[0.98] transition-[transform,opacity] duration-200 cursor-pointer animate-[sheetSlideUp_260ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
      >
        <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/[0.1] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-bold">
              {activeNotification.roomNumber ? `Room ${activeNotification.roomNumber}` : 'Hotel Dispatch'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleSound}
                title={soundEnabled ? 'Mute chimes' : 'Unmute chimes'}
                className="text-stone-400 hover:text-white p-0.5 rounded transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-stone-300" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveNotification(null);
                }}
                className="text-stone-400 hover:text-white p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h4 className="text-xs font-semibold text-white tracking-tight truncate mt-0.5">
            {activeNotification.title}
          </h4>
          <p className="text-[11px] text-stone-300 leading-snug line-clamp-2 mt-0.5">
            {activeNotification.subtitle}
          </p>

          {activeNotification.actionLabel && (
            <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-300">
              <span>{activeNotification.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
