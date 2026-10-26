import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Property, Room } from '../types';
import { dbService, subscribeToStore } from '../lib/store';

interface TenantContextType {
  property: Property | null;
  room: Room | null;
  isInvalidToken: boolean;
  loading: boolean;
  error: string | null;
  setPropertySlug: (slug: string) => void;
  setRoomId: (id: string | undefined) => void;
}

const TenantContext = createContext<TenantContextType>({
  property: null,
  room: null,
  isInvalidToken: false,
  loading: false,
  error: null,
  setPropertySlug: () => {},
  setRoomId: () => {},
});

export const TenantProvider: React.FC<{
  initialSlug?: string;
  initialRoomId?: string;
  children: React.ReactNode;
}> = ({ initialSlug = 'rocks-apartments', initialRoomId, children }) => {
  // Check URL parameters for ?token= or path /r/:token
  const getUrlTokenData = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      let token = params.get('token');
      if (!token) {
        const pathMatch = window.location.pathname.match(/\/r\/([a-zA-Z0-9_-]+)/);
        if (pathMatch) {
          token = pathMatch[1];
        }
      }
      if (token) {
        const qr = dbService.getQRCodeByToken(token.trim());
        if (qr) {
          const prop = dbService.getPropertyById(qr.propertyId);
          return { slug: prop?.slug, roomId: qr.roomId, isValidToken: true };
        }
        return { slug: undefined, roomId: undefined, isValidToken: false, rawToken: token };
      }
    }
    return null;
  };

  const initialTokenData = getUrlTokenData();
  const [propertySlug, setPropertySlug] = useState<string>(
    initialTokenData?.slug || initialSlug || 'rocks-apartments'
  );
  const [roomId, setRoomId] = useState<string | undefined>(
    initialTokenData ? (initialTokenData.isValidToken ? initialTokenData.roomId : undefined) : initialRoomId
  );
  const [isInvalidToken, setIsInvalidToken] = useState<boolean>(
    initialTokenData ? !initialTokenData.isValidToken : false
  );

  // Subscribe to stable snapshots from store
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

  // Auto-resolve QR tokens from window location on load or when properties/qrCodes sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      let token = params.get('token');
      if (!token) {
        const pathMatch = window.location.pathname.match(/\/r\/([a-zA-Z0-9_-]+)/);
        if (pathMatch) {
          token = pathMatch[1];
        }
      }
      if (token) {
        const clean = token.trim().toUpperCase();
        const qr = qrCodes.find((q) => q.token.trim().toUpperCase() === clean && q.status === 'active');
        if (qr) {
          setIsInvalidToken(false);
          const targetProp = properties.find((p) => p.id === qr.propertyId);
          if (targetProp) {
            setPropertySlug(targetProp.slug);
            if (qr.roomId) {
              setRoomId(qr.roomId);
            }
          }
        } else if (qrCodes.length > 0) {
          setIsInvalidToken(true);
          setRoomId(undefined);
        }
      }
    }
  }, [properties, rooms, qrCodes]);

  const property =
    properties.find((p) => p.slug === propertySlug) ||
    properties.find((p) => p.slug === 'rocks-apartments') ||
    properties[0] ||
    null;

  // Resolve room: strictly ensure it belongs to the active property.
  // CRITICAL: NEVER fall back to another guest's room (prevents stranger privacy leaks).
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
        isInvalidToken,
        loading: false,
        error: !property ? 'Property not found' : null,
        setPropertySlug: handleSetPropertySlug,
        setRoomId,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);
