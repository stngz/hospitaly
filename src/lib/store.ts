import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc, 
  onSnapshot, 
  query, 
  where, 
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  Property, 
  Room, 
  QRCodeRecord, 
  ServiceRequest, 
  UserProfile, 
  UserNotificationSettings,
  DiningItem,
  StaffDepartment
} from '../types';
import { 
  SEED_PROPERTIES, 
  SEED_ROOMS, 
  SEED_QR_CODES, 
  INITIAL_REQUESTS, 
  SEED_DINING_ITEMS 
} from './seeds/rocksApartments';
import { notificationService } from './notifications';

const STORAGE_KEYS = {
  PROPERTIES: 'hospitally_properties_v4',
  ROOMS: 'hospitally_rooms_v4',
  QR_CODES: 'hospitally_qrcodes_v4',
  REQUESTS: 'hospitally_requests_v4',
  DINING: 'hospitally_dining_v4',
};

export function normalizeUserProfile(u: any): UserProfile {
  const rawRole = (u?.role as string) === 'admin' ? 'founder' : (u?.role || 'staff');
  const { pinCode: _removedPin, ...rest } = u || {};
  return {
    ...rest,
    role: rawRole,
    active: u?.active !== undefined ? Boolean(u.active) : true,
  } as UserProfile;
}

export const DEFAULT_HOUSE_AMENITIES = [
  'Private Pool',
  'Full Kitchen',
  'Unit AC',
  'High-Speed Wi-Fi',
];

export function sanitizeRoom(r: Room): Room {
  const cleanedAmenities = Array.isArray(r.amenities)
    ? r.amenities.filter((a) => !/hot[\s_]+tub/i.test(a))
    : DEFAULT_HOUSE_AMENITIES;
  const cleanedNotes = r.notes ? r.notes.replace(/private\s+hot[\s_]+tub\s*(and\s*)?/gi, '') : r.notes;
  return {
    ...r,
    amenities: cleanedAmenities.length > 0 ? cleanedAmenities : DEFAULT_HOUSE_AMENITIES,
    qrLabel: (r.qrLabel || r.roomNumber || '').trim().toUpperCase().slice(0, 8),
    ...(cleanedNotes !== undefined ? { notes: cleanedNotes } : {}),
  };
}

// In-memory cache holding identical references until modified
interface StoreCache {
  properties: Property[];
  rooms: Room[];
  qrCodes: QRCodeRecord[];
  users: UserProfile[];
  requests: ServiceRequest[];
  dining: DiningItem[];
  currentUser: UserProfile | null;
}

function loadInitialCache(): StoreCache {
  if (typeof window === 'undefined') {
    return {
      properties: SEED_PROPERTIES,
      rooms: SEED_ROOMS,
      qrCodes: SEED_QR_CODES,
      users: [],
      requests: INITIAL_REQUESTS,
      dining: SEED_DINING_ITEMS,
      currentUser: null,
    };
  }

  // Purge legacy v3 unauthenticated user/admin cache keys from browser storage
  try {
    localStorage.removeItem('hospitally_current_user_v3');
    localStorage.removeItem('hospitally_users_v3');
  } catch {
    // ignore storage errors
  }

  function read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        localStorage.setItem(key, JSON.stringify(fallback));
        return fallback;
      }
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  const obsoletePropIds = new Set(['prop_zambezi_01', 'prop_luangwa_02']);

  const rawProps = read<Property[]>(STORAGE_KEYS.PROPERTIES, SEED_PROPERTIES).filter(p => !obsoletePropIds.has(p.id));
  const mergedProps = [...rawProps];
  SEED_PROPERTIES.forEach((sp) => {
    const idx = mergedProps.findIndex((p) => p.id === sp.id);
    if (idx === -1) {
      mergedProps.push(sp);
    } else {
      mergedProps[idx] = {
        ...mergedProps[idx],
        ...sp,
        amenities: sp.amenities,
        nearbyAttractions: sp.nearbyAttractions,
        address: sp.address,
        description: sp.description,
      };
    }
  });

  const rawRooms = read<Room[]>(STORAGE_KEYS.ROOMS, SEED_ROOMS).filter(r => !obsoletePropIds.has(r.propertyId));
  const mergedRooms = rawRooms.map(sanitizeRoom);
  SEED_ROOMS.forEach((sr) => {
    const idx = mergedRooms.findIndex((r) => r.id === sr.id);
    if (idx === -1) {
      mergedRooms.push(sanitizeRoom(sr));
    } else {
      mergedRooms[idx] = sanitizeRoom({
        ...mergedRooms[idx],
        ...sr,
      });
    }
  });

  const rawQRs = read<QRCodeRecord[]>(STORAGE_KEYS.QR_CODES, SEED_QR_CODES).filter(q => !obsoletePropIds.has(q.propertyId));
  const mergedQRs = [...rawQRs];
  SEED_QR_CODES.forEach((sq) => {
    if (!mergedQRs.some((q) => q.id === sq.id)) {
      mergedQRs.push(sq);
    }
  });

  const rawDining = read<DiningItem[]>(STORAGE_KEYS.DINING, SEED_DINING_ITEMS).filter(d => !obsoletePropIds.has(d.propertyId));
  const mergedDining = [...rawDining];
  SEED_DINING_ITEMS.forEach((sd) => {
    if (!mergedDining.some((d) => d.id === sd.id)) {
      mergedDining.push(sd);
    }
  });

  const rawRequests = read<ServiceRequest[]>(STORAGE_KEYS.REQUESTS, INITIAL_REQUESTS).filter(r => !obsoletePropIds.has(r.propertyId));
  const mergedRequests = [...rawRequests];
  INITIAL_REQUESTS.forEach((sreq) => {
    if (!mergedRequests.some((r) => r.id === sreq.id)) {
      mergedRequests.push(sreq);
    }
  });

  persist(STORAGE_KEYS.PROPERTIES, mergedProps);
  persist(STORAGE_KEYS.ROOMS, mergedRooms);
  persist(STORAGE_KEYS.QR_CODES, mergedQRs);
  persist(STORAGE_KEYS.DINING, mergedDining);
  persist(STORAGE_KEYS.REQUESTS, mergedRequests);

  return {
    properties: mergedProps,
    rooms: mergedRooms,
    qrCodes: mergedQRs,
    users: [],
    requests: mergedRequests,
    dining: mergedDining,
    currentUser: null,
  };
}

