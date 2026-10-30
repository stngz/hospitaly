import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Property, Room } from '../types';
import { dbService, subscribeToStore, subscribeGuestStayRequests, subscribeGuestRoom, ensureGuestAccess } from '../lib/store';

export type GuestStayStatus = 'loading' | 'active' | 'unoccupied' | 'invalid_token' | 'checked_out' | 'rescan_required' | 'no_session';

export interface GuestStayState {
  status: GuestStayStatus;
  houseName?: string;
  stayId?: string;
  errorMessage?: string;
}

interface TenantContextType {
  property: Property | null;
  room: Room | null;
  stayState: GuestStayState;
  isInvalidToken: boolean;
  loading: boolean;
  error: string | null;
  setPropertySlug: (slug: string) => void;
  setRoomId: (id: string | undefined) => void;
  clearGuestSession: () => void;
}

const TenantContext = createContext<TenantContextType>({
  property: null,
  room: null,
  stayState: { status: 'no_session' },
  isInvalidToken: false,
  loading: false,
  error: null,
  setPropertySlug: () => {},
  setRoomId: () => {},
  clearGuestSession: () => {},
});

const GUEST_SESSION_STORAGE_KEY = 'hospitally_guest_stay_session_v1';

interface StoredGuestSession {
  roomId: string;
  stayId: string;
  propertyId: string;
  roomNumber: string;
  token?: string;
  lastActiveAt?: number;
}

