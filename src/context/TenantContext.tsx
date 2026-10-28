import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Property, Room } from '../types';
import { dbService, subscribeToStore } from '../lib/store';

export type GuestStayStatus = 'active' | 'unoccupied' | 'invalid_token' | 'checked_out' | 'no_session';

export interface GuestStayState {
  status: GuestStayStatus;
  houseName?: string;
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

export const TenantProvider: React.FC<{
  initialSlug?: string;
  initialRoomId?: string;
  children: React.ReactNode;
}> = ({ initialSlug = 'rocks-apartments', children }) => {
  // Subscribe to reactive store
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

  const [propertySlug, setPropertySlug] = useState<string>(initialSlug || 'rocks-apartments');
  const [roomId, setRoomId] = useState<string | undefined>(undefined);
  const [stayState, setStayState] = useState<GuestStayState>({ status: 'no_session' });

  // Resolve active QR token from URL search parameter (?token=...) or path (/r/:token)
  const getUrlToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token');
    if (queryToken) return queryToken.trim().toUpperCase();

    const pathMatch = window.location.pathname.match(/\/r\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1].trim().toUpperCase();

    return null;
  };

  // Evaluate QR token and active stay lifecycle
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlToken = getUrlToken();

    // CASE 1: Guest opened a specific QR token URL (?token=... or /r/...)
    if (urlToken) {
      if (qrCodes.length === 0) {
        // Still initializing
        return;
      }

      const matchingQR = qrCodes.find(
        (q) => q.token.trim().toUpperCase() === urlToken && q.status === 'active'
      );

      if (!matchingQR || !matchingQR.roomId) {
        setStayState({
          status: 'invalid_token',
          errorMessage:
            'This QR code is invalid, revoked, or unassigned. Possession of an unknown QR code does not grant access.',
        });
        setRoomId(undefined);
        return;
      }

      // Locate assigned house
      const matchingRoom = rooms.find((r) => r.id === matchingQR.roomId);
      const targetProp = properties.find((p) => p.id === matchingQR.propertyId);
      if (targetProp) {
        setPropertySlug(targetProp.slug);
      }

      if (!matchingRoom) {
        setStayState({
          status: 'invalid_token',
          errorMessage: 'The house linked to this QR code could not be found.',
        });
        setRoomId(undefined);
        return;
      }

      // Lifecycle Check: An unoccupied house or a house without an activeStayId has NO active guest stay
      if (matchingRoom.status !== 'occupied' || !matchingRoom.activeStayId) {
        // Clear any previous session
        try {
          localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        } catch {}

        setRoomId(matchingRoom.id);
        setStayState({
          status: 'unoccupied',
          houseName: matchingRoom.roomNumber,
          errorMessage: `${matchingRoom.roomNumber} does not currently have an active guest check-in. In-house services and private guest access are locked until reception completes check-in.`,
        });
        return;
      }

      // House IS occupied -> Authorize active stay session strictly by activeStayId
      const stayIdentifier = matchingRoom.activeStayId;
      try {
        localStorage.setItem(
          GUEST_SESSION_STORAGE_KEY,
          JSON.stringify({
            roomId: matchingRoom.id,
            stayId: stayIdentifier,
            propertyId: matchingRoom.propertyId,
            roomNumber: matchingRoom.roomNumber,
          })
        );
      } catch {}

      setRoomId(matchingRoom.id);
      setStayState({
        status: 'active',
        houseName: matchingRoom.roomNumber,
      });
      return;
    }

    // CASE 2: No URL token present -> Check if browser has a valid stored active stay session
    let savedSessionRaw: string | null = null;
    try {
      savedSessionRaw = localStorage.getItem(GUEST_SESSION_STORAGE_KEY);
    } catch {}

    if (savedSessionRaw && rooms.length > 0) {
      try {
        const savedSession = JSON.parse(savedSessionRaw);
        const matchingRoom = rooms.find((r) => r.id === savedSession.roomId);

        // Validate server-side: Is the room still occupied with this exact activeStayId?
        if (
          matchingRoom &&
          matchingRoom.status === 'occupied' &&
          matchingRoom.activeStayId &&
          matchingRoom.activeStayId === savedSession.stayId
        ) {
          // Active stay remains valid across browser closures and reopens
          setRoomId(matchingRoom.id);
          setStayState({
            status: 'active',
            houseName: matchingRoom.roomNumber,
          });
          return;
        }

        // Room has been checked out or reassigned -> Revoke session immediately
        localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        setRoomId(undefined);
        setStayState({
          status: 'checked_out',
          houseName: savedSession.roomNumber,
          errorMessage:
            'Your guest stay has concluded and access has been revoked. We hope you enjoyed your time with us!',
        });
        return;
      } catch {
        try {
          localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
        } catch {}
      }
    }

    // CASE 3: No token and no saved session (Public home)
    setStayState({ status: 'no_session' });
  }, [qrCodes, rooms, properties]);

  const clearGuestSession = () => {
    try {
      localStorage.removeItem(GUEST_SESSION_STORAGE_KEY);
    } catch {}
    setRoomId(undefined);
    setStayState({ status: 'no_session' });
  };

  const property =
    properties.find((p) => p.slug === propertySlug) ||
    properties.find((p) => p.slug === 'rocks-apartments') ||
    properties[0] ||
    null;

  let room: Room | null = null;
  if (property && roomId) {
    room = rooms.find((r) => r.id === roomId && r.propertyId === property.id) || null;
  }

  const handleSetPropertySlug = (slug: string) => {
    setPropertySlug(slug);
    const targetProp = properties.find((p) => p.slug === slug);
    if (targetProp) {
      setRoomId(undefined);
    }
  };

  // Inject CSS dynamic variables based on property branding
  useEffect(() => {
    if (property) {
      document.documentElement.style.setProperty('--color-primary', property.primaryColor || '#1E3A5F');
      document.documentElement.style.setProperty('--color-secondary', property.secondaryColor || '#D4AF37');
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
