import React, { useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, ChevronRight, Plus, UtensilsCrossed, Sparkles } from 'lucide-react';
import { ServiceRequest } from '../../types';

interface GuestRequestsListProps {
  onBack: () => void;
  onSelectRequest: (requestId: string) => void;
  onNewRequest: () => void;
  onNavigateTab?: (view: string) => void;
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

  // Filter requests strictly belonging to this checked-in room (prevents stranger privacy leak)
  const roomRequests = room 
    ? allRequests.filter((r) => r.propertyId === property?.id && r.roomId === room.id)
    : [];

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 p-5 pb-28 selection:bg-amber-100">
      <div className="max-w-md mx-auto">
        <header className="flex items-center justify-between mb-5">
          <button 
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 active:scale-[0.95] transition-[color,transform] duration-140 select-none"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Room
          </button>
          <button
            onClick={onNewRequest}
            className="flex items-center gap-1 text-xs font-semibold bg-stone-900 text-amber-300 px-3 py-1.5 rounded-xl shadow-xs active:scale-[0.96] transition-all hover:bg-stone-850 select-none border border-stone-800"
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
                Order Dining
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
                      <span className="font-sans font-medium text-stone-600">&bull; Attended by {req.assignedTo.name}</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:group-hover:text-emerald-900 [@media(hover:hover)_and_(pointer:fine)]:group-hover:translate-x-0.5 transition-[color,transform] duration-150" />
              </button>
            ))}
          </div>
        )}
      </div>

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
          onClick={() => onNavigateTab ? onNavigateTab('dining') : onBack()} 
          className="flex flex-col items-center gap-0.5 text-stone-500 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 active:scale-[0.93] transition-[color,transform] duration-120 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
        >
          <span className="text-[11px] font-medium">Dining</span>
        </button>
        <button 
          onClick={() => {}} 
          className="flex flex-col items-center gap-0.5 text-stone-950 font-bold active:scale-[0.93] transition-transform duration-120 select-none"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mb-0.5" />
          <span className="text-[11px]">My Orders</span>
        </button>
      </nav>
    </div>
  );
};
