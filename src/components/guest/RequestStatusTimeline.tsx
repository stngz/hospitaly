import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { useTenant } from '../../context/TenantContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { 
  CheckCircle2, 
  Clock, 
  ArrowLeft, 
  AlertCircle, 
  Phone, 
  User, 
  XCircle, 
  AlertTriangle, 
  X,
  Sparkles,
  UtensilsCrossed,
  Compass,
  Wrench,
  Navigation,
  MessageSquare,
  Volume2,
  VolumeX,
  Check,
  Send,
  Zap,
  DoorClosed,
  BellRing,
  Moon
} from 'lucide-react';
import { ServiceRequest } from '../../types';
import { GuestBottomNav } from './GuestBottomNav';

interface RequestStatusTimelineProps {
  requestId: string;
  onBack: () => void;
  onNavigateTab?: (view: string, data?: any) => void;
}

const STEPS = [
  { 
    key: 'pending', 
    label: 'Request Received', 
    desc: 'Connecting with reception & duty dispatch',
    etaText: '~15-20 min'
  },
  { 
    key: 'acknowledged', 
    label: 'Confirmed & Assigned', 
    desc: 'Staff member reviewed and accepted ticket',
    etaText: '~10-12 min'
  },
  { 
    key: 'in_progress', 
    label: 'On the Way to Room', 
    desc: 'Staff is heading up to your door now',
    etaText: '~3-5 min'
  },
  { 
    key: 'completed', 
    label: 'Delivered to Door', 
    desc: 'Service completed at your room',
    etaText: 'Delivered'
  },
];

