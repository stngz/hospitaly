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
import { LoginGate } from './components/auth/LoginGate';
import { InAppNotificationBanner } from './components/common/InAppNotificationBanner';
import { Loader2 } from 'lucide-react';

type RoutePortal = 'hq' | 'staff' | 'guest';

function resolvePortalFromPath(pathname: string): RoutePortal {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (clean === '/hq' || clean === '/admin') {
    return 'hq';
  }
  if (clean === '/staff' || clean.startsWith('/staff/')) {
    return 'staff';
  }
  return 'guest';
}

function AppContent() {
  const { setPropertySlug, setRoomId } = useTenant();
  const { user, loading } = useAuth();

  // Initialize live Firestore synchronization on app mount
  useEffect(() => {
    initFirestoreListeners();
  }, []);

  const [portal, setPortal] = useState<RoutePortal>(() =>
    typeof window !== 'undefined' ? resolvePortalFromPath(window.location.pathname) : 'guest'
  );

  // Keep portal synchronized with browser history navigation
  useEffect(() => {
    const handlePopState = () => {
      setPortal(resolvePortalFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateToPortal = (nextPortal: RoutePortal, nextPath?: string) => {
    const targetPath =
      nextPath || (nextPortal === 'hq' ? '/hq' : nextPortal === 'staff' ? '/staff' : '/');
    if (typeof window !== 'undefined' && window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setPortal(nextPortal);
  };

  // Guest view router: 'home' | 'request' | 'status' | 'my-requests' | 'dining'
  const [guestView, setGuestView] = useState<'home' | 'request' | 'status' | 'my-requests' | 'dining'>('home');
  const [activeRequestId, setActiveRequestId] = useState<string>('');
  const [requestPrefill, setRequestPrefill] = useState<{ category?: string; item?: string }>({});

  const handleGuestNavigate = (view: string, data?: any) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (view === 'request') {
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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    setActiveRequestId(newId);
    setGuestView('status');
  };

  const handleRoomResolved = (propertySlug: string, newRoomId: string) => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    setPropertySlug(propertySlug);
    setRoomId(newRoomId);
    setGuestView('home');
  };

  // 1. FOUNDER HQ PORTAL (/hq)
  if (portal === 'hq') {
    if (loading) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-stone-400">
            Verifying Founder HQ Session...
          </p>
        </div>
      );
    }

    if (!user || user.role !== 'founder') {
      return (
        <LoginGate
          portal="hq"
          onSuccess={() => {
            navigateToPortal('hq', '/hq');
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-stone-100 font-sans antialiased text-stone-900 relative">
        <SuperAdminDashboard
          onManageProperty={(selectedProp) => {
            setPropertySlug(selectedProp.slug);
            navigateToPortal('staff', '/staff');
          }}
          onSwitchToStaff={() => navigateToPortal('staff', '/staff')}
        />
      </div>
    );
  }

  // 2. STAFF & MANAGER PORTAL (/staff)
  if (portal === 'staff') {
    if (loading) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
          <p className="text-xs font-mono uppercase tracking-widest text-stone-400">
            Verifying Staff Portal Session...
          </p>
        </div>
      );
    }

    if (!user || (user.role !== 'staff' && user.role !== 'manager' && user.role !== 'founder')) {
      return (
        <LoginGate
          portal="staff"
          onSuccess={() => {
            navigateToPortal('staff', '/staff');
          }}
        />
      );
    }

    return (
      <div className="min-h-screen bg-stone-100 font-sans antialiased text-stone-900 relative">
        <InAppNotificationBanner />
        <StaffDashboard
          onSelectRoomForGuest={(propSlug, rId) => {
            handleRoomResolved(propSlug, rId);
            navigateToPortal('guest', '/');
          }}
          onSwitchToAdmin={user.role === 'founder' ? () => navigateToPortal('hq', '/hq') : undefined}
        />
      </div>
    );
  }

  // 3. PUBLIC GUEST EXPERIENCE (/)
  return (
    <div className="min-h-screen bg-stone-100 font-sans antialiased text-stone-900 relative">
      <InAppNotificationBanner
        onNavigateToRequest={(reqId) => {
          setActiveRequestId(reqId);
          setGuestView('status');
        }}
      />

      <div className="max-w-md mx-auto shadow-modal min-h-dvh bg-[#FDFBF7] relative border-x border-stone-900/[0.08]">
        {guestView === 'home' && <GuestHome onNavigate={handleGuestNavigate} />}

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
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <TenantProvider initialSlug="rocks-apartments">
        <AppContent />
      </TenantProvider>
    </AuthProvider>
  );
}
