import React, { useEffect, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, ChevronRight, Plus, UtensilsCrossed, Sparkles } from 'lucide-react';
import { ServiceRequest } from '../../types';
import { GuestBottomNav } from './GuestBottomNav';

interface GuestRequestsListProps {
  onBack: () => void;
  onSelectRequest: (requestId: string) => void;
  onNewRequest: () => void;
  onNavigateTab?: (view: string, data?: any) => void;
}

export const GuestRequestsList: React.FC<GuestRequestsListProps> = ({
  onBack,
  onSelectRequest,
  onNewRequest,
  onNavigateTab,
}) => {
  const { property, room } = useTenant();

  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  // Always scroll to top on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, []);

  // Filter requests strictly belonging to this checked-in room (prevents stranger privacy leak)
  const roomRequests = room 
    ? allRequests.filter((r) => r.propertyId === property?.id && r.roomId === room.id)
    : [];

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 p-4 pb-20 selection:bg-amber-100 overscroll-y-contain flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1">
        <header className="flex items-center justify-between mb-4">
          <button 
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="w-11 h-11 -ml-2 rounded-xl flex items-center justify-center text-stone-700 hover:text-stone-950 active:bg-stone-200/60 active:scale-95 transition-all cursor-pointer select-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={onNewRequest}
            className="flex items-center gap-1.5 text-xs font-semibold bg-stone-900 text-amber-300 px-3.5 py-2 rounded-xl shadow-xs active:scale-[0.96] transition-all hover:bg-stone-850 select-none border border-stone-800 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Request</span>
          </button>
        </header>

        <div className="mb-4">
          <h1 className="text-xl font-serif font-bold text-stone-900">Room Orders & Requests</h1>
          <p className="text-xs text-stone-500 font-medium">
            {room ? `Track status and updates for Room ${room.roomNumber}` : property?.name || 'All orders'}
          </p>
        </div>

        {roomRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-900/[0.08] p-8 text-center shadow-diffused">
            <Clock className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-stone-800">No active service requests</p>
            <p className="text-xs text-stone-500 mt-1 mb-4 leading-relaxed">
              You haven't requested any housekeeping, pool assistance, or in-room dining yet.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={onNewRequest}
                className="px-4 py-2 bg-emerald-950 text-amber-200 rounded-xl text-xs font-semibold active:scale-[0.96] transition-[background-color,transform] duration-140 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-900 select-none shadow-2xs"
              >
                Request Service
              </button>
              <button
                onClick={() => onNavigateTab ? onNavigateTab('dining') : onBack()}
                className="px-4 py-2 bg-stone-100/90 text-stone-800 rounded-xl text-xs font-semibold active:scale-[0.96] transition-[background-color,transform] duration-140 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 select-none border border-stone-900/[0.05]"
              >
                {property?.diningEnabled !== false ? 'Order Dining' : 'House Guide'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {roomRequests.map((req) => (
              <button
                key={req.id}
                onClick={() => onSelectRequest(req.id)}
                className="w-full text-left bg-white rounded-2xl border border-stone-900/[0.08] p-4 shadow-diffused [@media(hover:hover)_and_(pointer:fine)]:hover:border-emerald-850/50 active:scale-[0.98] transition-[border-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-between group select-none"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                      req.status === 'completed'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-900/[0.12]'
                        : req.status === 'in_progress'
                        ? 'bg-blue-50 text-blue-900 border-blue-900/[0.12]'
                        : req.status === 'cancelled'
                        ? 'bg-stone-100 text-stone-700 border-stone-900/[0.1]'
                        : 'bg-amber-50 text-amber-900 border-amber-900/[0.12]'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-wide">
                      {req.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 leading-snug group-hover:text-emerald-950 transition-colors">
                    {req.title}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-1 font-mono">
                    <span>
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {req.assignedTo && (
                      <span className="font-sans font-medium text-emerald-800">&bull; Assigned to Duty Team</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-emerald-900 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 transition-[color,transform] duration-150" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Slim Bottom Navigation */}
      <GuestBottomNav
        activeTab="my-requests"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};