let cache: StoreCache = loadInitialCache();

type Listener = () => void;
const listeners: Set<Listener> = new Set();

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error(e);
    }
  });
}

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function persist<T>(key: string, val: T) {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(e);
    }
  }
}

// Attach live Firestore real-time listeners
let isFirestoreListening = false;
let authUnsubscribers: (() => void)[] = [];

export function syncAuthenticatedUserListeners(user: UserProfile | null) {
  if (typeof window === 'undefined') return;

  // Clean up any existing authenticated listeners
  authUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch {}
  });
  authUnsubscribers = [];

  if (!user || user.role === 'guest') {
    cache = { ...cache, users: [] };
    notify();
    return;
  }

  const obsoletePropIds = new Set(['prop_zambezi_01', 'prop_luangwa_02']);

  try {
    // 1. Authenticated Users listener (Founder gets all; Manager/Staff strictly scoped to propertyId)
    const usersQuery =
      user.role === 'founder'
        ? collection(db, 'users')
        : query(collection(db, 'users'), where('propertyId', '==', user.propertyId));

    const unsubUsers = onSnapshot(
      usersQuery,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data();
          if (raw) {
            const normalized = normalizeUserProfile({ ...raw, id: raw.id || docSnap.id });
            if (!obsoletePropIds.has(normalized.propertyId) || normalized.role === 'founder') {
              list.push(normalized);
            }
          }
        });
        cache = { ...cache, users: list };
        notify();
      },
      (err) => {
        console.warn('Firestore live users listener note:', err);
      }
    );
    authUnsubscribers.push(unsubUsers);

    // 2. Authenticated Requests listener (Founder gets all; Manager/Staff strictly scoped to propertyId)
    const requestsQuery =
      user.role === 'founder'
        ? collection(db, 'requests')
        : query(collection(db, 'requests'), where('propertyId', '==', user.propertyId));

    const unsubRequests = onSnapshot(
      requestsQuery,
      (snapshot) => {
        const firestoreList: ServiceRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ServiceRequest;
          if (data && !obsoletePropIds.has(data.propertyId)) {
            firestoreList.push(data);
          }
        });
        firestoreList.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        cache = { ...cache, requests: firestoreList };
        persist(STORAGE_KEYS.REQUESTS, cache.requests);
        notify();
      },
      (err) => {
        console.warn('Firestore live requests listener warning:', err);
      }
    );
    authUnsubscribers.push(unsubRequests);

    // 3. Authenticated Rooms listener (Founder gets all; Manager/Staff strictly scoped to propertyId)
    const roomsQuery =
      user.role === 'founder'
        ? collection(db, 'rooms')
        : query(collection(db, 'rooms'), where('propertyId', '==', user.propertyId));

    const unsubRooms = onSnapshot(
      roomsQuery,
      (snapshot) => {
        const firestoreRooms: Room[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Room;
          if (data && !obsoletePropIds.has(data.propertyId)) {
            firestoreRooms.push(sanitizeRoom(data));
          }
        });
        cache = { ...cache, rooms: firestoreRooms };
        persist(STORAGE_KEYS.ROOMS, cache.rooms);
        notify();
      },
      (err) => {
        console.warn('Firestore live rooms listener warning:', err);
      }
    );
    authUnsubscribers.push(unsubRooms);
  } catch (err) {
    console.warn('Could not attach authenticated listeners:', err);
  }
}

