import React, { useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Plus,
  ChevronRight,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { GuestBottomNav } from './GuestBottomNav';

interface GuestRequestsListProps {
  onBack: () => void;
  onSelectRequest: (id: string) => void;
  onNewRequest: () => void;
  onNavigateTab?: (view: any, data?: any) => void;
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

  // Strict privacy isolation: only show requests for this house AND this activeStayId
  const roomRequests = room?.activeStayId
    ? allRequests
        .filter(
          (r) =>
            r.propertyId === property?.id &&
            r.roomId === room.id &&
            (r.stayId === room.activeStayId || r.guestSessionId === room.activeStayId)
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <Clock className="w-3 h-3" /> Sent
          </span>
        );
      case 'acknowledged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <Sparkles className="w-3 h-3" /> Acknowledged
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <UserCheck className="w-3 h-3" /> On the way
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-600">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-full text-stone-600 hover:bg-stone-100 active:scale-[0.92] transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-stone-900">My Requests</h1>
            <p className="text-xs text-stone-500">
              {room ? `Requests for ${room.roomNumber}` : 'Select your house to view requests'}
            </p>
          </div>
        </div>

        <button
          onClick={onNewRequest}
          className="px-3 py-1.5 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-[0.96] transition-transform"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-3">
        {!room ? (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
            <p className="text-sm font-bold text-amber-950">No Active House Selected</p>
            <p className="text-xs text-amber-800">
              Please scan the QR code inside your house to view your requests.
            </p>
          </div>
        ) : roomRequests.length === 0 ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center space-y-3 mt-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-800">
                No requests yet for {room.roomNumber}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Tap below to request towels, maintenance, or housekeeping.
              </p>
            </div>
            <button
              onClick={onNewRequest}
              className="mt-2 px-5 py-2.5 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold shadow-sm inline-flex items-center gap-2 active:scale-[0.97] transition-transform"
            >
              <Plus className="w-4 h-4" /> Make a Request
            </button>
          </div>
        ) : (
          roomRequests.map((req) => (
            <button
              key={req.id}
              onClick={() => onSelectRequest(req.id)}
              className="w-full text-left bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs hover:border-stone-400 active:scale-[0.985] transition-all flex items-center justify-between gap-3"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(req.status)}
                  <span className="text-xs uppercase font-bold tracking-wider text-stone-400">
                    {req.category}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-stone-900 truncate">{req.title}</h3>
                {req.description && (
                  <p className="text-xs text-stone-500 line-clamp-1">{req.description}</p>
                )}
                <p className="text-xs text-stone-400">
                  Sent at{' '}
                  {new Date(req.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {req.assignedTo ? ` · Assigned to ${req.assignedTo.name}` : ''}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-stone-400 shrink-0" />
            </button>
          ))
        )}
      </main>

      {/* Bottom Navigation */}
      <GuestBottomNav
        activeTab="my-requests"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};
