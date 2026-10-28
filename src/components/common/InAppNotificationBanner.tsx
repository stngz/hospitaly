import React, { useState, useEffect } from 'react';
import { notificationService, InAppNotification } from '../../lib/notifications';
import { Bell, X, Sparkles, ArrowRight } from 'lucide-react';

interface InAppNotificationBannerProps {
  onNavigateToRequest?: (requestId?: string) => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({
  onNavigateToRequest,
}) => {
  const [activeNotification, setActiveNotification] = useState<InAppNotification | null>(null);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((alert) => {
      setActiveNotification(alert);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!activeNotification) return;

    const timer = setTimeout(() => {
      setActiveNotification(null);
    }, 4000);

    return () => clearTimeout(timer);
  }, [activeNotification]);

  if (!activeNotification) return null;

  return (
    <div className="fixed top-3 inset-x-0 z-50 px-4 pointer-events-none flex justify-center">
      <div className="pointer-events-auto max-w-sm w-full bg-stone-900/95 backdrop-blur-md text-stone-100 rounded-2xl p-3.5 shadow-modal border border-white/[0.12] flex items-center gap-3 animate-[slideDown_240ms_cubic-bezier(0.16,1,0.3,1)]">
        {/* Pulse Icon */}
        <div className="w-10 h-10 rounded-xl bg-amber-300 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs relative">
          <Bell className="w-5 h-5 animate-bounce" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-stone-900" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {activeNotification.roomNumber ? activeNotification.roomNumber : 'Update'}
            </span>
            <span className="text-xs text-stone-400">· Just now</span>
          </div>
          <p className="text-xs font-bold text-white truncate mt-0.5">{activeNotification.title}</p>
          <p className="text-xs text-stone-300 truncate">{activeNotification.subtitle}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {activeNotification.actionLabel && onNavigateToRequest && (
            <button
              onClick={() => {
                setActiveNotification(null);
                onNavigateToRequest();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-300 text-xs font-bold flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
            >
              <span>{activeNotification.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setActiveNotification(null)}
            className="p-1.5 rounded-xl text-stone-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
