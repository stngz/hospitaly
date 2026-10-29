import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Property, Room } from '../types';
import { dbService, subscribeToStore, subscribeGuestStayRequests, subscribeGuestRoom } from '../lib/store';

export type GuestStayStatus = 'active' | 'unoccupied' | 'invalid_token' | 'checked_out' | 'no_session';

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
  const [stayState, setStayState] = useState<GuestStayState>({ status: 'no_session' });

  const getUrlToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('token') || params.get('qr');
    if (queryToken) return queryToken.trim().toUpperCase();

    const pathMatch = window.location.pathname.match(/\/r\/([a-zA-Z0-9_-]+)/);
    if (pathMatch) return pathMatch[1].trim().toUpperCase();

    return null;
  };

  const getUrlStayId = (): string | null => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('stay');
  };

  const updateStayState = (next: GuestStayState) => {
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
      if (qrCodes.length === 0 || rooms.length === 0) {
        return;
      }

      const matchingQR = dbService.getAnyQRByToken(urlToken);

      if (!matchingQR || matchingQR.status !== 'active' || !matchingQR.roomId) {
        updateStayState({
          status: 'invalid_token',
          errorMessage: 'This QR code is no longer active. Please contact reception.',
        });
        updateRoomId(undefined);
        subscribeGuestStayRequests(null);
        return;
      }

      const matchingRoom = rooms.find((r) => r.id === matchingQR.roomId);
      const targetProp = properties.find((p) => p.id === matchingQR.propertyId);
      if (targetProp) {
        updatePropertySlug(targetProp.slug);
      }

      if (!matchingRoom) {
        updateStayState({
          status: 'invalid_token',
          errorMessage: 'This QR code is no longer active. Please contact reception.',
        });
        updateRoomId(undefined);
        subscribeGuestStayRequests(null);
        subscribeGuestRoom(null);
        return;
      }

      subscribeGuestRoom(matchingRoom.id);

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
      return;
    }

    // CASE 2: No URL token present -> Check if browser has a valid stored active stay session
    if (savedSession && rooms.length > 0) {
      subscribeGuestRoom(savedSession.roomId);
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

    // CASE 3: No token and no saved session
    updateStayState({ status: 'no_session' });
    subscribeGuestStayRequests(null);
  }, [qrCodes, rooms, properties, stays]);

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