export function initFirestoreListeners() {
  if (isFirestoreListening || typeof window === 'undefined') return;
  isFirestoreListening = true;

  const obsoletePropIds = new Set(['prop_zambezi_01', 'prop_luangwa_02']);

  try {
    // 1. Properties: Discoverable by public guests & staff
    const propsCol = collection(db, 'properties');
    onSnapshot(
      propsCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Property[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Property;
            if (data && !obsoletePropIds.has(data.id)) {
              // Ensure property feature flags and terminology defaults
              const defaulted: Property = {
                ...data,
                unitLabel: data.unitLabel || (data.id === 'prop_rocks_lusaka' ? 'House' : 'Room'),
                diningEnabled: data.diningEnabled !== undefined ? data.diningEnabled : (data.id === 'prop_rocks_lusaka' ? false : true),
                errandsEnabled: data.errandsEnabled !== undefined ? data.errandsEnabled : false,
                airportTransfersEnabled: data.airportTransfersEnabled !== undefined ? data.airportTransfersEnabled : true,
              };
              list.push(defaulted);
            }
          });
          cache = { ...cache, properties: list };
          persist(STORAGE_KEYS.PROPERTIES, cache.properties);
          notify();
        }
      },
      (err) => {
        console.warn('Firestore live properties listener note:', err);
      }
    );

    // 2. Dining: Public in-room dining menus
    const diningCol = collection(db, 'dining');
    onSnapshot(
      diningCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: DiningItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as DiningItem;
            if (data && !obsoletePropIds.has(data.propertyId)) {
              list.push(data);
            }
          });
          cache = { ...cache, dining: list };
          persist(STORAGE_KEYS.DINING, cache.dining);
          notify();
        }
      },
      (err) => {
        console.warn('Firestore live dining listener note:', err);
      }
    );

    // 3. QR Codes: Publicly active QR tokens for scanner lookup
    const qrQuery = query(collection(db, 'qrCodes'), where('status', '==', 'active'));
    onSnapshot(
      qrQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const firestoreQRs: QRCodeRecord[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as QRCodeRecord;
            if (data && !obsoletePropIds.has(data.propertyId)) {
              firestoreQRs.push(data);
            }
          });
          cache = { ...cache, qrCodes: firestoreQRs };
          persist(STORAGE_KEYS.QR_CODES, cache.qrCodes);
          notify();
        }
      },
      (err) => {
        console.warn('Firestore live qrCodes listener warning:', err);
      }
    );
  } catch (err) {
    console.warn('Could not initialize public Firestore listeners:', err);
  }
}

