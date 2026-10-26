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
  DiningItem,
  StaffDepartment
} from '../types';
import { 
  SEED_PROPERTIES, 
  SEED_ROOMS, 
  SEED_QR_CODES, 
  SEED_STAFF_USERS, 
  INITIAL_REQUESTS, 
  SEED_DINING_ITEMS 
} from './seeds/rocksApartments';
import { notificationService } from './notifications';

const STORAGE_KEYS = {
  PROPERTIES: 'hospitally_properties_v3',
  ROOMS: 'hospitally_rooms_v3',
  QR_CODES: 'hospitally_qrcodes_v3',
  USERS: 'hospitally_users_v3',
  REQUESTS: 'hospitally_requests_v3',
  DINING: 'hospitally_dining_v3',
  CURRENT_USER: 'hospitally_current_user_v3',
};

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
      users: SEED_STAFF_USERS,
      requests: INITIAL_REQUESTS,
      dining: SEED_DINING_ITEMS,
      currentUser: SEED_STAFF_USERS[0],
    };
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
      // Keep up to date with latest seed enhancements if needed
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
  const mergedRooms = [...rawRooms];
  SEED_ROOMS.forEach((sr) => {
    if (!mergedRooms.some((r) => r.id === sr.id)) {
      mergedRooms.push(sr);
    }
  });

  const rawQRs = read<QRCodeRecord[]>(STORAGE_KEYS.QR_CODES, SEED_QR_CODES).filter(q => !obsoletePropIds.has(q.propertyId));
  const mergedQRs = [...rawQRs];
  SEED_QR_CODES.forEach((sq) => {
    if (!mergedQRs.some((q) => q.id === sq.id)) {
      mergedQRs.push(sq);
    }
  });

  const rawUsers = read<UserProfile[]>(STORAGE_KEYS.USERS, SEED_STAFF_USERS).filter(u => !obsoletePropIds.has(u.propertyId) || u.role === 'admin');
  const mergedUsers = [...rawUsers];
  SEED_STAFF_USERS.forEach((seedUser) => {
    const idx = mergedUsers.findIndex((u) => u.id === seedUser.id);
    if (idx === -1) {
      mergedUsers.push(seedUser);
    } else {
      mergedUsers[idx] = { 
        ...mergedUsers[idx], 
        ...seedUser,
        pinCode: seedUser.pinCode || '1234'
      };
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
  persist(STORAGE_KEYS.USERS, mergedUsers);
  persist(STORAGE_KEYS.DINING, mergedDining);
  persist(STORAGE_KEYS.REQUESTS, mergedRequests);

  const rawCurrentUser = read(STORAGE_KEYS.CURRENT_USER, SEED_STAFF_USERS[0]);
  const activeUser = mergedUsers.find(u => u.id === rawCurrentUser?.id) || SEED_STAFF_USERS[0];
  persist(STORAGE_KEYS.CURRENT_USER, activeUser);

  return {
    properties: mergedProps,
    rooms: mergedRooms,
    qrCodes: mergedQRs,
    users: mergedUsers,
    requests: mergedRequests,
    dining: mergedDining,
    currentUser: activeUser,
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

// Attach live Firestore real-time listener for Requests
let isFirestoreListening = false;
export function initFirestoreListeners() {
  if (isFirestoreListening || typeof window === 'undefined') return;
  isFirestoreListening = true;

  const obsoletePropIds = new Set(['prop_zambezi_01', 'prop_luangwa_02']);

  try {
    const requestsCol = collection(db, 'requests');
    onSnapshot(requestsCol, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreList: ServiceRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ServiceRequest;
          if (data && !obsoletePropIds.has(data.propertyId)) {
            firestoreList.push(data);
          }
        });

        // Merge with cache, sorting by newest first
        firestoreList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        cache = {
          ...cache,
          requests: firestoreList,
        };
        persist(STORAGE_KEYS.REQUESTS, cache.requests);
        notify();
      }
    }, (err) => {
      console.warn('Firestore live requests listener warning (using resilient local cache):', err);
    });

    const roomsCol = collection(db, 'rooms');
    onSnapshot(roomsCol, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreRooms: Room[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Room;
          if (data && !obsoletePropIds.has(data.propertyId)) {
            firestoreRooms.push(data);
          }
        });
        cache = {
          ...cache,
          rooms: firestoreRooms,
        };
        persist(STORAGE_KEYS.ROOMS, cache.rooms);
        notify();
      }
    }, (err) => {
      console.warn('Firestore live rooms listener warning:', err);
    });

    const qrCol = collection(db, 'qrCodes');
    onSnapshot(qrCol, (snapshot) => {
      if (!snapshot.empty) {
        const firestoreQRs: QRCodeRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as QRCodeRecord;
          if (data && !obsoletePropIds.has(data.propertyId)) {
            firestoreQRs.push(data);
          }
        });
        cache = {
          ...cache,
          qrCodes: firestoreQRs,
        };
        persist(STORAGE_KEYS.QR_CODES, cache.qrCodes);
        notify();
      }
    }, (err) => {
      console.warn('Firestore live qrCodes listener warning:', err);
    });

    const propsCol = collection(db, 'properties');
    onSnapshot(propsCol, (snapshot) => {
      if (!snapshot.empty) {
        const list: Property[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Property;
          if (data && !obsoletePropIds.has(data.id)) {
            list.push(data);
          }
        });
        cache = { ...cache, properties: list };
        persist(STORAGE_KEYS.PROPERTIES, cache.properties);
        notify();
      }
    }, (err) => {
      console.warn('Firestore live properties listener note:', err);
    });

    const usersCol = collection(db, 'users');
    onSnapshot(usersCol, (snapshot) => {
      if (!snapshot.empty) {
        const list: UserProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserProfile;
          if (data && (!obsoletePropIds.has(data.propertyId) || data.role === 'admin')) {
            list.push(data);
          }
        });
        cache = { ...cache, users: list };
        persist(STORAGE_KEYS.USERS, cache.users);
        notify();
      }
    }, (err) => {
      console.warn('Firestore live users listener note:', err);
    });

    const diningCol = collection(db, 'dining');
    onSnapshot(diningCol, (snapshot) => {
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
    }, (err) => {
      console.warn('Firestore live dining listener note:', err);
    });

    // Also seed Firestore initial data in background if empty or needs cleanup
    seedFirestoreInitialData();
  } catch (err) {
    console.warn('Could not initialize Firestore listener:', err);
  }
}

