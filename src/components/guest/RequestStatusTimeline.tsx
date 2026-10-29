import React, { useState, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { formatPropertyTime } from '../../lib/time';
import { DeliveryPreference } from '../../types';
import {
  ArrowLeft,
  AlertCircle,
  Phone,
  X,
  Sparkles,
  Check,
  DoorClosed,
  Moon,
  Clock,
} from 'lucide-react';
import { GuestBottomNav } from './GuestBottomNav';

interface RequestStatusTimelineProps {
  requestId: string;
  onBack: () => void;
  onNavigateTab?: (view: string, data?: any) => void;
}

const STEPS = [
  { key: 'pending', label: 'Sent' },
  { key: 'acknowledged', label: 'Confirmed' },
  { key: 'in_progress', label: 'On the way' },
  { key: 'completed', label: 'Done' },
];

const getDepartmentTeamCopy = (category: string) => {
  switch (category) {
    case 'maintenance':
      return 'Maintenance team is on it';
    case 'pool_garden':
      return 'Pool & garden team is on it';
    case 'transport':
    case 'concierge':
      return 'Reception team is on it';
    default:
      return 'Housekeeping team is on it';
  }
};

export const RequestStatusTimeline: React.FC<RequestStatusTimelineProps> = ({
  requestId,
  onBack,
  onNavigateTab,
}) => {
  const { property } = useTenant();
  const [cancelling, setCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  const req = allRequests.find((r) => r.id === requestId);

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'acknowledged':
        return 1;
      case 'in_progress':
        return 2;
      case 'completed':
        return 3;
      case 'cancelled':
        return -1;
      default:
        return 0;
    }
  };

  const handleCancel = () => {
    if (!req) return;
    setCancelling(true);
    dbService.updateRequestStatus(
      req.id,
      'cancelled',
      undefined,
      'Cancelled by guest'
    );
    setCancelling(false);
    setShowConfirmCancel(false);
  };

  const handleDeliveryChange = (pref: DeliveryPreference) => {
    if (!req) return;
    dbService.updateDeliveryPreference(req.id, pref);
  };

  if (!req) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 p-6 flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-stone-400 mb-3" />
        <p className="text-stone-800 text-sm font-semibold mb-1">
          Request not found
        </p>
        <p className="text-stone-500 text-xs mb-4 text-center">
          This request may have been closed or belongs to another stay.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-2xl active:scale-[0.97] transition-all cursor-pointer"
        >
          Back to home
        </button>
      </div>
    );
  }

  const currentStep = getStepIndex(req.status);
  const isCancelled = req.status === 'cancelled';
  const isCompleted = req.status === 'completed';
  const isInProgress = req.status === 'in_progress';
  const canGuestCancel = req.status === 'pending';
  const receptionPhone = property?.contactPhone || '+260 97 405 6547';
  const cleanPhone = receptionPhone.replace(/[^0-9+]/g, '');
  const waPhone = (property?.whatsappPhone || receptionPhone).replace(/[^0-9]/g, '');
  const refCode = req.refCode || req.id.slice(-4).toUpperCase();
  const timezone = property?.timezone || 'Africa/Lusaka';
  const activeDeliveryPref: DeliveryPreference = req.deliveryPreference || 'knock';

  const getStatusHeading = () => {
    switch (req.status) {
      case 'completed':
        return 'Done — enjoy!';
      case 'in_progress':
        return 'On the way';
      case 'acknowledged':
        return 'Confirmed by reception';
      case 'cancelled':
        return 'Cancelled';
      default:
        return "Request received — we've told reception";
    }
  };

  return (
    <div
      data-testid="request-status-screen"
      className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-32 selection:bg-amber-100"
    >
      {/* 1. TOP HEADER: "Your request" + "{house} · Ref {ref}" */}
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-900/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-11 h-11 -ml-2 rounded-full hover:bg-stone-200/60 active:scale-[0.94] transition-all text-stone-700 flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-stone-900">Your request</h1>
            <p data-testid="request-ref-line" className="text-xs text-stone-500 font-medium">
              {req.roomNumber} &middot; Ref {refCode}
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 2. HERO STATUS CARD + SINGLE 4-STEP PROGRESS COMPONENT */}
        <div className="bg-[#1C3A31] text-white rounded-3xl p-5 shadow-modal border border-white/[0.08] relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-[#E0B973] font-bold px-2.5 py-1 rounded-full bg-[#E0B973]/15 border border-[#E0B973]/25">
                {req.title}
              </span>
              <span className="text-xs text-stone-300">
                {formatPropertyTime(req.createdAt, timezone)}
              </span>
            </div>

            <h2
              data-testid="request-status-heading"
              className="text-xl font-serif font-medium text-white tracking-tight leading-snug"
            >
              {getStatusHeading()}
            </h2>

            {req.description && (
              <p className="text-xs text-stone-200 leading-relaxed">{req.description}</p>
            )}

            {/* Single 4-step progress component: Sent -> Confirmed -> On the way -> Done */}
            {!isCancelled && (
              <div
                data-testid="request-status-timeline"
                className="pt-3 space-y-2"
              >
                <div className="grid grid-cols-4 gap-1.5">
                  {STEPS.map((step, idx) => {
                    const passed = idx <= currentStep;
                    return (
                      <div
                        key={step.key}
                        className={`h-1.5 rounded-full transition-colors ${
                          passed ? 'bg-[#E0B973]' : 'bg-white/20'
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="grid grid-cols-4 text-xs text-stone-200">
                  {STEPS.map((step, idx) => (
                    <span
                      key={step.key}
                      className={`${
                        idx === 0
                          ? 'text-left'
                          : idx === STEPS.length - 1
                          ? 'text-right'
                          : 'text-center'
                      } ${idx === currentStep ? 'font-bold text-[#E0B973]' : 'text-stone-300'}`}
                    >
                      {step.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. TEAM CARD: Shows department only, NEVER a person's name */}
        {!isCancelled && (
          <div
            data-testid="request-team-card"
            className="bg-white rounded-3xl p-4 border border-stone-900/[0.08] shadow-diffused flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#1C3A31]/[0.08] text-[#1C3A31] flex items-center justify-center shrink-0">
                {req.status === 'pending' ? (
                  <Clock className="w-5 h-5 text-amber-700" />
                ) : (
                  <Sparkles className="w-5 h-5 text-[#1C3A31]" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-stone-500 block">
                  Team status
                </span>
                <p data-testid="request-team-copy" className="text-sm font-bold text-stone-900">
                  {isCompleted
                    ? 'Completed by our team'
                    : isInProgress || req.status === 'acknowledged' || req.assignedTo
                    ? getDepartmentTeamCopy(req.category)
                    : 'Reception has your request'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`https://wa.me/${waPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-11 px-3 py-2 rounded-xl bg-[#F5F1E8] text-[#1C3A31] text-xs font-semibold inline-flex items-center justify-center"
              >
                WhatsApp
              </a>
              <a
                href={`tel:${cleanPhone}`}
                aria-label="Call reception"
                className="w-11 h-11 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {/* 4. DELIVERY PREFERENCE (Editable while not completed/cancelled) */}
        {!isCancelled && !isCompleted && (() => {
          const isHouseService =
            req.category === 'maintenance' ||
            req.title.toLowerCase().includes('cleaning') ||
            req.title.toLowerCase().includes('gas') ||
            req.title.toLowerCase().includes('kitchen') ||
            req.title.toLowerCase().includes('broken');

          if (isHouseService) {
            return (
              <div className="bg-white rounded-3xl p-4 border border-stone-900/[0.08] shadow-diffused space-y-2">
                <span className="text-xs uppercase tracking-wider text-stone-500 font-bold block">
                  Delivery preference
                </span>
                <div className="flex items-center gap-2 p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs font-semibold text-stone-800">
                  <DoorClosed className="w-4 h-4 text-[#1C3A31]" />
                  <span>Knock (staff enters house for service)</span>
                </div>
              </div>
            );
          }

          const deliveryOptions = [
            { id: 'leave_at_door', label: 'Leave at door', icon: Moon },
            { id: 'knock', label: 'Knock', icon: DoorClosed },
          ] as const;

          return (
            <div className="bg-white rounded-3xl p-4 border border-stone-900/[0.08] shadow-diffused space-y-3">
              <span className="text-xs uppercase tracking-wider text-stone-500 font-bold block">
                Delivery preference
              </span>

              <div className="grid grid-cols-2 gap-2">
                {deliveryOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = activeDeliveryPref === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      data-testid={`status-delivery-${opt.id}`}
                      onClick={() => handleDeliveryChange(opt.id)}
                      className={`min-h-11 flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all select-none active:scale-[0.96] cursor-pointer ${
                        active
                          ? 'bg-[#1C3A31] border-[#1C3A31] text-white font-bold shadow-2xs'
                          : 'bg-stone-50 border-stone-200/80 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <span className="text-xs leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* 5. CANCELLATION OPTION (Only while pending) */}
        {canGuestCancel && (
          <div className="pt-1 text-center">
            <button
              type="button"
              data-testid="status-cancel-request-btn"
              onClick={() => setShowConfirmCancel(true)}
              className="min-h-11 px-4 text-xs text-stone-600 hover:text-rose-700 active:scale-[0.97] transition-colors font-semibold py-2 cursor-pointer"
            >
              Cancel this request
            </button>
          </div>
        )}
      </div>

      {/* CONFIRM CANCELLATION MODAL */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-modal border border-stone-900/[0.08] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Cancel request?</h3>
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to cancel this request?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 min-h-11 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl select-none cursor-pointer"
              >
                Keep request
              </button>
              <button
                type="button"
                data-testid="confirm-cancel-btn"
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 min-h-11 py-2.5 bg-rose-700 text-white text-xs font-bold rounded-xl select-none shadow-xs cursor-pointer"
              >
                {cancelling ? 'Cancelling...' : 'Yes, cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <GuestBottomNav
        activeTab="my-requests"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};
