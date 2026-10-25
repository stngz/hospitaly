import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Property, Room } from '../types';
import { dbService, subscribeToStore } from '../lib/store';

interface TenantContextType {
  property: Property | null;
  room: Room | null;
  loading: boolean;
  error: string | null;
  setPropertySlug: (slug: string) => void;
  setRoomId: (id: string | undefined) => void;
}

const TenantContext = createContext<TenantContextType>({
  property: null,
  room: null,
  loading: false,
  error: null,
  setPropertySlug: () => {},
  setRoomId: () => {},
});

export const TenantProvider: React.FC<{
  initialSlug?: string;
  initialRoomId?: string;
  children: React.ReactNode;
}> = ({ initialSlug = 'zambezi-heights', initialRoomId = 'room_204', children }) => {
  // Check URL parameters for ?token=
  const getUrlTokenData = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        const qr = dbService.getQRCodeByToken(token.trim());
        if (qr) {
          const prop = dbService.getPropertyById(qr.propertyId);
          return { slug: prop?.slug, roomId: qr.roomId };
        }
      }
    }
    return null;
  };

  const initialTokenData = getUrlTokenData();
  const [propertySlug, setPropertySlug] = useState<string>(initialTokenData?.slug || initialSlug);
  const [roomId, setRoomId] = useState<string | undefined>(initialTokenData?.roomId || initialRoomId);

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

  // Auto-resolve QR tokens from window.location.search on load or when properties sync
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        const qr = dbService.getQRCodeByToken(token.trim());
        if (qr) {
          const targetProp = properties.find((p) => p.id === qr.propertyId);
          if (targetProp) {
            setPropertySlug(targetProp.slug);
            if (qr.roomId) {
              setRoomId(qr.roomId);
            }
          }
        }
      }
    }
  }, [properties]);

  const property = properties.find((p) => p.slug === propertySlug) || properties.find((p) => p.slug === 'rocks-apartments') || properties[0] || null;

  // Resolve room: strictly ensure it belongs to the active property
  let room: Room | null = null;
  if (property) {
    if (roomId) {
      room = rooms.find((r) => r.id === roomId && r.propertyId === property.id) || null;
    }
    // Fallback: auto-select first room of current property if roomId belongs to another property or was cleared
    if (!room) {
      room = rooms.find((r) => r.propertyId === property.id) || null;
    }
  }

  const handleSetPropertySlug = (slug: string) => {
    setPropertySlug(slug);
    const targetProp = properties.find((p) => p.slug === slug);
    if (targetProp) {
      const firstRoom = rooms.find((r) => r.propertyId === targetProp.id);
      if (firstRoom) {
        setRoomId(firstRoom.id);
      }
    }
  };

  // Inject CSS dynamic variables based on property branding
  useEffect(() => {
    if (property) {
      document.documentElement.style.setProperty('--color-primary', property.primaryColor || '#1B3B2B');
      document.documentElement.style.setProperty('--color-secondary', property.secondaryColor || '#C29B38');
      document.documentElement.style.setProperty('--color-accent', property.accentColor || '#E07A5F');
    }
  }, [property?.primaryColor, property?.secondaryColor, property?.accentColor]);

  return (
    <TenantContext.Provider
      value={{
        property,
        room,
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