export const TenantProvider: React.FC<{
  initialSlug?: string;
  initialRoomId?: string;
  children: React.ReactNode;
}> = ({ initialSlug = 'rocks-apartments', children }) => {
  const properties = useSyncExternalStore(
    subscribeToStore,
    dbService.getProperties,
    dbService.getProperties
  );

  const rooms = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRooms,
    dbService.getAllRooms
  );

  const qrCodes = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllQRCodes,
    dbService.getAllQRCodes
  );

  const stays = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllStays,
    dbService.getAllStays
  );

  const [propertySlug, setPropertySlug] = useState<string>(initialSlug || 'rocks-apartments');
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const mountTimeRef = React.useRef(Date.now());
  const inFlightFetchRef = React.useRef<Set<string>>(new Set());

  const getUrlToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token') || params.get('qr');
    if (queryToken) return queryToken.trim().toUpperCase();

    const pathMatch = window.location.pathname.match(/\/r\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1].trim().toUpperCase();

    return null;
  };

  const [stayState, setStayState] = useState<GuestStayState>(() => {
    if (typeof window !== 'undefined') {
      const pathMatch = window.location.pathname.match(/\/r\/([a-zA-Z0-9_-]+)/);
      const params = new URLSearchParams(window.location.search);
      const hasToken = pathMatch || params.get('token') || params.get('qr');
      if (hasToken) {
        const tokenStr = pathMatch ? pathMatch[1] : (params.get('token') || params.get('qr') || '');
        const parts = tokenStr.split('-');
        const tentativeHouse =
          parts.length >= 2
            ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase()
            : undefined;
        return { status: 'loading', houseName: tentativeHouse };
      }
      const isGuestRoute = window.location.pathname.startsWith('/r/') || window.location.pathname.startsWith('/guest');
      if (isGuestRoute) {
        try {
          if (localStorage.getItem(GUEST_SESSION_STORAGE_KEY)) {
            return { status: 'loading' };
          }
        } catch {}
      }
    }
    return { status: 'no_session' };
  });

  const getUrlStayId = (): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('stay');
  };

  const updateStayState = (next: GuestStayState) => {
    const elapsed = Date.now() - mountTimeRef.current;
    const remaining = Math.max(0, 600 - elapsed);
    if (remaining > 0 && stayState.status === 'loading') {
      setTimeout(() => {
        setStayState((prev) => {
          if (
            prev.status === next.status &&
            prev.stayId === next.stayId &&
            prev.houseName === next.houseName &&
            prev.errorMessage === next.errorMessage
          ) {
            return prev;
          }
          return next;
        });
      }, remaining);
    } else {
      setStayState((prev) => {
        if (
          prev.status === next.status &&
          prev.stayId === next.stayId &&
          prev.houseName === next.houseName &&
          prev.errorMessage === next.errorMessage
        ) {
          return prev;
        }
        return next;
      });
    }
  };

  const updateRoomId = (nextId?: string) => {
    setRoomId((prev) => (prev === nextId ? prev : nextId));
  };

  const updatePropertySlug = (nextSlug?: string) => {
    if (!nextSlug) return;
    setPropertySlug((prev) => (prev === nextSlug ? prev : nextSlug));
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlToken = getUrlToken();
    const urlStayId = getUrlStayId();

    let savedSession: StoredGuestSession | null = null;
    try {
      const raw = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
      if (raw) savedSession = JSON.parse(raw);
    } catch {
      // ignore storage errors
    }

    // CASE 1: Guest opened a specific QR token URL (?token=..., ?qr=..., or /r/...)
    if (urlToken) {
      let matchingQR = dbService.getAnyQRByToken(urlToken);

      const processResolvedQR = (qr: typeof matchingQR) => {
        if (!qr || qr.status !== 'active' || !qr.roomId) {
          updateStayState({
            status: 'invalid_token',
            errorMessage: 'This QR code is no longer active. Please contact reception.',
          });
          updateRoomId(undefined);
          subscribeGuestStayRequests(null);
          return;
        }

        const liveRoom = rooms.find((r) => r.id === qr.roomId);

        // HOTFIX (guest access): guests can't read houses until they have a guest session.
        // If the house isn't loaded yet, get access once, keep the loading screen up, and
        // let this effect run again when the house document arrives.
        if (!liveRoom && !(window as any).__HOSPITALLY_INITIAL_DATA__) {
          const accessKey = `guest_${qr.roomId}`;
          if (!inFlightFetchRef.current.has(accessKey)) {
            inFlightFetchRef.current.add(accessKey);
            ensureGuestAccess(urlToken, qr.roomId, qr.propertyId).catch((err) => {
              console.warn('Guest access failed:', err);
              inFlightFetchRef.current.delete(accessKey);
              updateStayState({
                status: 'invalid_token',
                errorMessage:
                  "We couldn't open your house right now. Check your internet connection and scan the card again.",
              });
            });
            // Safety net: never leave the guest on an endless loading screen
            window.setTimeout(() => {
              setStayState((prev) =>
                prev.status === 'loading'
                  ? {
                      status: 'invalid_token',
                      errorMessage:
                        "We couldn't open your house right now. Check your internet connection and scan the card again.",
                    }
                  : prev
              );
            }, 12000);
          }
          return;
        }

        const matchingRoom: Room =
          liveRoom || {
            id: qr.roomId,
            propertyId: qr.propertyId,
            name: qr.houseName || 'your house',
            roomNumber: qr.houseName || 'your house',
            houseType: qr.houseType || 'Apartment',
            roomType: qr.houseType || 'Apartment',
            status: qr.activeStayId ? 'occupied' : 'available',
            activeStayId: qr.activeStayId || undefined,
            currentGuestName: qr.guestGreeting || '',
            wifiName: qr.wifiName,
            wifiPassword: qr.wifiPassword,
            guestCheckOutDate: qr.guestCheckOutDate || undefined,
            imageId: qr.imageId,
            amenities: [],
            archived: false,
          };

        const targetProp = properties.find((p) => p.id === qr.propertyId);
        if (targetProp) {
          updatePropertySlug(targetProp.slug);
        } else if (!inFlightFetchRef.current.has(`prop_${qr.propertyId}`)) {
          inFlightFetchRef.current.add(`prop_${qr.propertyId}`);
          void dbService.getOrFetchPropertyById(qr.propertyId).then((p) => {
            if (p) updatePropertySlug(p.slug);
          });
        }

        // Check if this browser was already bound to an earlier stay in this exact house
        // that has now checked out (or been replaced by a new stay)
        const previousStayIdForRoom =
          urlStayId ||
          (savedSession && savedSession.roomId === matchingRoom.id ? savedSession.stayId : null);

        if (
          previousStayIdForRoom &&
          matchingRoom.activeStayId !== previousStayIdForRoom
        ) {
          const previousStayDoc = stays.find((s) => s.id === previousStayIdForRoom);
          if (
            !previousStayDoc ||
            previousStayDoc.status === 'checked_out' ||
            matchingRoom.status !== 'occupied' ||
            matchingRoom.activeStayId !== previousStayIdForRoom
          ) {
            updateRoomId(matchingRoom.id);
            updateStayState({
              status: 'checked_out',
              houseName: matchingRoom.roomNumber,
              stayId: previousStayIdForRoom,
              errorMessage: 'Thanks for staying with us',
            });
            subscribeGuestStayRequests(null);
            return;
          }
        }

        // Check if house is currently unoccupied
        if (matchingRoom.status !== 'occupied' || !matchingRoom.activeStayId) {
          updateRoomId(matchingRoom.id);
          updateStayState({
            status: 'unoccupied',
            houseName: matchingRoom.roomNumber,
            errorMessage: `This house isn't checked in yet. Please contact reception.`,
          });
          subscribeGuestStayRequests(null);
          return;
        }

        // House IS occupied -> bind to current activeStayId
        const stayIdentifier = matchingRoom.activeStayId;
        try {
          localStorage.setItem(
            GUEST_SESSION_STORAGE_KEY,
            JSON.stringify({
              roomId: matchingRoom.id,
              stayId: stayIdentifier,
              propertyId: matchingRoom.propertyId,
              roomNumber: matchingRoom.roomNumber,
              token: urlToken,
              lastActiveAt: Date.now(),
            } satisfies StoredGuestSession)
          );
        } catch {
          // ignore storage errors
        }

        updateRoomId(matchingRoom.id);
        updateStayState({
          status: 'active',
          houseName: matchingRoom.roomNumber,
          stayId: stayIdentifier,
        });
        subscribeGuestStayRequests(stayIdentifier);
      };

      if (matchingQR) {
        processResolvedQR(matchingQR);
      } else if (!inFlightFetchRef.current.has(`qr_${urlToken}`)) {
        inFlightFetchRef.current.add(`qr_${urlToken}`);
        void dbService.getOrFetchQRByToken(urlToken).then((fetchedQR) => {
          processResolvedQR(fetchedQR);
        });
      }
      return;
    }

    // CASE 2: No URL token present -> Check if browser has a valid stored active stay session
    // Strictly apply stored guest sessions ONLY under guest routes (/r/... or /guest...)
    const isGuestRoute = window.location.pathname.startsWith('/r/') || window.location.pathname.startsWith('/guest');
    if (isGuestRoute && savedSession && rooms.length > 0) {
      const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
      const now = Date.now();
      const lastActive = savedSession.lastActiveAt || now;

      // Guest inactivity: 6 hours without activity -> re-scan required (GO 2.1 section B)
      if (now - lastActive > SIX_HOURS_MS) {
        updateRoomId(savedSession.roomId);
        updateStayState({
          status: 'rescan_required',
          houseName: savedSession.roomNumber,
          stayId: savedSession.stayId,
          errorMessage: 'For your security, in-room guest sessions expire after 6 hours of inactivity. Please re-scan your room QR.',
        });
        subscribeGuestStayRequests(null);
        return;
      }

      // Keep lastActiveAt fresh
      try {
        savedSession.lastActiveAt = now;
        localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(savedSession));
      } catch {
        // ignore
      }

      const matchingRoom = rooms.find((r) => r.id === savedSession.roomId);

      if (
        matchingRoom &&
        matchingRoom.status === 'occupied' &&
        matchingRoom.activeStayId &&
        matchingRoom.activeStayId === savedSession.stayId
      ) {
        updateRoomId(matchingRoom.id);
        updateStayState({
          status: 'active',
          houseName: matchingRoom.roomNumber,
          stayId: savedSession.stayId,
        });
        subscribeGuestStayRequests(savedSession.stayId);
        return;
      }

      // Room has been checked out or reassigned -> show Thanks for staying with us
      updateRoomId(matchingRoom?.id);
      updateStayState({
        status: 'checked_out',
        houseName: savedSession.roomNumber,
        stayId: savedSession.stayId,
        errorMessage: 'Thanks for staying with us',
      });
      subscribeGuestStayRequests(null);
      return;
    }

    // CASE 3: No token or not a guest route -> no session
    updateStayState({ status: 'no_session' });
    subscribeGuestStayRequests(null);
  }, [qrCodes, rooms, properties, stays]);

  // Keep guest session fresh on user activity
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastTouch = Date.now();
    const handleTouchActivity = () => {
      const now = Date.now();
      if (now - lastTouch < 30_000) return; // throttle to 30s
      lastTouch = now;
      try {
        const raw = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
        if (!raw) return;
        const session: StoredGuestSession = JSON.parse(raw);
        session.lastActiveAt = now;
        localStorage.setItem(GUEST_SESSION_STORAGE_KEY, JSON.stringify(session));
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointerdown', handleTouchActivity, { passive: true });
    window.addEventListener('keydown', handleTouchActivity, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handleTouchActivity);
      window.removeEventListener('keydown', handleTouchActivity);
    };
  }, []);

  const clearGuestSession = () => {
    try {
      localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
    setRoomId(undefined);
    setStayState({ status: 'no_session' });
    subscribeGuestStayRequests(null);
  };

  const property =
    properties.find((p) => p.slug === propertySlug) ||
    properties.find((p) => p.slug === 'rocks-apartments') ||
    properties[0] ||
    null;

  let room: Room | null = null;
  if (property && roomId) {
    room = rooms.find((r) => r.id === roomId && r.propertyId === property.id) || null;
    if (!room) {
      const activeQR = qrCodes.find((q) => q.roomId === roomId && q.status === 'active');
      if (activeQR) {
        room = {
          id: activeQR.roomId,
          propertyId: activeQR.propertyId,
          name: activeQR.houseName || 'your house',
          roomNumber: activeQR.houseName || 'your house',
          houseType: activeQR.houseType || 'Apartment',
          roomType: activeQR.houseType || 'Apartment',
          status: activeQR.activeStayId ? 'occupied' : 'available',
          activeStayId: activeQR.activeStayId || undefined,
          currentGuestName: activeQR.guestGreeting || '',
          wifiName: activeQR.wifiName,
          wifiPassword: activeQR.wifiPassword,
          guestCheckOutDate: activeQR.guestCheckOutDate || undefined,
          imageId: activeQR.imageId,
          amenities: [],
          archived: false,
        };
      }
    }
  }

  const handleSetPropertySlug = (slug: string) => {
    setPropertySlug(slug);
    const targetProp = properties.find((p) => p.slug === slug);
    if (targetProp) {
      setRoomId(undefined);
    }
  };

  useEffect(() => {
    if (property) {
      document.documentElement.style.setProperty('--color-primary', property.primaryColor || '#1E3A5F');
      document.documentElement.style.setProperty('--color-secondary', property.secondaryColor || '#C8A45D');
      document.documentElement.style.setProperty('--color-accent', property.accentColor || '#3B82F6');
    }
  }, [property?.primaryColor, property?.secondaryColor, property?.accentColor]);

  return (
    <TenantContext.Provider
      value={{
        property,
        room,
        stayState,
        isInvalidToken: stayState.status === 'invalid_token',
        loading: false,
        error: !property ? 'Property not found' : null,
        setPropertySlug: handleSetPropertySlug,
        setRoomId,
        clearGuestSession,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
