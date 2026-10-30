/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TenantProvider, useTenant } from './context/TenantContext';
import { GuestHome } from './components/guest/GuestHome';
import { ServiceRequestFlow } from './components/guest/ServiceRequestFlow';
import { RequestStatusTimeline } from './components/guest/RequestStatusTimeline';
import { GuestRequestsList } from './components/guest/GuestRequestsList';
import { GuestDiningMenu } from './components/guest/GuestDiningMenu';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { LoginGate } from './components/auth/LoginGate';
import { InAppNotificationBanner } from './components/common/InAppNotificationBanner';
import { GuestLoadingScreen } from './components/guest/GuestLoadingScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SalesPage } from './components/sales/SalesPage';
import { ScanPage } from './components/sales/ScanPage';
import { DemoGuestPage } from './components/sales/DemoGuestPage';
import { Loader2 } from 'lucide-react';

export type RoutePortal = 'hq' | 'staff' | 'guest' | 'landing' | 'scan' | 'demo';

export function resolvePortalFromPath(pathname: string): RoutePortal {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  if (clean === '/hq' || clean === '/admin' || clean.startsWith('/hq/')) {
    return 'hq';
  }
  if (clean === '/staff' || clean.startsWith('/staff/')) {
    return 'staff';
  }
  if (clean === '/scan') {
    return 'scan';
  }
  if (clean === '/demo') {
    return 'demo';
  }
  if (clean.startsWith('/r/') || clean.startsWith('/guest')) {
    return 'guest';
  }
  return 'landing';
}

function AppContent() {
  const { setPropertySlug, setRoomId, stayState, property } = useTenant();
  const { user, loading } = useAuth();

  const [portal, setPortal] = useState<RoutePortal>(() =>
    typeof window !== 'undefined' ? resolvePortalFromPath(window.location.pathname) : 'landing'
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
      nextPath ||
      (nextPortal === 'hq'
        ? '/hq'
        : nextPortal === 'staff'
        ? '/staff'
        : nextPortal === 'scan'
        ? '/scan'
        : nextPortal === 'demo'
        ? '/demo'
        : nextPortal === 'guest'
        ? '/r/'
        : '/');
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
        <ErrorBoundary sectionName="HQ portal">
          <SuperAdminDashboard
            onManageProperty={(selectedProp) => {
              setPropertySlug(selectedProp.slug);
              navigateToPortal('staff', '/staff');
            }}
            onSwitchToStaff={() => navigateToPortal('staff', '/staff')}
          />
        </ErrorBoundary>
      </div>
    );
  }

  // 2. STAFF & MANAGER PORTAL (/staff)
  if (portal === 'staff') {
    if (loading) {
      return (
        <div data-testid="staff-loading-shell" className="min-h-screen bg-stone-100 font-sans antialiased text-stone-900">
          <header className="bg-white border-b border-stone-900/[0.08] h-14 px-4 sm:px-6 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1C3A31] text-amber-300 flex items-center justify-center font-serif font-bold text-sm">
                RA
              </div>
              <div className="h-4 w-32 bg-stone-200 rounded animate-pulse" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-stone-100 animate-pulse" />
          </header>
          <main className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4">
            <div className="flex items-center gap-2 border-b border-stone-200 pb-2.5">
              <div className="h-9 w-24 bg-stone-200 rounded-xl animate-pulse" />
              <div className="h-9 w-24 bg-stone-200 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-stone-200 rounded" />
                    <div className="h-4 w-16 bg-stone-200 rounded" />
                  </div>
                  <div className="h-3 w-48 bg-stone-100 rounded" />
                  <div className="h-10 bg-stone-100 rounded-xl" />
                </div>
              ))}
            </div>
          </main>
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
        <ErrorBoundary sectionName="staff desk">
          <StaffDashboard
            onSelectRoomForGuest={(propSlug, rId) => {
              handleRoomResolved(propSlug, rId);
              navigateToPortal('guest', '/');
            }}
            onSwitchToAdmin={user.role === 'founder' ? () => navigateToPortal('hq', '/hq') : undefined}
          />
        </ErrorBoundary>
      </div>
    );
  }

  // 3. SALES LANDING PAGE (/)
  if (portal === 'landing') {
    return (
      <ErrorBoundary sectionName="landing page">
        <SalesPage
          onNavigateToDemo={() => navigateToPortal('demo', '/demo')}
          onNavigateToScan={() => navigateToPortal('scan', '/scan')}
          onNavigateToStaff={() => navigateToPortal('staff', '/staff')}
        />
      </ErrorBoundary>
    );
  }

  // 4. IN-PAGE QR SCANNER (/scan)
  if (portal === 'scan') {
    return (
      <ErrorBoundary sectionName="QR scanner">
        <ScanPage
          onClose={() => navigateToPortal('landing', '/')}
          onNavigateToToken={(token) => {
            navigateToPortal('guest', `/r/${token}`);
          }}
        />
      </ErrorBoundary>
    );
  }

  // 5. INTERACTIVE GUEST DEMO (/demo)
  if (portal === 'demo') {
    return (
      <ErrorBoundary sectionName="guest demo">
        <DemoGuestPage
          onGetQuote={() => {
            navigateToPortal('landing', '/#quote');
            setTimeout(() => {
              if (typeof document !== 'undefined') {
                document.getElementById('quote')?.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          }}
          onBackToHome={() => navigateToPortal('landing', '/')}
        />
      </ErrorBoundary>
    );
  }

  // 6. PUBLIC GUEST EXPERIENCE (/r/*)
  if (stayState.status === 'loading') {
    return (
      <GuestLoadingScreen
        propertyName={property?.name || 'Rock Apartments'}
        houseName={stayState.houseName}
        receptionPhone={property?.contactPhone}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 font-sans antialiased text-stone-900 relative">
      {guestView !== 'status' && (
        <InAppNotificationBanner
          onNavigateToRequest={(reqId) => {
            if (reqId) setActiveRequestId(reqId);
            setGuestView('status');
          }}
        />
      )}

      <div className="max-w-md mx-auto shadow-modal min-h-dvh bg-[#FDFBF7] relative border-x border-stone-900/[0.08]">
        {guestView === 'home' && (
          <ErrorBoundary sectionName="guest home">
            <GuestHome onNavigate={handleGuestNavigate} />
          </ErrorBoundary>
        )}

        {guestView === 'request' && (
          <ErrorBoundary sectionName="service request">
            <ServiceRequestFlow
              initialCategory={requestPrefill.category}
              initialItem={requestPrefill.item}
              onBack={() => setGuestView('home')}
              onSubmitted={handleRequestCreated}
              onNavigateTab={handleGuestNavigate}
            />
          </ErrorBoundary>
        )}

        {guestView === 'status' && (
          <ErrorBoundary sectionName="request status">
            <RequestStatusTimeline
              requestId={activeRequestId}
              onBack={() => setGuestView('home')}
              onNavigateTab={handleGuestNavigate}
            />
          </ErrorBoundary>
        )}

        {guestView === 'my-requests' && (
          <ErrorBoundary sectionName="my requests">
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
          </ErrorBoundary>
        )}

        {guestView === 'dining' && (
          <ErrorBoundary sectionName="dining">
            <GuestDiningMenu
              onBack={() => setGuestView('home')}
              onRequestSubmitted={handleRequestCreated}
              onNavigateTab={handleGuestNavigate}
            />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary sectionName="application">
      <AuthProvider>
        <TenantProvider initialSlug="rocks-apartments">
          <AppContent />
        </TenantProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