export const dbService = {
  // Properties - stable snapshot
  getProperties: (): Property[] => {
    return cache.properties;
  },
  getPropertyBySlug: (slug: string): Property | undefined => {
    return cache.properties.find((p) => p.slug === slug);
  },
  getPropertyById: (id: string): Property | undefined => {
    return cache.properties.find((p) => p.id === id);
  },
  createPropertyWithManager: (
    propertyData: {
      name: string;
      city: string;
      propertyType?: string;
      currency?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      wifiName?: string;
      wifiPassword?: string;
      description?: string;
      contactPhone?: string;
    },
    managerData: {
      name: string;
      email: string;
      phone?: string;
    }
  ): { property: Property; manager: UserProfile } => {
    const slug = propertyData.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `prop-${Date.now()}`;
    const propId = `prop_${slug}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newProperty: Property = {
      id: propId,
      name: propertyData.name,
      slug,
      description: propertyData.description || `Welcome to ${propertyData.name}, offering premier hospitality in ${propertyData.city}.`,
      logoUrl: '',
      coverImageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
      primaryColor: propertyData.primaryColor || '#1B3B2B',
      secondaryColor: propertyData.secondaryColor || '#C29B38',
      accentColor: propertyData.accentColor || '#E07A5F',
      contactPhone: propertyData.contactPhone || '+260 97 000 0000',
      contactEmail: managerData.email,
      address: `${propertyData.city}, Zambia`,
      city: propertyData.city,
      country: 'Zambia',
      timezone: 'Africa/Lusaka',
      currency: propertyData.currency || 'ZMW',
      wifiName: propertyData.wifiName || `${propertyData.name.replace(/\s+/g, '')}_Guest`,
      wifiPassword: propertyData.wifiPassword || 'Welcome2026',
      checkInTime: '14:00',
      checkOutTime: '10:30',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const managerId = `user_mgr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newManager: UserProfile = {
      id: managerId,
      propertyId: newProperty.id,
      name: managerData.name,
      email: managerData.email.toLowerCase().trim(),
      phone: managerData.phone || '+260 97 000 0000',
      role: 'manager',
      department: 'management',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    cache = {
      ...cache,
      properties: [...cache.properties, newProperty],
      users: [...cache.users, newManager],
    };
    persist(STORAGE_KEYS.PROPERTIES, cache.properties);
    notify();

    // Auto-create initial starter room for the property
    dbService.addRoom(newProperty.id, '101', 'Executive Suite');

    // Auto-create starter dining item
    const starterDining: DiningItem = {
      id: `dine_${Date.now()}_1`,
      propertyId: newProperty.id,
      name: 'Welcome Continental Breakfast',
      category: 'breakfast',
      description: 'Fresh seasonal fruits, warm baked croissants, Zambian honey, and artisanal coffee.',
      price: 160,
      imageUrl: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=400&q=80',
      available: true,
    };
    cache = {
      ...cache,
      dining: [...cache.dining, starterDining],
    };
    persist(STORAGE_KEYS.DINING, cache.dining);
    notify();

    // Async write-through to live Firebase Firestore
    try {
      setDoc(doc(db, 'properties', newProperty.id), newProperty).catch((err) =>
        console.warn('Firestore setDoc property notice:', err)
      );
      setDoc(doc(db, 'users', newManager.id), newManager).catch((err) =>
        console.warn('Firestore setDoc manager notice:', err)
      );
      setDoc(doc(db, 'dining', starterDining.id), starterDining).catch((err) =>
        console.warn('Firestore setDoc dining notice:', err)
      );
    } catch (err) {
      console.warn('Firestore write failed:', err);
    }

    return { property: newProperty, manager: newManager };
  },
  togglePropertyStatus: (propertyId: string): Property | undefined => {
    let updated: Property | undefined;
    const now = new Date().toISOString();
    const list = cache.properties.map((p) => {
      if (p.id === propertyId) {
        const nextStatus = p.status === 'active' ? 'suspended' : 'active';
        updated = {
          ...p,
          status: nextStatus,
          updatedAt: now,
        };
        return updated;
      }
      return p;
    });

    cache = {
      ...cache,
      properties: list,
    };
    persist(STORAGE_KEYS.PROPERTIES, cache.properties);
    notify();

    if (updated) {
      try {
        setDoc(doc(db, 'properties', propertyId), {
          status: updated.status,
          updatedAt: now,
        }, { merge: true }).catch((err) => console.warn('Firestore togglePropertyStatus notice:', err));
      } catch (err) {
        console.warn('Firestore setDoc failed:', err);
      }
    }

    return updated;
  },

  // Rooms - stable snapshot
  getAllRooms: (): Room[] => {
    return cache.rooms;
  },
  getRoomsByProperty: (propertyId: string): Room[] => {
    return cache.rooms.filter((r) => r.propertyId === propertyId);
  },
  getRoomById: (roomId: string): Room | undefined => {
    return cache.rooms.find((r) => r.id === roomId);
  },
  addRoom: (
    propertyId: string,
    roomNumber: string,
    roomType: string,
    options?: {
      amenities?: string[];
      qrLabel?: string;
      imageUrl?: string;
      notes?: string;
    }
  ): { room: Room; qrCode: QRCodeRecord } => {
    const prop = cache.properties.find((p) => p.id === propertyId);
    const slugPrefix = (prop?.slug || 'PROP')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8);
    const cleanRoomNum = roomNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const token = `${slugPrefix}-${cleanRoomNum}-${randomSuffix}`;

    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const rawQrLabel = options?.qrLabel !== undefined ? options.qrLabel : roomNumber;
    const newRoom: Room = sanitizeRoom({
      id: roomId,
      propertyId,
      roomNumber,
      roomType,
      status: 'available',
      amenities: options?.amenities && options.amenities.length > 0 ? options.amenities : DEFAULT_HOUSE_AMENITIES,
      qrLabel: rawQrLabel.trim().toUpperCase().slice(0, 8),
      ...(options?.imageUrl ? { imageUrl: options.imageUrl } : {}),
      ...(options?.notes ? { notes: options.notes } : {}),
      createdAt: now,
      updatedAt: now,
    });

    const newQrCode: QRCodeRecord = {
      id: `qr_${roomId}`,
      propertyId,
      roomId: newRoom.id,
      locationType: 'room',
      token,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    cache = {
      ...cache,
      rooms: [...cache.rooms, newRoom],
      qrCodes: [...cache.qrCodes, newQrCode],
    };
    persist(STORAGE_KEYS.ROOMS, cache.rooms);
    persist(STORAGE_KEYS.QR_CODES, cache.qrCodes);
    notify();

    // Async write-through to live Firebase Firestore
    try {
      setDoc(doc(db, 'rooms', newRoom.id), newRoom).catch((err) => {
        console.warn('Firestore setDoc room notice:', err);
      });
      setDoc(doc(db, 'qrCodes', newQrCode.id), newQrCode).catch((err) => {
        console.warn('Firestore setDoc qrCode notice:', err);
      });
    } catch (err) {
      console.warn('Firestore setDoc room/qr failed:', err);
    }

    return { room: newRoom, qrCode: newQrCode };
  },
  addRoomWithQR: (
    propertyId: string,
    roomNumber: string,
    roomType: string,
    options?: {
      amenities?: string[];
      qrLabel?: string;
      imageUrl?: string;
      notes?: string;
    }
  ): { room: Room; qrCode: QRCodeRecord } => {
    return dbService.addRoom(propertyId, roomNumber, roomType, options);
  },
  updateRoomDetails: (
    roomId: string,
    updates: Partial<Pick<Room, 'roomNumber' | 'roomType' | 'amenities' | 'qrLabel' | 'imageUrl' | 'notes'>>
  ): Room | undefined => {
    let updatedRoom: Room | undefined;
    const now = new Date().toISOString();
    const cleanedUpdates: Partial<Room> = { ...updates };
    if (cleanedUpdates.qrLabel !== undefined) {
      cleanedUpdates.qrLabel = cleanedUpdates.qrLabel.trim().toUpperCase().slice(0, 8);
    }

    const updated = cache.rooms.map((r) => {
      if (r.id === roomId) {
        updatedRoom = sanitizeRoom({
          ...r,
          ...cleanedUpdates,
          updatedAt: now,
        });
        return updatedRoom;
      }
      return r;
    });

    cache = {
      ...cache,
      rooms: updated,
    };
    persist(STORAGE_KEYS.ROOMS, cache.rooms);
    notify();

    if (updatedRoom) {
      try {
        const patch: any = {
          roomNumber: updatedRoom.roomNumber,
          roomType: updatedRoom.roomType,
          amenities: updatedRoom.amenities || DEFAULT_HOUSE_AMENITIES,
          qrLabel: updatedRoom.qrLabel || updatedRoom.roomNumber.trim().toUpperCase().slice(0, 8),
          updatedAt: now,
        };
        if (updates.imageUrl !== undefined) patch.imageUrl = updates.imageUrl || null;
        if (updates.notes !== undefined) patch.notes = updates.notes || null;

        setDoc(doc(db, 'rooms', roomId), patch, { merge: true }).catch((err) => {
          console.warn('Firestore setDoc updateRoomDetails notice:', err);
        });
      } catch (err) {
        console.warn('Firestore setDoc updateRoomDetails failed:', err);
      }
    }

    return updatedRoom;
  },
  regenerateRoomQRToken: (roomId: string): QRCodeRecord | undefined => {
    const room = cache.rooms.find((r) => r.id === roomId);
    if (!room) return undefined;

    const prop = cache.properties.find((p) => p.id === room.propertyId);
    const slugPrefix = (prop?.slug || 'PROP')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 8);
    const cleanRoomNum = room.roomNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newToken = `${slugPrefix}-${cleanRoomNum}-${randomSuffix}`;
    const now = new Date().toISOString();

    const oldQRs = cache.qrCodes.filter((q) => q.roomId === roomId);
    const newQrRecord: QRCodeRecord = {
      id: `qr_${roomId}_${Date.now()}`,
      propertyId: room.propertyId,
      roomId: room.id,
      locationType: 'room',
      token: newToken,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    cache = {
      ...cache,
      qrCodes: [
        ...cache.qrCodes.filter((q) => q.roomId !== roomId),
        newQrRecord,
      ],
    };
    persist(STORAGE_KEYS.QR_CODES, cache.qrCodes);
    notify();

    try {
      oldQRs.forEach((oldQr) => {
        deleteDoc(doc(db, 'qrCodes', oldQr.id)).catch((err) => {
          console.warn('Firestore deleteDoc old qrCode notice:', err);
        });
      });
      setDoc(doc(db, 'qrCodes', newQrRecord.id), newQrRecord).catch((err) => {
        console.warn('Firestore setDoc regenerated qrCode notice:', err);
      });
    } catch (err) {
      console.warn('Firestore regenerateRoomQRToken failed:', err);
    }

    return newQrRecord;
  },
  deleteRoom: (roomId: string): boolean => {
    const matchingQRs = cache.qrCodes.filter((q) => q.roomId === roomId);
    cache = {
      ...cache,
      rooms: cache.rooms.filter((r) => r.id !== roomId),
      qrCodes: cache.qrCodes.filter((q) => q.roomId !== roomId),
    };
    persist(STORAGE_KEYS.ROOMS, cache.rooms);
    persist(STORAGE_KEYS.QR_CODES, cache.qrCodes);
    notify();

    // Async delete from Firebase Firestore
    try {
      deleteDoc(doc(db, 'rooms', roomId)).catch((err) => {
        console.warn('Firestore deleteDoc room notice:', err);
      });
      matchingQRs.forEach((q) => {
        deleteDoc(doc(db, 'qrCodes', q.id)).catch((err) => {
          console.warn('Firestore deleteDoc qrCode notice:', err);
        });
      });
    } catch (err) {
      console.warn('Firestore deleteDoc room/qr failed:', err);
    }

    return true;
  },
  assignGuestToRoom: (
    roomId: string,
    guestName: string,
    checkOutDate?: string,
    guestPhone?: string
  ): Room | undefined => {
    let updatedRoom: Room | undefined;
    const now = new Date().toISOString();
    const stayId = `stay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const updated = cache.rooms.map((r) => {
      if (r.id === roomId) {
        updatedRoom = {
          ...r,
          status: 'occupied' as const,
          activeStayId: stayId,
          currentGuestName: guestName,
          guestCheckOutDate: checkOutDate || undefined,
          guestPhone: guestPhone || undefined,
          updatedAt: now,
        };
        return updatedRoom;
      }
      return r;
    });

    cache = {
      ...cache,
      rooms: updated,
    };
    persist(STORAGE_KEYS.ROOMS, cache.rooms);
    notify();

    if (updatedRoom) {
      try {
        const patch: any = {
          status: 'occupied',
          activeStayId: stayId,
          currentGuestName: guestName,
          guestCheckOutDate: checkOutDate || null,
          guestPhone: guestPhone || null,
          updatedAt: now,
        };
        setDoc(doc(db, 'rooms', roomId), patch, { merge: true }).catch((err) => {
          console.warn('Firestore setDoc room check-in notice:', err);
        });
      } catch (err) {
        console.warn('Firestore setDoc room check-in failed:', err);
      }
    }

    return updatedRoom;
  },
  checkOutRoom: (roomId: string): Room | undefined => {
    let updatedRoom: Room | undefined;
    const now = new Date().toISOString();
    const updated = cache.rooms.map((r) => {
      if (r.id === roomId) {
        const copy: Room = {
          ...r,
          status: 'available' as const,
          updatedAt: now,
        };
        delete copy.activeStayId;
        delete copy.currentGuestName;
        delete copy.guestCheckOutDate;
        delete copy.guestPhone;
        updatedRoom = copy;
        return copy;
      }
      return r;
    });

    cache = {
      ...cache,
      rooms: updated,
    };
    persist(STORAGE_KEYS.ROOMS, cache.rooms);
    notify();

    if (updatedRoom) {
      try {
        const patch: any = {
          status: 'available',
          activeStayId: null,
          currentGuestName: null,
          guestCheckOutDate: null,
          guestPhone: null,
          updatedAt: now,
        };
        setDoc(doc(db, 'rooms', roomId), patch, { merge: true }).catch((err) => {
          console.warn('Firestore setDoc checkout notice:', err);
        });
      } catch (err) {
        console.warn('Firestore setDoc checkout failed:', err);
      }
    }

    return updatedRoom;
  },

  // QR Codes - stable snapshot
  getQRCodeByToken: (token: string): QRCodeRecord | undefined => {
    const clean = token.trim().toUpperCase();
    return cache.qrCodes.find((q) => q.token.trim().toUpperCase() === clean && q.status === 'active');
  },
  getQRCodeByRoomId: (roomId: string): QRCodeRecord | undefined => {
    return cache.qrCodes.find((q) => q.roomId === roomId && q.status === 'active');
  },
  getAllQRCodes: (): QRCodeRecord[] => {
    return cache.qrCodes;
  },

  // Dining - stable snapshot
  getAllDining: (): DiningItem[] => {
    return cache.dining;
  },
  getDiningItems: (propertyId: string): DiningItem[] => {
    return cache.dining.filter((d) => d.propertyId === propertyId);
  },
  addDiningItem: (
    propertyId: string,
    itemData: {
      name: string;
      category: 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'dessert';
      description: string;
      price: number;
      imageUrl?: string;
      available?: boolean;
    }
  ): DiningItem => {
    const newItem: DiningItem = {
      id: `dine_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      propertyId,
      name: itemData.name,
      category: itemData.category,
      description: itemData.description,
      price: itemData.price,
      imageUrl: itemData.imageUrl || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
      available: itemData.available !== undefined ? itemData.available : true,
    };

    cache = {
      ...cache,
      dining: [...cache.dining, newItem],
    };
    persist(STORAGE_KEYS.DINING, cache.dining);
    notify();

    try {
      setDoc(doc(db, 'dining', newItem.id), newItem).catch((err) =>
        console.warn('Firestore setDoc dining notice:', err)
      );
    } catch (err) {
      console.warn('Firestore setDoc failed:', err);
    }

    return newItem;
  },
  deleteDiningItem: (diningId: string): boolean => {
    cache = {
      ...cache,
      dining: cache.dining.filter((d) => d.id !== diningId),
    };
    persist(STORAGE_KEYS.DINING, cache.dining);
    notify();

    try {
      deleteDoc(doc(db, 'dining', diningId)).catch((err) =>
        console.warn('Firestore deleteDoc dining notice:', err)
      );
    } catch (err) {
      console.warn('Firestore deleteDoc failed:', err);
    }

    return true;
  },
  updateDiningItem: (
    diningId: string,
    updates: Partial<DiningItem>
  ): DiningItem | undefined => {
    let updated: DiningItem | undefined;
    cache = {
      ...cache,
      dining: cache.dining.map((d) => {
        if (d.id === diningId) {
          updated = { ...d, ...updates };
          return updated;
        }
        return d;
      }),
    };
    persist(STORAGE_KEYS.DINING, cache.dining);
    notify();

    if (updated) {
      try {
        setDoc(doc(db, 'dining', diningId), updates as any, { merge: true }).catch((err) =>
          console.warn('Firestore setDoc dining notice:', err)
        );
      } catch (err) {
        console.warn('Firestore setDoc dining failed:', err);
      }
    }

    return updated;
  },

  // Requests - stable snapshot
  getAllRequests: (): ServiceRequest[] => {
    return cache.requests;
  },
  getRequests: (propertyId?: string): ServiceRequest[] => {
    if (!propertyId) return cache.requests;
    return cache.requests.filter((r) => r.propertyId === propertyId);
  },
  getRequestById: (id: string): ServiceRequest | undefined => {
    return cache.requests.find((r) => r.id === id);
  },
  createRequest: (payload: Omit<ServiceRequest, 'id' | 'createdAt' | 'updatedAt'>): ServiceRequest => {
    const newReq: ServiceRequest = {
      ...payload,
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cache = {
      ...cache,
      requests: [newReq, ...cache.requests],
    };
    persist(STORAGE_KEYS.REQUESTS, cache.requests);
    notify();

    // Trigger audio chime, haptic & push notification
    try {
      notificationService.playOrderPlacedChime();
      notificationService.triggerHaptic('dispatch');
      notificationService.notify({
        title: `Bedside Order Dispatched`,
        subtitle: `Room ${newReq.roomNumber} • ${newReq.title}`,
        category: newReq.category,
        roomNumber: newReq.roomNumber,
        actionLabel: 'Track Status',
      });
    } catch (e) {
      console.warn('Notification trigger note:', e);
    }

    // Async write-through to live Firebase Firestore
    try {
      setDoc(doc(db, 'requests', newReq.id), newReq).catch((err) => {
        console.warn('Firestore setDoc notice:', err);
      });
    } catch (err) {
      console.warn('Firestore setDoc failed:', err);
    }

    return newReq;
  },
  updateRequestStatus: (
    id: string,
    status: ServiceRequest['status'],
    assignedTo?: { uid: string; name: string }
  ): ServiceRequest | undefined => {
    let updatedItem: ServiceRequest | undefined;
    const updated = cache.requests.map((item) => {
      if (item.id === id) {
        updatedItem = {
          ...item,
          status,
          updatedAt: new Date().toISOString(),
          ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}),
          ...(assignedTo ? { assignedTo } : {}),
        };
        return updatedItem;
      }
      return item;
    });
    cache = {
      ...cache,
      requests: updated,
    };
    persist(STORAGE_KEYS.REQUESTS, cache.requests);
    notify();

    // Trigger status change sounds and in-app alerts
    if (updatedItem) {
      try {
        if (status === 'completed') {
          notificationService.playDoorbellChime();
          notificationService.triggerHaptic('success');
          notificationService.notify({
            title: `Order Delivered & Completed`,
            subtitle: `Room ${updatedItem.roomNumber} • ${updatedItem.title}`,
            category: updatedItem.category,
            roomNumber: updatedItem.roomNumber,
          });
        } else if (status === 'in_progress') {
          notificationService.playStatusUpdateChime();
          notificationService.triggerHaptic('medium');
          notificationService.notify({
            title: `Staff Dispatched to Room`,
            subtitle: `${assignedTo?.name || 'Staff'} is heading to Room ${updatedItem.roomNumber}`,
            category: updatedItem.category,
            roomNumber: updatedItem.roomNumber,
          });
        } else if (status === 'acknowledged') {
          notificationService.playStatusUpdateChime();
          notificationService.triggerHaptic('light');
          notificationService.notify({
            title: `Order Acknowledged`,
            subtitle: `Reception & staff reviewed Room ${updatedItem.roomNumber}'s request`,
            category: updatedItem.category,
            roomNumber: updatedItem.roomNumber,
          });
        }
      } catch (e) {
        console.warn('Status notification notice:', e);
      }
    }

    // Async write-through to live Firebase Firestore
    if (updatedItem) {
      try {
        const patch: any = {
          status,
          updatedAt: updatedItem.updatedAt,
        };
        if (status === 'completed') patch.completedAt = updatedItem.completedAt;
        if (assignedTo) patch.assignedTo = assignedTo;
        
        setDoc(doc(db, 'requests', id), patch, { merge: true }).catch((err) => {
          console.warn('Firestore setDoc request notice:', err);
        });
      } catch (err) {
        console.warn('Firestore setDoc request failed:', err);
      }
    }

    return updatedItem;
  },

  // Users & Staff - stable snapshot (in-memory only, synced via authenticated Firestore listener)
  getAllUsers: (): UserProfile[] => {
    return cache.users;
  },
  getUsers: (propertyId?: string): UserProfile[] => {
    if (!propertyId) return cache.users;
    return cache.users.filter((u) => u.propertyId === propertyId);
  },
  getUserByEmail: (email: string): UserProfile | undefined => {
    return cache.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  },
  createStaffMember: (
    propertyId: string,
    staffData: {
      id?: string;
      name: string;
      email: string;
      phone?: string;
      role?: 'staff' | 'manager';
      department: StaffDepartment;
    }
  ): UserProfile => {
    const staffId = staffData.id || `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newStaff: UserProfile = {
      id: staffId,
      propertyId,
      name: staffData.name.trim(),
      email: staffData.email.toLowerCase().trim(),
      phone: staffData.phone?.trim() || '',
      role: staffData.role || 'staff',
      department: staffData.department,
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    cache = {
      ...cache,
      users: [...cache.users.filter((u) => u.id !== newStaff.id && u.email.toLowerCase() !== newStaff.email), newStaff],
    };
    notify();

    try {
      setDoc(doc(db, 'users', newStaff.id), newStaff).catch((err) =>
        console.warn('Firestore setDoc staff notice:', err)
      );
    } catch (err) {
      console.warn('Firestore setDoc failed:', err);
    }

    return newStaff;
  },
  setUserActiveStatus: (userId: string, active: boolean): UserProfile | undefined => {
    return dbService.updateUserProfile(userId, { active });
  },
  deleteStaffMember: (userId: string): boolean => {
    cache = {
      ...cache,
      users: cache.users.filter((u) => u.id !== userId),
    };
    notify();

    try {
      deleteDoc(doc(db, 'users', userId)).catch((err) =>
        console.warn('Firestore deleteDoc staff notice:', err)
      );
    } catch (err) {
      console.warn('Firestore deleteDoc failed:', err);
    }

    return true;
  },
  createUser: (user: UserProfile): UserProfile => {
    const normalized = normalizeUserProfile(user);
    cache = {
      ...cache,
      users: [...cache.users.filter((u) => u.id !== normalized.id), normalized],
    };
    notify();

    try {
      setDoc(doc(db, 'users', normalized.id), normalized).catch((err) =>
        console.warn('Firestore setDoc user notice:', err)
      );
    } catch (err) {
      console.warn('Firestore setDoc user failed:', err);
    }
    return normalized;
  },
  updateUserProfile: (userId: string, patch: Partial<UserProfile>): UserProfile | undefined => {
    let updatedUser: UserProfile | undefined;
    const now = new Date().toISOString();
    const nextUsers = cache.users.map((u) => {
      if (u.id === userId) {
        updatedUser = normalizeUserProfile({ ...u, ...patch, updatedAt: now });
        return updatedUser;
      }
      return u;
    });
    if (!updatedUser && cache.currentUser?.id === userId) {
      updatedUser = normalizeUserProfile({ ...cache.currentUser, ...patch, updatedAt: now });
    }
    cache = {
      ...cache,
      users: nextUsers,
      ...(cache.currentUser?.id === userId && updatedUser ? { currentUser: updatedUser } : {}),
    };
    notify();

    if (updatedUser) {
      try {
        setDoc(doc(db, 'users', userId), { ...patch, updatedAt: now }, { merge: true }).catch((err) =>
          console.warn('Firestore updateDoc user notice:', err)
        );
      } catch (err) {
        console.warn('Firestore updateDoc user failed:', err);
      }
    }
    return updatedUser;
  },
  updateUserNotificationSettings: (
    userId: string,
    notificationSettings: UserNotificationSettings
  ): UserProfile | undefined => {
    return dbService.updateUserProfile(userId, { notificationSettings });
  },
  saveStaffDeviceToken: async (
    userId: string,
    propertyId: string,
    token: string
  ): Promise<void> => {
    if (!userId || !token) return;
    const now = new Date().toISOString();
    const platform =
      typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 180) : 'web';
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hospitally_fcm_token', token);
      }
      await setDoc(doc(db, 'users', userId, 'devices', token), {
        token,
        uid: userId,
        propertyId: propertyId || '',
        platform,
        createdAt: now,
        lastSeenAt: now,
      });
    } catch (err) {
      console.warn('Firestore saveStaffDeviceToken notice:', err);
    }
  },
  removeStaffDeviceToken: async (
    userId?: string,
    token?: string
  ): Promise<void> => {
    const targetUid = userId || cache.currentUser?.id;
    let targetToken = token;
    if (!targetToken && typeof window !== 'undefined') {
      try {
        targetToken = localStorage.getItem('hospitally_fcm_token') || undefined;
      } catch {}
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('hospitally_fcm_token');
      } catch {}
    }
    if (!targetUid || !targetToken) return;
    try {
      await deleteDoc(doc(db, 'users', targetUid, 'devices', targetToken));
    } catch (err) {
      console.warn('Firestore removeStaffDeviceToken notice:', err);
    }
  },
  getCurrentUser: (): UserProfile | null => {
    return cache.currentUser;
  },
  setCurrentUser: (user: UserProfile | null): void => {
    const normalized = user ? normalizeUserProfile(user) : null;
    cache = {
      ...cache,
      currentUser: normalized,
      ...(normalized === null ? { users: [] } : {}),
    };
    syncAuthenticatedUserListeners(normalized);
    notify();
  },
  clearSensitiveSession: (): void => {
    const previousUid = cache.currentUser?.id;
    if (previousUid) {
      dbService.removeStaffDeviceToken(previousUid).catch(() => {});
    }
    cache = {
      ...cache,
      currentUser: null,
      users: [],
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('hospitally_current_user_v3');
        localStorage.removeItem('hospitally_users_v3');
      } catch {
        // ignore
      }
    }
    syncAuthenticatedUserListeners(null);
    notify();
  },
};
