import React, { useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { formatPropertyTime } from '../../lib/time';
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

const formatCategoryLabel = (cat: string) => {
  switch (cat) {
    case 'housekeeping':
      return 'Housekeeping';
    case 'maintenance':
      return 'Maintenance';
    case 'pool_garden':
      return 'Pool & garden';
    case 'transport':
      return 'Transport';
    case 'concierge':
      return 'Reception';
    default:
      return 'Service';
  }
};

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

  const timezone = property?.timezone || 'Africa/Lusaka';

  // Strict privacy isolation: only show requests for this house AND this activeStayId
  const roomRequests = room?.activeStayId
    ? allRequests
        .filter(
          (r) =>
            !r.archived &&
            r.propertyId === property?.id &&
            r.roomId === room.id &&
            r.stayId === room.activeStayId
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900">
            <Clock className="w-3 h-3" /> Sent
          </span>
        );
      case 'acknowledged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-900">
            <Sparkles className="w-3 h-3" /> Confirmed by reception
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-900">
            <UserCheck className="w-3 h-3" /> On the way
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900">
            <CheckCircle2 className="w-3 h-3" /> Done — enjoy!
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-200 text-stone-700">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div data-testid="guest-requests-list" className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-100 active:scale-[0.92] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-stone-900">Your requests</h1>
            <p className="text-xs text-stone-500">
              {room ? room.name || room.roomNumber : 'Current stay'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewRequest}
          className="min-h-11 px-3.5 py-2 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs active:scale-[0.96] transition-transform cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </header>

      <main className="p-4 max-w-lg mx-auto space-y-3">
        {!room ? (
          <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-600 mx-auto" />
            <p className="text-sm font-bold text-amber-950">No active house selected</p>
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
                No requests yet for {room.name || room.roomNumber}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Tap below to request towels, cleaning, or maintenance.
              </p>
            </div>
            <button
              type="button"
              onClick={onNewRequest}
              className="mt-2 min-h-11 px-5 py-2.5 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold shadow-sm inline-flex items-center gap-2 active:scale-[0.97] transition-transform cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Send a request
            </button>
          </div>
        ) : (
          roomRequests.map((req) => (
            <div
              key={req.id}
              data-testid={`guest-request-item-${req.id}`}
              className="w-full bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5"
            >
              <button
                type="button"
                onClick={() => onSelectRequest(req.id)}
                className="w-full text-left flex items-center justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getStatusBadge(req.status)}
                  </div>
                  <h3 className="text-sm font-bold text-stone-900 line-clamp-2">{req.title || 'Service request'}</h3>
                  {req.description && (
                    <p className="text-xs text-stone-500 line-clamp-1">{req.description}</p>
                  )}
                  <p className="text-xs text-stone-500">
                    {formatCategoryLabel(req.category || '')} &middot;{' '}
                    {formatPropertyTime(req.createdAt, timezone)}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-stone-400 shrink-0" />
              </button>

              {req.status === 'pending' && (
                <div className="pt-2 border-t border-stone-100 flex justify-end">
                  <button
                    type="button"
                    data-testid={`cancel-request-btn-${req.id}`}
                    onClick={() =>
                      dbService.updateRequestStatus(
                        req.id,
                        'cancelled',
                        undefined,
                        'Cancelled by guest'
                      )
                    }
                    className="min-h-11 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                  >
                    Cancel request
                  </button>
                </div>
              )}
            </div>
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