async function seedFirestoreInitialData() {
  const SEED_VERSION_KEY = 'hospitally_cloud_seeded_rocks_v3';
  if (typeof window !== 'undefined' && localStorage.getItem(SEED_VERSION_KEY)) {
    return;
  }
  try {
    // Purge obsolete Zambezi / Luangwa docs from Firestore
    const obsoleteDocs = [
      { col: 'properties', id: 'prop_zambezi_01' },
      { col: 'properties', id: 'prop_luangwa_02' },
      { col: 'rooms', id: 'room_101' },
      { col: 'rooms', id: 'room_102' },
      { col: 'rooms', id: 'room_201' },
      { col: 'rooms', id: 'room_204' },
      { col: 'rooms', id: 'room_301' },
      { col: 'rooms', id: 'room_302' },
      { col: 'qrCodes', id: 'qr_101' },
      { col: 'qrCodes', id: 'qr_204' },
      { col: 'qrCodes', id: 'qr_pool' },
      { col: 'qrCodes', id: 'qr_luangwa_301' },
      { col: 'dining', id: 'dine_1' },
      { col: 'dining', id: 'dine_2' },
      { col: 'dining', id: 'dine_3' },
      { col: 'dining', id: 'dine_4' },
      { col: 'dining', id: 'dine_rocks_5' },
      { col: 'requests', id: 'req_001' },
      { col: 'requests', id: 'req_002' },
      { col: 'requests', id: 'req_003' },
      { col: 'users', id: 'staff_kondwani' },
      { col: 'users', id: 'staff_mary' },
      { col: 'users', id: 'staff_james' },
      { col: 'users', id: 'staff_chileshe' },
    ];

    for (const item of obsoleteDocs) {
      try {
        await deleteDoc(doc(db, item.col, item.id));
      } catch (delErr) {
        // Silently skip if doesn't exist or unpermitted
      }
    }

    // Seed Rocks Apartments properties
    for (const p of SEED_PROPERTIES) {
      await setDoc(doc(db, 'properties', p.id), p, { merge: true });
    }
    // Seed rooms
    for (const r of SEED_ROOMS) {
      await setDoc(doc(db, 'rooms', r.id), r, { merge: true });
    }
    // Seed QR codes
    for (const q of SEED_QR_CODES) {
      await setDoc(doc(db, 'qrCodes', q.id), q, { merge: true });
    }
    // Seed Dining
    for (const d of SEED_DINING_ITEMS) {
      await setDoc(doc(db, 'dining', d.id), d, { merge: true });
    }
    // Seed Users (including Joe Zaza & Founder)
    for (const u of SEED_STAFF_USERS) {
      await setDoc(doc(db, 'users', u.id), u, { merge: true });
    }
    // Seed Requests
    for (const req of INITIAL_REQUESTS) {
      await setDoc(doc(db, 'requests', req.id), req, { merge: true });
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(SEED_VERSION_KEY, 'true');
    }
    console.log('Firebase Firestore successfully synced with Rocks Apartments pilot data');
  } catch (e) {
    console.info('Firestore seed note:', e);
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
      pinCode: string;
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
      email: managerData.email,
      phone: managerData.phone || '+260 97 000 0000',
      pinCode: managerData.pinCode || '1234',
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
    persist(STORAGE_KEYS.USERS, cache.users);
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
  addRoom: (propertyId: string, roomNumber: string, roomType: string): { room: Room; qrCode: QRCodeRecord } => {
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
    const newRoom: Room = {
      id: roomId,
      propertyId,
      roomNumber,
      roomType,
      status: 'available',
      createdAt: now,
      updatedAt: now,
    };

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
  addRoomWithQR: (propertyId: string, roomNumber: string, roomType: string): { room: Room; qrCode: QRCodeRecord } => {
    return dbService.addRoom(propertyId, roomNumber, roomType);
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
    const updated = cache.rooms.map((r) => {
      if (r.id === roomId) {
        updatedRoom = {
          ...r,
          status: 'occupied' as const,
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
          currentGuestName: null,
          guestCheckOutDate: null,
          guestPhone: null,
          updatedAt: now,
        };
        setDoc(doc(db, 'rooms', roomId), patch, { merge: true }).catch((err) => {
          console.warn('Firestore setDoc room check-out notice:', err);
        });
      } catch (err) {
        console.warn('Firestore setDoc room check-out failed:', err);
      }
    }

    return updatedRoom;
  },

  // QR Codes - stable snapshot
  getQRCodeByToken: (token: string): QRCodeRecord | undefined => {
    return cache.qrCodes.find((q) => q.token === token && q.status === 'active');
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

  // Users & Staff - stable snapshot
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
      name: string;
      email: string;
      phone?: string;
      role?: 'staff' | 'manager';
      department: StaffDepartment;
      pinCode: string;
    }
  ): UserProfile => {
    const staffId = `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const newStaff: UserProfile = {
      id: staffId,
      propertyId,
      name: staffData.name,
      email: staffData.email,
      phone: staffData.phone || '',
      role: staffData.role || 'staff',
      department: staffData.department,
      pinCode: staffData.pinCode || '1234',
      active: true,
      createdAt: now,
      updatedAt: now,
    };

    cache = {
      ...cache,
      users: [...cache.users, newStaff],
    };
    persist(STORAGE_KEYS.USERS, cache.users);
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
  deleteStaffMember: (userId: string): boolean => {
    cache = {
      ...cache,
      users: cache.users.filter((u) => u.id !== userId),
    };
    persist(STORAGE_KEYS.USERS, cache.users);
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
    cache = {
      ...cache,
      users: [...cache.users.filter((u) => u.id !== user.id), user],
    };
    persist(STORAGE_KEYS.USERS, cache.users);
    notify();

    try {
      setDoc(doc(db, 'users', user.id), user).catch((err) =>
        console.warn('Firestore setDoc user notice:', err)
      );
    } catch (err) {
      console.warn('Firestore setDoc user failed:', err);
    }
    return user;
  },
  updateUserProfile: (userId: string, patch: Partial<UserProfile>): UserProfile | undefined => {
    let updatedUser: UserProfile | undefined;
    cache = {
      ...cache,
      users: cache.users.map((u) => {
        if (u.id === userId) {
          updatedUser = { ...u, ...patch, updatedAt: new Date().toISOString() };
          return updatedUser;
        }
        return u;
      }),
    };
    persist(STORAGE_KEYS.USERS, cache.users);
    notify();

    if (updatedUser) {
      try {
        updateDoc(doc(db, 'users', userId), patch as any).catch((err) =>
          console.warn('Firestore updateDoc user notice:', err)
        );
      } catch (err) {
        console.warn('Firestore updateDoc user failed:', err);
      }
    }
    return updatedUser;
  },
  getCurrentUser: (): UserProfile | null => {
    return cache.currentUser;
  },
  setCurrentUser: (user: UserProfile | null): void => {
    cache = {
      ...cache,
      currentUser: user,
    };
    persist(STORAGE_KEYS.CURRENT_USER, cache.currentUser);
    notify();
  },

  // Reset demo data
  resetDemoData: () => {
    cache = {
      properties: SEED_PROPERTIES,
      rooms: SEED_ROOMS,
      qrCodes: SEED_QR_CODES,
      users: SEED_STAFF_USERS,
      requests: INITIAL_REQUESTS,
      dining: SEED_DINING_ITEMS,
      currentUser: SEED_STAFF_USERS[0],
    };
    persist(STORAGE_KEYS.PROPERTIES, cache.properties);
    persist(STORAGE_KEYS.ROOMS, cache.rooms);
    persist(STORAGE_KEYS.QR_CODES, cache.qrCodes);
    persist(STORAGE_KEYS.USERS, cache.users);
    persist(STORAGE_KEYS.REQUESTS, cache.requests);
    persist(STORAGE_KEYS.DINING, cache.dining);
    persist(STORAGE_KEYS.CURRENT_USER, cache.currentUser);
    notify();

    // Re-seed to firestore
    seedFirestoreInitialData();
  }
};