export const RequestStatusTimeline: React.FC<RequestStatusTimelineProps> = ({ 
  requestId, 
  onBack,
  onNavigateTab
}) => {
  const { property } = useTenant();
  const [cancelling, setCancelling] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [dropOffNote, setDropOffNote] = useState<'knock' | 'bell' | 'silent'>('knock');
  const [customNote, setCustomNote] = useState('');
  const [isNoteSaved, setIsNoteSaved] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(notificationService.isSoundEnabled());
  const [etaMinutes, setEtaMinutes] = useState(8);

  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  const req = allRequests.find((r) => r.id === requestId);

  // Dynamic countdown simulation when in progress
  useEffect(() => {
    if (!req || req.status !== 'in_progress') return;
    const interval = setInterval(() => {
      setEtaMinutes((prev) => (prev > 1 ? prev - 1 : 1));
    }, 45000);
    return () => clearInterval(interval);
  }, [req?.status]);

  const getStepIndex = (status: string) => {
    switch (status) {
      case 'pending': return 0;
      case 'acknowledged': return 1;
      case 'in_progress': return 2;
      case 'completed': return 3;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const handleCancel = () => {
    if (!req) return;
    setCancelling(true);
    dbService.updateRequestStatus(req.id, 'cancelled');
    setCancelling(false);
    setShowConfirmCancel(false);
  };

  const [followUpSent, setFollowUpSent] = useState(false);

  // Guest follow-up notification (pings reception without advancing the stage)
  const handleSendFollowUp = () => {
    if (!req) return;
    notificationService.triggerHaptic('medium');
    notificationService.notify({
      title: `Order Follow-Up: Room ${req.roomNumber}`,
      subtitle: `Guest in ${req.roomNumber} requested an update on order "${req.title}".`,
      roomNumber: req.roomNumber,
      category: req.category,
    });
    setFollowUpSent(true);
    setTimeout(() => setFollowUpSent(false), 4000);
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    notificationService.setSoundEnabled(next);
    setSoundEnabled(next);
    if (next) notificationService.playStatusUpdateChime();
  };

  if (!req) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] text-stone-900 p-6 flex flex-col items-center justify-center">
        <AlertCircle className="w-10 h-10 text-stone-400 mb-3" />
        <p className="text-stone-800 text-sm font-semibold mb-1">Request record not found or has expired.</p>
        <p className="text-stone-500 text-xs mb-4 text-center">This order may have been archived or belongs to another session.</p>
        <button
          onClick={onBack}
          className="px-5 py-2.5 bg-stone-900 text-white text-xs font-semibold rounded-2xl active:scale-[0.97] transition-all"
        >
          Return to Room
        </button>
      </div>
    );
  }

  const currentStep = getStepIndex(req.status);
  const isCancelled = req.status === 'cancelled';
  const isCompleted = req.status === 'completed';
  const isInProgress = req.status === 'in_progress';
  const canGuestCancel = req.status === 'acknowledged' || req.status === 'pending';

  return (
    <div className="min-h-dvh bg-[#FDFBF7] text-stone-900 pb-32 selection:bg-amber-100">
      {/* 1. TOP NATIVE HEADER */}
      <header className="sticky top-0 z-30 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-stone-900/[0.06] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 rounded-full hover:bg-stone-200/60 active:scale-[0.94] transition-[background-color,transform] text-stone-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
                Live Room Dispatch
              </h1>
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              Room {req.roomNumber} &bull; REF #{req.id.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Chime sound is on' : 'Chime sound is muted'}
            className="p-1.5 rounded-full bg-stone-100 text-stone-600 hover:text-stone-900 active:scale-[0.92] transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-800" /> : <VolumeX className="w-4 h-4 text-rose-500" />}
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-4">
        
        {/* 2. UBER-STYLE LIVE RADAR & HERO STATUS CARD */}
        <div className="bg-stone-950 text-white rounded-3xl p-5 shadow-modal border border-white/[0.08] relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-16 -right-16 w-44 h-44 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/25">
                {isCompleted ? 'Delivered' : isInProgress ? 'En Route' : req.status.replace('_', ' ')}
              </span>

              {!isCancelled && !isCompleted && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-stone-300">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>ETA: <strong className="text-white font-bold">{isInProgress ? `~${etaMinutes} mins` : STEPS[Math.max(0, currentStep)]?.etaText}</strong></span>
                </div>
              )}
            </div>

            <h2 className="text-xl font-serif font-medium text-white tracking-tight leading-snug">
              {isCompleted ? (
                'Your order has arrived.'
              ) : isInProgress ? (
                `Staff is on the way to Room ${req.roomNumber}`
              ) : req.status === 'acknowledged' ? (
                'Order acknowledged by reception'
              ) : isCancelled ? (
                'This request was cancelled'
              ) : (
                'Connecting to hotel dispatch...'
              )}
            </h2>

            <p className="text-xs text-stone-400 mt-1 leading-relaxed">
              {isCompleted
                ? 'Service has been completed and handed over at your door. Enjoy your stay!'
                : isInProgress
                ? 'Your assigned attendant is bringing your items directly to your bedside.'
                : req.status === 'acknowledged'
                ? 'Staff is preparing your request in the hotel service depot.'
                : isCancelled
                ? 'No staff will be dispatched for this order.'
                : 'Routing your order directly to the on-duty hospitality team.'}
            </p>

            {/* Uber Progress Bar */}
            {!isCancelled && (
              <div className="mt-5 space-y-2">
                <div className="w-full h-1.5 bg-stone-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, ((currentStep + 1) / STEPS.length) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-stone-500">
                  <span>Logged</span>
                  <span>Confirmed</span>
                  <span>En Route</span>
                  <span>Delivered</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3. ASSIGNED DUTY TEAM CARD */}
        {!isCancelled && (
          <div className="bg-white rounded-3xl p-4.5 border border-stone-900/[0.08] shadow-diffused flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              {req.assignedTo ? (
                <>
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-stone-900 text-amber-300 flex items-center justify-center font-bold text-sm shadow-sm border border-stone-800">
                      <Sparkles className="w-5 h-5 text-amber-300" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-800 block">
                      Duty Team Assigned
                    </span>
                    <p className="text-sm font-bold text-stone-900">
                      {req.category === 'housekeeping'
                        ? 'Housekeeping Team'
                        : req.category === 'maintenance'
                        ? 'Maintenance Duty Team'
                        : req.category === 'transport'
                        ? 'Airport & Transport Team'
                        : 'Property Duty Team'}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-stone-500">
                      <span>Attendant dispatched to your house</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold text-sm shadow-2xs border border-amber-200">
                    <Clock className="w-5 h-5 text-amber-700 animate-pulse" />
                  </div>

                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 block">
                      Staff Assignment
                    </span>
                    <p className="text-xs font-bold text-stone-900">
                      Awaiting Reception Assignment
                    </p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Reception is assigning an attendant shortly
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMessageModalOpen(true)}
                className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200/80 active:scale-[0.93] transition-all text-stone-700"
                title="Send note to reception"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <a
                href="tel:0"
                className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 active:scale-[0.93] transition-all text-emerald-950 border border-emerald-900/[0.1]"
                title="Call Front Desk Ext 0"
              >
                <Phone className="w-4 h-4 text-emerald-800" />
              </a>
            </div>
          </div>
        )}

        {/* 4. DROP-OFF & DOOR PREFERENCE (Uber Delivery Option) */}
        {!isCancelled && !isCompleted && (
          <div className="bg-white rounded-3xl p-4.5 border border-stone-900/[0.08] shadow-diffused space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
              Arrival & Drop-off Preference
            </span>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDropOffNote('knock')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all select-none active:scale-[0.96] ${
                  dropOffNote === 'knock'
                    ? 'bg-amber-50/80 border-amber-400/80 text-amber-950 font-bold shadow-2xs'
                    : 'bg-stone-50 border-stone-200/80 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <DoorClosed className="w-4 h-4 mb-1 text-amber-800" />
                <span className="text-[11px] leading-tight">Knock Softly</span>
              </button>

              <button
                type="button"
                onClick={() => setDropOffNote('bell')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all select-none active:scale-[0.96] ${
                  dropOffNote === 'bell'
                    ? 'bg-amber-50/80 border-amber-400/80 text-amber-950 font-bold shadow-2xs'
                    : 'bg-stone-50 border-stone-200/80 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <BellRing className="w-4 h-4 mb-1 text-amber-800" />
                <span className="text-[11px] leading-tight">Ring Chime</span>
              </button>

              <button
                type="button"
                onClick={() => setDropOffNote('silent')}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all select-none active:scale-[0.96] ${
                  dropOffNote === 'silent'
                    ? 'bg-amber-50/80 border-amber-400/80 text-amber-950 font-bold shadow-2xs'
                    : 'bg-stone-50 border-stone-200/80 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Moon className="w-4 h-4 mb-1 text-amber-800" />
                <span className="text-[11px] leading-tight">Leave at Door</span>
              </button>
            </div>
          </div>
        )}

        {/* 5. LIVE STEPPER TIMELINE */}
        {!isCancelled && (
          <div className="bg-white rounded-3xl p-5 border border-stone-900/[0.08] shadow-diffused space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block">
              Dispatch Stages
            </span>

            <div className="space-y-4 relative pl-1.5">
              <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-stone-100" />

              {STEPS.map((step, index) => {
                const isPassed = index <= currentStep;
                const isCurrent = index === currentStep;

                return (
                  <div key={step.key} className="flex items-start gap-3.5 relative z-10">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-200 mt-0.5 ${
                      isPassed
                        ? 'bg-stone-900 border-stone-900 text-amber-300 shadow-2xs'
                        : 'bg-white border-stone-300 text-transparent'
                    }`}>
                      {isPassed && <CheckCircle2 className="w-3.5 h-3.5 fill-stone-900 text-amber-300" />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${
                          isCurrent ? 'text-stone-950 font-extrabold' : isPassed ? 'text-stone-800' : 'text-stone-400'
                        }`}>
                          {step.label}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] font-mono uppercase px-2 py-0.5 bg-amber-100 text-amber-950 rounded-full font-bold animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. ORDER SUMMARY CARD */}
        <div className="bg-white rounded-3xl p-5 border border-stone-900/[0.08] shadow-diffused space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <span className="text-xs font-bold text-stone-900">{req.title}</span>
            <span className="text-[10px] font-mono text-stone-500">
              {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {req.description && (
            <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-2xl border border-stone-900/[0.04] leading-relaxed whitespace-pre-line">
              {req.description}
            </div>
          )}

          {isNoteSaved && customNote && (
            <div className="text-xs text-emerald-950 bg-emerald-50 p-2.5 rounded-xl border border-emerald-900/[0.1] flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
              <span>Attendant note attached: "{customNote}"</span>
            </div>
          )}
        </div>

        {/* 7. GUEST FOLLOW-UP / PING RECEPTION ACTION */}
        {!isCancelled && !isCompleted && (
          <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <BellRing className="w-4 h-4 text-amber-800 shrink-0" />
              <div>
                <span className="text-xs font-bold text-stone-900 block leading-tight">
                  Need a Status Update?
                </span>
                <span className="text-[10px] text-stone-600">
                  Notify reception if your order is taking longer than expected.
                </span>
              </div>
            </div>

            <button
              onClick={handleSendFollowUp}
              disabled={followUpSent}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-2xs transition-all flex items-center gap-1.5 select-none cursor-pointer ${
                followUpSent
                  ? 'bg-emerald-600 text-white'
                  : 'bg-stone-900 hover:bg-stone-850 active:scale-[0.95] text-amber-300'
              }`}
            >
              {followUpSent ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>Notified</span>
                </>
              ) : (
                <>
                  <BellRing className="w-3 h-3" />
                  <span>Notify Desk</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Cancellation Option */}
        {!isCancelled && !isCompleted && canGuestCancel && (
          <div className="pt-1 text-center">
            <button
              onClick={() => setShowConfirmCancel(true)}
              className="text-xs text-stone-400 hover:text-rose-600 active:scale-[0.97] transition-colors font-medium py-1"
            >
              Cancel this service request
            </button>
          </div>
        )}

      </div>

      {/* MODAL: DIRECT ATTENDANT NOTE */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4 z-50 animate-[modalBackdropIn_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-modal border border-stone-900/[0.08] space-y-4 animate-[modalContentIn_240ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Message Attendant</h3>
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 active:scale-[0.92]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Have a special delivery instruction? Your note will be displayed directly to the dispatch attendant.
            </p>

            <textarea
              rows={3}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="e.g. Please leave outside door, baby is sleeping..."
              className="w-full p-3 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900"
            />

            <div className="flex gap-2">
              <button
                onClick={() => setIsMessageModalOpen(false)}
                className="flex-1 py-2.5 bg-stone-100 text-stone-700 text-xs font-semibold rounded-xl"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setIsNoteSaved(true);
                  setIsMessageModalOpen(false);
                  notificationService.triggerHaptic('success');
                }}
                className="flex-1 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-xl active:scale-[0.97]"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM CANCELLATION MODAL */}
      {showConfirmCancel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-[modalBackdropIn_200ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-modal border border-stone-900/[0.08] space-y-4 animate-[modalContentIn_240ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Cancel Service Request?</h3>
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="p-1 rounded-full text-stone-400 hover:text-stone-700 active:scale-[0.92]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to cancel this request? Our hotel staff will be notified immediately to halt dispatch.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl select-none"
              >
                Keep Request
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex-1 py-2.5 bg-rose-700 text-white text-xs font-bold rounded-xl select-none shadow-xs"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slim Bottom Navigation */}
      <GuestBottomNav
        activeTab="my-requests"
        onNavigate={(tab, data) => (onNavigateTab ? onNavigateTab(tab, data) : onBack())}
      />
    </div>
  );
};
