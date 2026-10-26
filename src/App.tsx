/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { initFirestoreListeners } from './lib/store';
import { GuestHome } from './components/guest/GuestHome';
import { ServiceRequestFlow } from './components/guest/ServiceRequestFlow';
import { RequestStatusTimeline } from './components/guest/RequestStatusTimeline';
import { GuestRequestsList } from './components/guest/GuestRequestsList';
import { GuestDiningMenu } from './components/guest/GuestDiningMenu';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { QRModal } from './components/common/QRModal';
import { LoginGate } from './components/auth/LoginGate';
import { InAppNotificationBanner } from './components/common/InAppNotificationBanner';
import { 
  QrCode, 
  Crown, 
  Users, 
  Smartphone, 
  Terminal, 
  X, 
  LogOut, 
} from 'lucide-react';
import { UserProfile } from './types';

function AppContent() {
  const { property, setPropertySlug, setRoomId } = useTenant();
  const { user, signInAs, signOut } = useAuth();

  // Initialize live Firestore synchronization on app mount
  useEffect(() => {
    initFirestoreListeners();
  }, []);

  // 4-Tier Portal: 'admin' (Tier 1) | 'staff' (Tier 2 & 3) | 'guest' (Tier 4)
  const [activePortal, setActivePortal] = useState<'admin' | 'staff' | 'guest'>('guest');

  // Dedicated Login Gate state for secure login before unlocking dashboards
  const [pendingPortal, setPendingPortal] = useState<'admin' | 'staff' | null>(null);

  // Collapsible Floating Dev Mode Bar (Available exclusively during local dev)
  const [isDevBarOpen, setIsDevBarOpen] = useState(false);

  // Guest view router: 'home' | 'request' | 'status' | 'my-requests' | 'dining'
  const [guestView, setGuestView] = useState<'home' | 'request' | 'status' | 'my-requests' | 'dining'>('home');
  const [activeRequestId, setActiveRequestId] = useState<string>('req_rocks_01');
  const [requestPrefill, setRequestPrefill] = useState<{ category?: string; item?: string }>({});
  
  // QR modal state
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);

  // Support direct path routes like /hq, /admin, /staff
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path === '/hq' || path === '/admin') {
        if (user?.role === 'admin') {
          setActivePortal('admin');
        } else {
          setPendingPortal('admin');
        }
      } else if (path === '/staff') {
        if (user && (user.role === 'staff' || user.role === 'manager' || user.role === 'admin')) {
          setActivePortal('staff');
        } else {
          setPendingPortal('staff');
        }
      }
    }
  }, [user]);

  const handleGuestNavigate = (view: string, data?: any) => {
    if (view === 'staff-login') {
      handleRequestPortalSwitch('staff');
    } else if (view === 'admin-login') {
      handleRequestPortalSwitch('admin');
    } else if (view === 'request') {
      setRequestPrefill(data || {});
      setGuestView('request');
    } else if (view === 'status' && data?.requestId) {
      setActiveRequestId(data.requestId);
      setGuestView('status');
    } else if (view === 'my-requests') {
      setGuestView('my-requests');
    } else if (view === 'dining') {
      setGuestView('dining');
    } else {
      setGuestView('home');
    }
  };

  const handleRequestCreated = (newId: string) => {
    setActiveRequestId(newId);
    setGuestView('status');
  };

  const handleRoomResolved = (propertySlug: string, newRoomId: string) => {
    setPropertySlug(propertySlug);
    setRoomId(newRoomId);
    setGuestView('home');
  };

  const handleRequestPortalSwitch = (target: 'admin' | 'staff' | 'guest') => {
    if (target === 'guest') {
      setActivePortal('guest');
      setPendingPortal(null);
      setIsDevBarOpen(false);
      return;
    }

    if (target === 'admin') {
      if (user?.role === 'admin') {
        setActivePortal('admin');
        setPendingPortal(null);
      } else {
        setPendingPortal('admin');
      }
      setIsDevBarOpen(false);
      return;
    }

    if (target === 'staff') {
      if (user && (user.role === 'staff' || user.role === 'manager' || user.role === 'admin')) {
        setActivePortal('staff');
        setPendingPortal(null);
      } else {
        setPendingPortal('staff');
      }
      setIsDevBarOpen(false);
      return;
    }
  };

  const handleLoginSuccess = (authenticatedUser: UserProfile) => {
    signInAs(authenticatedUser);
    if (authenticatedUser.role === 'admin') {
      setActivePortal('admin');
    } else {
      setActivePortal('staff');
    }
    setPendingPortal(null);
  };

  const handleLoginCancel = () => {
    setPendingPortal(null);
    setActivePortal('guest');
  };

  return (
    <div className="min-h-screen bg-stone-100 font-sans antialiased text-stone-900 relative">
      {/* Floating Dynamic Notification Banner (Apple Dynamic Island style) */}
      <InAppNotificationBanner 
        onNavigateToRequest={(reqId) => {
          setActivePortal('guest');
          setActiveRequestId(reqId);
          setGuestView('status');
        }}
      />

      {/* 1. DEDICATED LOGIN GATE (Tier 1 Email for Admin, Tier 2/3 Email & PIN for Staff/GM) */}
      {pendingPortal && (
        <LoginGate
          targetRole={pendingPortal}
          onSuccess={handleLoginSuccess}
          onCancel={handleLoginCancel}
        />
      )}

      {/* 2. MAIN ACTIVE VIEW (When no Login Gate is active) */}
      {!pendingPortal && (
        <>
          {activePortal === 'admin' && (
            <SuperAdminDashboard
              onManageProperty={(selectedProp, manager) => {
                setPropertySlug(selectedProp.slug);
                if (manager) {
                  signInAs(manager);
                }
                setActivePortal('staff');
              }}
              onSwitchToGuest={(slug) => {
                setPropertySlug(slug);
                setActivePortal('guest');
              }}
              onSwitchToStaff={() => setActivePortal('staff')}
            />
          )}

          {activePortal === 'staff' && (
            <StaffDashboard 
              onSwitchToGuest={() => setActivePortal('guest')} 
              onSelectRoomForGuest={(propSlug, rId) => {
                handleRoomResolved(propSlug, rId);
                setActivePortal('guest');
              }}
              onSwitchToAdmin={() => handleRequestPortalSwitch('admin')}
            />
          )}

          {activePortal === 'guest' && (
            <div className="max-w-md mx-auto shadow-modal min-h-dvh bg-[#FDFBF7] relative border-x border-stone-900/[0.08]">
              {guestView === 'home' && (
                <GuestHome 
                  onNavigate={handleGuestNavigate} 
                  onOpenQRScanner={() => setIsQRModalOpen(true)}
                />
              )}

              {guestView === 'request' && (
                <ServiceRequestFlow
                  initialCategory={requestPrefill.category}
                  initialItem={requestPrefill.item}
                  onBack={() => setGuestView('home')}
                  onSubmitted={handleRequestCreated}
                  onNavigateTab={handleGuestNavigate}
                />
              )}

              {guestView === 'status' && (
                <RequestStatusTimeline
                  requestId={activeRequestId}
                  onBack={() => setGuestView('home')}
                  onNavigateTab={handleGuestNavigate}
                />
              )}

              {guestView === 'my-requests' && (
                <GuestRequestsList
                  onBack={() => setGuestView('home')}
                  onSelectRequest={(id) => {
                    setActiveRequestId(id);
                    setGuestView('status');
                  }}
                  onNewRequest={() => {
                    setRequestPrefill({});
                    setGuestView('request');
                  }}
                  onNavigateTab={handleGuestNavigate}
                />
              )}

              {guestView === 'dining' && (
                <GuestDiningMenu
                  onBack={() => setGuestView('home')}
                  onRequestSubmitted={handleRequestCreated}
                  onNavigateTab={handleGuestNavigate}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* 3. DEV MODE SWITCHER: Stripped completely in production builds */}
      {import.meta.env.DEV && (
        <aside aria-label="Developer utilities" className="fixed bottom-3 left-3 z-50">
          {!isDevBarOpen ? (
            <button
              onClick={() => setIsDevBarOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/90 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-900 text-stone-300 [@media(hover:hover)_and_(pointer:fine)]:hover:text-white border border-white/[0.12] shadow-elevated backdrop-blur-md transition-[background-color,border-color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] text-xs font-mono active:scale-[0.96] group cursor-pointer"
              title="Open 4-Tier Role Architecture Switcher"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-12 transition-transform duration-200" />
              <span className="font-semibold">Dev Mode</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          ) : (
            <div className="bg-stone-950 text-stone-200 rounded-2xl p-4 shadow-modal border border-white/[0.12] w-80 backdrop-blur-xl sheet-slide-up-animate space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    Dev Portal Switcher
                  </span>
                </div>
                <button
                  onClick={() => setIsDevBarOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-850 active:scale-[0.92] transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Current user badge */}
              <div className="bg-stone-900/80 p-2.5 rounded-xl border border-white/[0.08] flex items-center justify-between text-[11px]">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold">Active User:</span>
                  <span className="font-semibold text-white">
                    {user ? `${user.name} (${user.role})` : 'Guest Session (Unauthenticated)'}
                  </span>
                </div>
                {user && (
                  <button
                    onClick={() => {
                      signOut();
                      setActivePortal('guest');
                    }}
                    title="Sign Out"
                    className="p-1 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded active:scale-[0.92] transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Portal Switch Buttons */}
              <div className="space-y-1.5">
                <button
                  onClick={() => handleRequestPortalSwitch('admin')}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer ${
                    activePortal === 'admin'
                      ? 'bg-amber-400 text-stone-950 font-bold shadow-xs'
                      : 'bg-stone-900 hover:bg-stone-850 text-stone-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5" />
                    <span>Founder Admin (Tier 1)</span>
                  </span>
                  <span className="text-[10px] font-mono text-amber-300">Firebase Auth</span>
                </button>

                <button
                  onClick={() => handleRequestPortalSwitch('staff')}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer ${
                    activePortal === 'staff'
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'bg-stone-900 hover:bg-stone-850 text-stone-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff / Manager (Tier 2 & 3)</span>
                  </span>
                  <span className="text-[10px] font-mono text-stone-400">PIN / Email</span>
                </button>

                <button
                  onClick={() => handleRequestPortalSwitch('guest')}
                  className={`w-full p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer ${
                    activePortal === 'guest'
                      ? 'bg-emerald-800 text-white font-bold shadow-xs'
                      : 'bg-stone-900 hover:bg-stone-850 text-stone-300'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Guest Mobile View (Tier 4)</span>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">Public</span>
                </button>
              </div>

              {/* QR Simulation Trigger */}
              <div className="pt-2 border-t border-white/[0.08]">
                <button
                  onClick={() => {
                    setIsQRModalOpen(true);
                    setIsDevBarOpen(false);
                  }}
                  className="w-full p-2 rounded-xl bg-stone-900 hover:bg-stone-850 text-amber-300 border border-white/[0.08] text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Simulate In-Room QR Scan</span>
                </button>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* QR Simulation Modal */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onSelectRoom={handleRoomResolved}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider initialSlug="rocks-apartments" initialRoomId="room_rocks_101">
        <AppContent />
      </TenantProvider>
    </AuthProvider>
  );
}
