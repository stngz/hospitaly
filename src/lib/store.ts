import {
  Property,
  Room,
  Stay,
  QRCodeRecord,
  ServiceRequest,
  RequestStatus,
  DeliveryPreference,
  UserProfile,
  DiningItem,
  StaffDeviceRecord,
  UserNotificationSettings,
  MediaItem,
  ActivityLogEntry,
  HouseGuideConfig,
  StaffDepartment,
  Lead,
} from '../types';
import {
  ROCKS_APARTMENTS_PROPERTY,
  DEFAULT_HOUSE_GUIDE,
} from './seeds/rocksApartments';
import { DEFAULT_SUSPEND_MESSAGE, PUSH_ENABLED } from './config';
import { notificationService } from './notifications';
import { db, auth } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';

export const DEFAULT_HOUSE_AMENITIES: string[] = [
  'Private Pool',
  'Full Kitchen',
  'Unit AC',
  'High-Speed Wi-Fi',
];

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = stripUndefined(val);
      }
    }
    return cleaned as T;
  }
  return value;
}

export function generateStayId(): string {
  const timePart = Date.now().toString(36).toUpperCase();
  const randPart = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `stay_${timePart}_${randPart}`;
}

export function generateUniqueQRToken(propertyName: string, roomNumber: string): string {
  const cleanProp = propertyName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8) || 'PROP';
  const cleanRoom = roomNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'UNIT';
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanProp}-${cleanRoom}-${suffix}`;
}

export function normalizeUserProfile(raw: Partial<UserProfile>, docId: string): UserProfile {
  const role =
    raw.role === 'founder' || raw.role === 'manager' || raw.role === 'staff'
      ? raw.role
      : 'staff';

  const department: StaffDepartment =
    raw.department === 'reception' ||
    raw.department === 'housekeeping' ||
    raw.department === 'maintenance' ||
    raw.department === 'concierge' ||
    raw.department === 'pool_garden' ||
    raw.department === 'management'
      ? raw.department
      : role === 'founder' || role === 'manager'
      ? 'management'
      : 'housekeeping';

  return {
    id: raw.id || docId,
    propertyId: raw.propertyId ?? (role === 'founder' ? '' : 'prop_rocks_lusaka'),
    name: raw.name || (raw.email ? raw.email.split('@')[0] : 'Staff Member'),
    email: (raw.email || '').trim(),
    phone: raw.phone || '',
    role,
    department,
    active: typeof raw.active === 'boolean' ? raw.active : true,
    photoId: raw.photoId,
    notificationSettings: raw.notificationSettings,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt,
  };
}

interface AppDatabase {
  properties: Property[];
  rooms: Room[];
  stays: Stay[];
  qrCodes: QRCodeRecord[];
  requests: ServiceRequest[];
  users: UserProfile[];
  media: MediaItem[];
  activity: ActivityLogEntry[];
  diningItems: DiningItem[];
  leads: Lead[];
}

const DEFAULT_DB: AppDatabase = {
  properties: [],
  rooms: [],
  stays: [],
  qrCodes: [],
  requests: [],
  users: [],
  media: [],
  activity: [],
  diningItems: [],
  leads: [],
};

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedDb: AppDatabase = DEFAULT_DB;
let cachedActiveRooms: Room[] = DEFAULT_DB.rooms.filter((r) => !r.archived);
let cachedSortedRequests: ServiceRequest[] = [];
let cachedActivityLog: ActivityLogEntry[] = [];

function refreshDerivedCaches() {
  cachedActiveRooms = cachedDb.rooms.filter((r) => !r.archived);
  cachedSortedRequests = [...cachedDb.requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  cachedActivityLog = cachedDb.activity.slice(0, 50);
}

// HOTFIX (guest access): the app used to save the whole database in localStorage on every
// device and load it back on start. Phones then showed old rooms/stays (e.g. "Thanks for
// staying with us" after a new check-in) until refreshed several times, and staff phones kept
// guest data after sign-out. The local copy is now ONLY used when automated tests inject
// seed data (window.__HOSPITALLY_INITIAL_DATA__). Real devices always read live Firestore,
// and any old copy is deleted.
const USE_LOCAL_TEST_CACHE =
  typeof window !== 'undefined' && Boolean((window as any).__HOSPITALLY_INITIAL_DATA__);

if (typeof window !== 'undefined' && !USE_LOCAL_TEST_CACHE) {
  try {
    localStorage.removeItem('hospitally_seed_data');
  } catch {}
}

if (typeof window !== 'undefined' && USE_LOCAL_TEST_CACHE) {
  try {
    const raw =
      localStorage.getItem('hospitally_seed_data') ||
      (window as any).__HOSPITALLY_INITIAL_DATA__;
    if (raw) {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (parsed.properties) cachedDb.properties = parsed.properties;
      else if (parsed.property) cachedDb.properties = [parsed.property];
      if (parsed.rooms) cachedDb.rooms = parsed.rooms;
      if (parsed.stays) cachedDb.stays = parsed.stays;
      if (parsed.qrCodes) cachedDb.qrCodes = parsed.qrCodes;
      if (parsed.users) cachedDb.users = parsed.users;
      if (parsed.requests) {
        cachedDb.requests = parsed.requests.map((r: any) => ({
          ...r,
          category: r.category || r.department || 'general',
          title: r.title || 'Service request',
          roomNumber: r.roomNumber || 'House',
        }));
      }
      refreshDerivedCaches();
    }
  } catch {}

  window.addEventListener('storage', (event) => {
    if (event.key === 'hospitally_seed_data' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed.properties) cachedDb.properties = parsed.properties;
        else if (parsed.property) cachedDb.properties = [parsed.property];
        if (parsed.rooms) cachedDb.rooms = parsed.rooms;
        if (parsed.stays) cachedDb.stays = parsed.stays;
        if (parsed.qrCodes) cachedDb.qrCodes = parsed.qrCodes;
        if (parsed.users) cachedDb.users = parsed.users;
        if (parsed.requests) {
          cachedDb.requests = parsed.requests.map((r: any) => ({
            ...r,
            category: r.category || r.department || 'general',
            title: r.title || 'Service request',
            roomNumber: r.roomNumber || 'House',
          }));
        }
        refreshDerivedCaches();
        listeners.forEach((listener) => listener());
      } catch {}
    }
  });
}

let firestoreInitialized = false;
let firestoreReady = false;
let publicListenersActive = false;
let staffListenersActive = false;
let activeGuestStayListenerId: string | null = null;
let guestRequestsUnsub: (() => void) | null = null;
let activeGuestRoomId: string | null = null;
let guestRoomUnsub: (() => void) | null = null;
let guestStayDocUnsub: (() => void) | null = null;
const activeUnsubscribers: Array<() => void> = [];

function notifyListeners() {
  refreshDerivedCaches();
  if (typeof window !== 'undefined' && USE_LOCAL_TEST_CACHE) {
    try {
      localStorage.setItem('hospitally_seed_data', JSON.stringify(cachedDb));
    } catch {}
  }
  listeners.forEach((listener) => listener());
}

export function isFirestoreReady(): boolean {
  return firestoreReady;
}

async function persistDoc<T extends { id?: string }>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  try {
    const cleanData = stripUndefined({ ...data, id: docId });
    await setDoc(doc(db, collectionName, docId), cleanData, { merge: true });
  } catch (err: any) {
    console.warn(`Firestore write failed for ${collectionName}/${docId}:`, err);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('hospitally-write-error', {
          detail: {
            collection: collectionName,
            docId,
            error: err?.message || String(err),
          },
        })
      );
    }
  }
}

function recordActivityInternal(
  entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>
): ActivityLogEntry {
  const newEntry: ActivityLogEntry = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  cachedDb = {
    ...cachedDb,
    activity: [newEntry, ...cachedDb.activity].slice(0, 100),
  };
  notifyListeners();
  void persistDoc('activity', newEntry.id, newEntry);
  return newEntry;
}

/**
 * Subscribe to requests for a single guest stay (`where('stayId', '==', stayId)`).
 * Works for anonymous guests because Firestore rules allow reading requests matching their stayId.
 */
export function subscribeGuestStayRequests(stayId: string | null | undefined): void {
  const cleanStayId = (stayId || '').trim();
  if (!cleanStayId || !auth.currentUser) {
    if (guestRequestsUnsub) {
      guestRequestsUnsub();
      guestRequestsUnsub = null;
    }
    activeGuestStayListenerId = null;
    return;
  }
  if (activeGuestStayListenerId === cleanStayId && guestRequestsUnsub) {
    return;
  }
  if (guestRequestsUnsub) {
    guestRequestsUnsub();
    guestRequestsUnsub = null;
  }
  activeGuestStayListenerId = cleanStayId;
  // Anonymous guests may only list their own requests (rule: guestUid == auth.uid),
  // so the query must filter on guestUid. Staff/founder previews use stayId only.
  const currentUser = auth.currentUser;
  const q = currentUser.isAnonymous
    ? query(
        collection(db, 'requests'),
        where('guestUid', '==', currentUser.uid),
        where('stayId', '==', cleanStayId),
        limit(50)
      )
    : query(collection(db, 'requests'), where('stayId', '==', cleanStayId), limit(50));
  guestRequestsUnsub = onSnapshot(
    q,
    (snapshot) => {
      const stayReqs = snapshot.docs
        .map((d) => ({ ...(d.data() as ServiceRequest), id: d.id }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // If stay requests haven't changed, do not notify listeners
      const existingStayReqs = cachedDb.requests.filter((r) => r.stayId === cleanStayId);
      if (
        existingStayReqs.length === stayReqs.length &&
        existingStayReqs.every((r, i) => r.id === stayReqs[i].id && r.status === stayReqs[i].status && r.updatedAt === stayReqs[i].updatedAt)
      ) {
        return;
      }

      // Merge with any other requests in cachedDb
      const otherReqs = cachedDb.requests.filter((r) => r.stayId !== cleanStayId);
      cachedDb = {
        ...cachedDb,
        requests: [...stayReqs, ...otherReqs],
      };
      notifyListeners();
    },
    (err) => {
      console.warn('Guest stay requests listener error:', err);
    }
  );
}

/**
 * Subscribe to a specific house and its active stay document for guest view.
 * Allows guest view to function seamlessly without requiring unrestricted collection enumeration.
 */
export function subscribeGuestRoom(roomId: string | null | undefined): void {
  const cleanRoomId = (roomId || '').trim();
  if (!cleanRoomId || !auth.currentUser) {
    if (guestRoomUnsub) {
      guestRoomUnsub();
      guestRoomUnsub = null;
    }
    if (guestStayDocUnsub) {
      guestStayDocUnsub();
      guestStayDocUnsub = null;
    }
    activeGuestRoomId = null;
    return;
  }
  if (activeGuestRoomId === cleanRoomId && guestRoomUnsub) {
    return;
  }
  if (guestRoomUnsub) {
    guestRoomUnsub();
    guestRoomUnsub = null;
  }
  if (guestStayDocUnsub) {
    guestStayDocUnsub();
    guestStayDocUnsub = null;
  }
  activeGuestRoomId = cleanRoomId;

  guestRoomUnsub = onSnapshot(
    doc(db, 'rooms', cleanRoomId),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Room;
        const room: Room = {
          ...data,
          id: snap.id,
          roomNumber: data.name || data.roomNumber || snap.id,
          name: data.name || data.roomNumber || snap.id,
          roomType: data.houseType || data.roomType || 'Apartment',
          houseType: data.houseType || data.roomType || 'Apartment',
        };
        const existingRoom = cachedDb.rooms.find((r) => r.id === cleanRoomId);
        const roomChanged =
          !existingRoom ||
          existingRoom.status !== room.status ||
          existingRoom.activeStayId !== room.activeStayId ||
          existingRoom.updatedAt !== room.updatedAt ||
          existingRoom.name !== room.name;

        if (roomChanged) {
          const otherRooms = cachedDb.rooms.filter((r) => r.id !== cleanRoomId);
          cachedDb = { ...cachedDb, rooms: [room, ...otherRooms] };
          firestoreReady = true;
          notifyListeners();
        }

        if (room.activeStayId) {
          if (guestStayDocUnsub) guestStayDocUnsub();
          guestStayDocUnsub = onSnapshot(
            doc(db, 'stays', room.activeStayId),
            (staySnap) => {
              if (staySnap.exists()) {
                const stay = { ...(staySnap.data() as Stay), id: staySnap.id };
                const existingStay = cachedDb.stays.find((s) => s.id === stay.id);
                if (!existingStay || existingStay.status !== stay.status || existingStay.checkOutAt !== stay.checkOutAt) {
                  const otherStays = cachedDb.stays.filter((s) => s.id !== stay.id);
                  cachedDb = { ...cachedDb, stays: [stay, ...otherStays] };
                  notifyListeners();
                }
              }
            },
            (err) => console.warn('Guest stay listener error:', err)
          );
        }
      }
    },
    (err) => console.warn('Guest room listener error:', err)
  );
}

/**
 * HOTFIX (guest access): give a guest who scanned a QR card permission to read their house.
 * - Nobody signed in  -> sign in anonymously (Anonymous sign-in is enabled in Firebase).
 * - Anonymous guest   -> write guestSessions/{uid} = { token, roomId, propertyId }.
 *                        Firestore rules check the token is a real active card for that room.
 * - Staff / founder   -> do nothing; never sign them out or replace their session.
 * Then start listening to the house document so the guest screen gets live data.
 */
export async function ensureGuestAccess(
  token: string,
  roomId: string,
  propertyId: string
): Promise<void> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  const user = auth.currentUser;
  if (user && user.isAnonymous) {
    await setDoc(doc(db, 'guestSessions', user.uid), {
      token,
      roomId,
      propertyId,
      createdAt: new Date().toISOString(),
    });
  }
  subscribeGuestRoom(roomId);
}

/**
 * Session setters called exclusively by DataSession manager.
 */
export function setSessionProperties(properties: Property[]): void {
  cachedDb = { ...cachedDb, properties };
  firestoreReady = true;
  notifyListeners();
}

export function setSessionProperty(property: Property): void {
  const otherProps = cachedDb.properties.filter((p) => p.id !== property.id);
  cachedDb = { ...cachedDb, properties: [property, ...otherProps] };
  firestoreReady = true;
  notifyListeners();
}

export function setSessionRooms(rooms: Room[]): void {
  cachedDb = { ...cachedDb, rooms };
  firestoreReady = true;
  notifyListeners();
}

export function setSessionStays(stays: Stay[]): void {
  cachedDb = { ...cachedDb, stays };
  notifyListeners();
}

export function setSessionQRCodes(qrCodes: QRCodeRecord[]): void {
  cachedDb = { ...cachedDb, qrCodes };
  firestoreReady = true;
  notifyListeners();
}

export function setSessionRequests(requests: ServiceRequest[]): void {
  cachedDb = { ...cachedDb, requests };
  refreshDerivedCaches();
  notifyListeners();
}

export function setSessionUsers(users: UserProfile[]): void {
  cachedDb = { ...cachedDb, users };
  notifyListeners();
}

export function setSessionActivity(activity: ActivityLogEntry[]): void {
  cachedDb = { ...cachedDb, activity };
  refreshDerivedCaches();
  notifyListeners();
}

export function setSessionDining(diningItems: DiningItem[]): void {
  cachedDb = { ...cachedDb, diningItems };
  notifyListeners();
}

export function setSessionLeads(leads: Lead[]): void {
  cachedDb = { ...cachedDb, leads };
  notifyListeners();
}

export function clearStoreCache(): void {
  cachedDb = {
    properties: [],
    rooms: [],
    stays: [],
    qrCodes: [],
    requests: [],
    users: [],
    media: [],
    activity: [],
    diningItems: [],
    leads: [],
  };
  refreshDerivedCaches();
  listeners.forEach((listener) => listener());
}

export function resetToSeedDataIfAvailable(): void {
  if (typeof window !== 'undefined' && USE_LOCAL_TEST_CACHE) {
    try {
      const raw =
        localStorage.getItem('hospitally_seed_data') ||
        (window as any).__HOSPITALLY_INITIAL_DATA__;
      if (raw) {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed.properties) cachedDb.properties = parsed.properties;
        else if (parsed.property) cachedDb.properties = [parsed.property];
        if (parsed.rooms) cachedDb.rooms = parsed.rooms;
        if (parsed.stays) cachedDb.stays = parsed.stays;
        if (parsed.qrCodes) cachedDb.qrCodes = parsed.qrCodes;
        if (parsed.users) cachedDb.users = parsed.users;
        if (parsed.requests) {
          cachedDb.requests = parsed.requests.map((r: any) => ({
            ...r,
            category: r.category || r.department || 'general',
            title: r.title || 'Service request',
            roomNumber: r.roomNumber || 'House',
          }));
        }
        if (parsed.leads) cachedDb.leads = parsed.leads;
        if (parsed.activity) cachedDb.activity = parsed.activity;
        refreshDerivedCaches();
        listeners.forEach((listener) => listener());
      }
    } catch {}
  }
}

/**
 * Deprecated: Data listeners are now managed strictly via dataSession.startSession(profile)
 */
export function initFirestoreListeners(): void {}
export function startAuthenticatedListeners(): void {}

// Referential stability constants for useSyncExternalStore selectors
const STABLE_EMPTY_PROPERTIES: Property[] = [];
const STABLE_EMPTY_ROOMS: Room[] = [];
const STABLE_EMPTY_STAYS: Stay[] = [];
const STABLE_EMPTY_QRCODES: QRCodeRecord[] = [];
const STABLE_EMPTY_USERS: UserProfile[] = [];

let cachedUnarchivedRooms: Room[] = STABLE_EMPTY_ROOMS;
let lastUnarchivedSource: Room[] | null = null;

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const dbService = {
  // --- PROPERTIES ---
  getProperties: (): Property[] => {
    if (cachedDb.properties && cachedDb.properties.length > 0) {
      return cachedDb.properties;
    }
    if (typeof window !== 'undefined' && (window as any).__HOSPITALLY_INITIAL_DATA__?.properties?.length) {
      return (window as any).__HOSPITALLY_INITIAL_DATA__.properties;
    }
    return STABLE_EMPTY_PROPERTIES;
  },

  getPropertyBySlug: (slug: string): Property | undefined => {
    const list = dbService.getProperties();
    return list.find((p) => p.slug === slug);
  },

  getPropertyById: (id: string): Property | undefined => {
    const list = dbService.getProperties();
    return list.find((p) => p.id === id);
  },

  getOrFetchPropertyById: async (propertyId: string): Promise<Property | undefined> => {
    const cleanId = propertyId.trim();
    if (!cleanId) return undefined;
    const local = cachedDb.properties.find((p) => p.id === cleanId);
    if (local) return local;
    try {
      const snap = await getDoc(doc(db, 'properties', cleanId));
      if (snap.exists()) {
        const prop = { ...(snap.data() as Property), id: snap.id };
        const other = cachedDb.properties.filter((p) => p.id !== snap.id);
        cachedDb = { ...cachedDb, properties: [...other, prop] };
        notifyListeners();
        return prop;
      }
    } catch (err) {
      console.warn('Failed to fetch property document:', err);
    }
    return undefined;
  },

  updatePropertySettings: (
    propertyId: string,
    updates: Partial<
      Pick<
        Property,
        | 'name'
        | 'city'
        | 'timezone'
        | 'contactPhone'
        | 'whatsappPhone'
        | 'checkInTime'
        | 'checkOutTime'
        | 'coverImageId'
        | 'coverImageUrl'
        | 'wifiName'
        | 'wifiPassword'
        | 'houseGuide'
      >
    >,
    actor?: { name: string; email?: string }
  ): void => {
    const nowIso = new Date().toISOString();
    const updatedProps = cachedDb.properties.map((p) => {
      if (p.id !== propertyId) return p;
      const updated: Property = {
        ...p,
        ...updates,
        updatedAt: nowIso,
      };
      void persistDoc('properties', p.id, updated);
      return updated;
    });
    cachedDb = { ...cachedDb, properties: updatedProps };
    notifyListeners();
    if (actor) {
      recordActivityInternal({
        propertyId,
        type: 'house_update',
        actorName: actor.name,
        actorEmail: actor.email,
        summary: `Updated property settings for ${updates.name || propertyId}`,
      });
    }
  },

  setPropertyStatus: (
    propertyId: string,
    nextStatus: 'active' | 'suspended',
    options?: {
      actorEmail?: string;
      actorName?: string;
      suspendMessage?: string;
    }
  ): void => {
    const nowIso = new Date().toISOString();
    const updatedProperties = cachedDb.properties.map((p) => {
      if (p.id !== propertyId) return p;
      const defaultMsg = p.contactPhone
        ? `We're not taking requests through the app right now. Please contact reception: ${p.contactPhone}`
        : DEFAULT_SUSPEND_MESSAGE;
      const updated: Property = {
        ...p,
        status: nextStatus,
        suspendedAt: nextStatus === 'suspended' ? nowIso : undefined,
        suspendedBy:
          nextStatus === 'suspended'
            ? options?.actorEmail || options?.actorName || 'Founder'
            : undefined,
        suspendMessage:
          nextStatus === 'suspended'
            ? (options?.suspendMessage || '').trim() || defaultMsg
            : undefined,
        updatedAt: nowIso,
      };
      void persistDoc('properties', p.id, updated);
      return updated;
    });

    cachedDb = { ...cachedDb, properties: updatedProperties };
    notifyListeners();

    const propName =
      cachedDb.properties.find((p) => p.id === propertyId)?.name || propertyId;
    recordActivityInternal({
      propertyId,
      type: nextStatus === 'suspended' ? 'suspend' : 'resume',
      actorName: options?.actorName || options?.actorEmail || 'Founder',
      actorEmail: options?.actorEmail,
      summary:
        nextStatus === 'suspended'
          ? `Paused ${propName}`
          : `Resumed ${propName}`,
    });
  },

  togglePropertyStatus: (
    propertyId: string,
    actorEmail?: string,
    suspendMessage?: string
  ): void => {
    const prop = cachedDb.properties.find((p) => p.id === propertyId);
    const nextStatus: 'active' | 'suspended' =
      prop?.status === 'active' ? 'suspended' : 'active';
    dbService.setPropertyStatus(propertyId, nextStatus, {
      actorEmail,
      actorName: actorEmail || 'Founder',
      suspendMessage,
    });
  },

  createPropertyWithManager: (
    propInput: {
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
    managerInput: {
      name: string;
      email: string;
      phone?: string;
    }
  ): { property: Property; manager: UserProfile } => {
    const slug = propInput.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const propId = `prop_${slug.replace(/-/g, '_')}_${Date.now().toString().slice(-4)}`;

    const newProperty: Property = {
      id: propId,
      name: propInput.name,
      slug,
      city: propInput.city,
      country: 'Zambia',
      timezone: 'Africa/Lusaka',
      currency: propInput.currency || 'ZMW',
      primaryColor: propInput.primaryColor || '#1D2426',
      secondaryColor: propInput.secondaryColor || '#F3EBE3',
      accentColor: propInput.accentColor || '#2F7F86',
      coverImageUrl: '/images/rocks-suite-enhanced.jpg',
      wifiName: propInput.wifiName || `${propInput.name.split(' ')[0]}_Guest`,
      wifiPassword: propInput.wifiPassword || 'Welcome2026!',
      description: propInput.description || `Luxury hospitality at ${propInput.name}.`,
      contactPhone: propInput.contactPhone || '+260 97 000 0100',
      whatsappPhone: propInput.contactPhone || '+260 97 000 0100',
      checkInTime: '14:00',
      checkOutTime: '11:00',
      unitLabel: 'House',
      status: 'active',
      houseGuide: DEFAULT_HOUSE_GUIDE,
      createdAt: new Date().toISOString(),
    };

    const newManager: UserProfile = {
      id: `mgr_${Date.now()}`,
      propertyId: propId,
      name: managerInput.name,
      email: managerInput.email.trim(),
      phone: managerInput.phone || '',
      role: 'manager',
      department: 'management',
      active: true,
      createdAt: new Date().toISOString(),
    };

    cachedDb = {
      ...cachedDb,
      properties: [...cachedDb.properties, newProperty],
      users: [...cachedDb.users, newManager],
    };
    notifyListeners();

    void persistDoc('properties', newProperty.id, newProperty);
    void persistDoc('users', newManager.id, newManager);

    recordActivityInternal({
      propertyId: propId,
      type: 'account_change',
      actorName: 'Founder',
      summary: `Onboarded property ${newProperty.name} with GM ${newManager.name}`,
    });

    return { property: newProperty, manager: newManager };
  },

  // --- ROOMS (HOUSES) & STAYS ---
  getAllRoomsIncludingArchived: (): Room[] => {
    if (cachedDb.rooms.length > 0) return cachedDb.rooms;
    if (typeof window !== 'undefined' && (window as any).__HOSPITALLY_INITIAL_DATA__?.rooms?.length) {
      return (window as any).__HOSPITALLY_INITIAL_DATA__.rooms;
    }
    return STABLE_EMPTY_ROOMS;
  },

  getAllRooms: (): Room[] => {
    const list = dbService.getAllRoomsIncludingArchived();
    if (list === lastUnarchivedSource) {
      return cachedUnarchivedRooms;
    }
    lastUnarchivedSource = list;
    cachedUnarchivedRooms = list.filter((r) => !r.archived);
    return cachedUnarchivedRooms;
  },

  getRoomsByProperty: (propertyId: string, includeArchived: boolean = false): Room[] => {
    const list = dbService.getAllRoomsIncludingArchived();
    return list.filter(
      (r) => r.propertyId === propertyId && (includeArchived || !r.archived)
    );
  },

  getRoomById: (roomId: string): Room | undefined => {
    const list = dbService.getAllRoomsIncludingArchived();
    return list.find((r) => r.id === roomId);
  },

  getAllStays: (): Stay[] => {
    if (cachedDb.stays.length > 0) return cachedDb.stays;
    if (typeof window !== 'undefined' && (window as any).__HOSPITALLY_INITIAL_DATA__?.stays?.length) {
      return (window as any).__HOSPITALLY_INITIAL_DATA__.stays;
    }
    return STABLE_EMPTY_STAYS;
  },

  getStaysByProperty: (propertyId: string): Stay[] => {
    const list = dbService.getAllStays();
    return list.filter((s) => s.propertyId === propertyId);
  },

  getStayById: (stayId?: string | null): Stay | undefined => {
    if (!stayId) return undefined;
    const list = dbService.getAllStays();
    return list.find((s) => s.id === stayId);
  },

  getAllQRCodes: (): QRCodeRecord[] => {
    if (cachedDb.qrCodes.length > 0) return cachedDb.qrCodes;
    if (typeof window !== 'undefined' && (window as any).__HOSPITALLY_INITIAL_DATA__?.qrCodes?.length) {
      return (window as any).__HOSPITALLY_INITIAL_DATA__.qrCodes;
    }
    return STABLE_EMPTY_QRCODES;
  },

  getQRByToken: (token: string): QRCodeRecord | undefined => {
    const clean = token.trim().toLowerCase();
    const list = dbService.getAllQRCodes();
    return list.find(
      (q) =>
        (q.token.toLowerCase() === clean || q.id.toLowerCase() === clean) &&
        q.status === 'active'
    );
  },

  getAnyQRByToken: (token: string): QRCodeRecord | undefined => {
    const clean = token.trim().toLowerCase();
    const list = dbService.getAllQRCodes();
    return list.find(
      (q) => q.token.toLowerCase() === clean || q.id.toLowerCase() === clean
    );
  },

  getOrFetchQRByToken: async (token: string): Promise<QRCodeRecord | undefined> => {
    const clean = token.trim();
    if (!clean) return undefined;
    const local = cachedDb.qrCodes.find(
      (q) => q.token.toLowerCase() === clean.toLowerCase() || q.id.toLowerCase() === clean.toLowerCase()
    );
    if (local) return local;
    try {
      const snap = await getDoc(doc(db, 'qrCodes', clean));
      if (snap.exists()) {
        const data = snap.data() as QRCodeRecord;
        const record: QRCodeRecord = { ...data, id: snap.id, token: data.token || snap.id };
        const other = cachedDb.qrCodes.filter((q) => q.id !== snap.id);
        cachedDb = { ...cachedDb, qrCodes: [...other, record] };
        notifyListeners();
        return record;
      }
    } catch (err) {
      console.warn('Failed to fetch qrCode document:', err);
    }
    return undefined;
  },

  addRoomWithQR: (
    propertyId: string,
    roomNumber: string,
    houseType: string,
    options?: {
      floor?: string;
      notes?: string;
      amenities?: string[];
      houseRules?: string;
      qrLabel?: string;
      wifiName?: string;
      wifiPassword?: string;
      imageId?: string;
    }
  ): { room: Room; qr: QRCodeRecord } => {
    const prop = cachedDb.properties.find((p) => p.id === propertyId);
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const token = generateUniqueQRToken(prop?.name || 'HOTEL', roomNumber);
    const cleanName = roomNumber.trim();
    const cleanLabel = (options?.qrLabel || cleanName).trim().toUpperCase().slice(0, 8);
    const cleanAmenities =
      options?.amenities && options.amenities.length > 0
        ? options.amenities
        : DEFAULT_HOUSE_AMENITIES;

    const newRoom: Room = {
      id: roomId,
      propertyId,
      name: cleanName,
      roomNumber: cleanName,
      roomType: houseType.trim(),
      houseType: houseType.trim(),
      floor: options?.floor,
      status: 'available',
      qrCodeId: token,
      qrToken: token,
      qrLabel: cleanLabel,
      amenities: cleanAmenities,
      houseRules: options?.houseRules,
      imageId: options?.imageId,
      wifiName: options?.wifiName?.trim() || undefined,
      wifiPassword: options?.wifiPassword?.trim() || undefined,
      notes: options?.notes,
      archived: false,
      createdAt: new Date().toISOString(),
    };

    const newQR: QRCodeRecord = {
      id: token,
      propertyId,
      roomId,
      token,
      status: 'active',
      createdAt: new Date().toISOString(),
      houseName: cleanName,
      houseType: houseType.trim(),
      wifiName: options?.wifiName?.trim() || undefined,
      wifiPassword: options?.wifiPassword?.trim() || undefined,
      imageId: options?.imageId,
    };

    cachedDb = {
      ...cachedDb,
      rooms: [...cachedDb.rooms, newRoom],
      qrCodes: [...cachedDb.qrCodes, newQR],
    };
    notifyListeners();

    void persistDoc('rooms', newRoom.id, newRoom);
    void persistDoc('qrCodes', token, newQR);

    return { room: newRoom, qr: newQR };
  },

  updateRoomDetails: (
    roomId: string,
    updates: Partial<
      Pick<
        Room,
        | 'name'
        | 'roomNumber'
        | 'roomType'
        | 'houseType'
        | 'amenities'
        | 'houseRules'
        | 'qrLabel'
        | 'notes'
        | 'wifiName'
        | 'wifiPassword'
        | 'imageId'
        | 'imageUrl'
        | 'archived'
      >
    >,
    actor?: { name: string; email?: string }
  ): void => {
    let targetPropId = 'prop_rocks_lusaka';
    const updatedRooms = cachedDb.rooms.map((r) => {
      if (r.id !== roomId) return r;
      targetPropId = r.propertyId;
      const cleanName = updates.name ?? updates.roomNumber ?? r.name ?? r.roomNumber;
      const cleanType = updates.houseType ?? updates.roomType ?? r.houseType ?? r.roomType;
      const cleanLabel =
        updates.qrLabel !== undefined
          ? updates.qrLabel.trim().toUpperCase().slice(0, 8)
          : r.qrLabel;
      const updated: Room = {
        ...r,
        ...updates,
        name: cleanName,
        roomNumber: cleanName,
        roomType: cleanType,
        houseType: cleanType,
        qrLabel: cleanLabel,
        updatedAt: new Date().toISOString(),
      };
      void persistDoc('rooms', r.id, updated);
      return updated;
    });

    cachedDb = { ...cachedDb, rooms: updatedRooms };
    notifyListeners();

    if (actor) {
      recordActivityInternal({
        propertyId: targetPropId,
        type: 'house_update',
        actorName: actor.name,
        actorEmail: actor.email,
        summary: `Updated house details for ${updates.name || updates.roomNumber || roomId}`,
      });
    }
  },

  regenerateRoomQRToken: (roomId: string): QRCodeRecord | null => {
    const room = cachedDb.rooms.find((r) => r.id === roomId);
    if (!room) return null;
    const prop = cachedDb.properties.find((p) => p.id === room.propertyId);
    const token = generateUniqueQRToken(prop?.name || 'ROCKS', room.roomNumber);
    const now = new Date().toISOString();

    const updatedQRs = cachedDb.qrCodes.map((q) => {
      if (q.roomId === roomId && q.status === 'active') {
        const deactivated: QRCodeRecord = { ...q, status: 'revoked', updatedAt: now };
        void persistDoc('qrCodes', q.id, deactivated);
        return deactivated;
      }
      return q;
    });

    const newQR: QRCodeRecord = {
      id: token,
      propertyId: room.propertyId,
      roomId: room.id,
      token,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const updatedRooms = cachedDb.rooms.map((r) => {
      if (r.id === roomId) {
        const updatedRoom: Room = {
          ...r,
          qrCodeId: token,
          qrToken: token,
          updatedAt: now,
        };
        void persistDoc('rooms', r.id, updatedRoom);
        return updatedRoom;
      }
      return r;
    });

    cachedDb = {
      ...cachedDb,
      rooms: updatedRooms,
      qrCodes: [...updatedQRs, newQR],
    };
    notifyListeners();

    void persistDoc('qrCodes', newQR.id, newQR);
    return newQR;
  },

  /**
   * Check-in creates a fresh random Stay document (`stay_${random}`) every time.
   * Never reuses a previous stayId.
   */
  assignGuestToRoom: (
    roomId: string,
    guestName: string,
    checkOutDate?: string,
    guestPhone?: string,
    guestTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | '',
    actor?: { id?: string; name?: string; email?: string }
  ): Stay | null => {
    const targetRoom = cachedDb.rooms.find((r) => r.id === roomId);
    if (!targetRoom) return null;

    const nowIso = new Date().toISOString();
    const isAlreadyOccupiedEditingGuest =
      targetRoom.status === 'occupied' && Boolean(targetRoom.activeStayId);

    // If checking in to an available house, always generate a brand-new stayId.
    const stayId = isAlreadyOccupiedEditingGuest
      ? targetRoom.activeStayId!
      : generateStayId();

    const checkOutIso =
      checkOutDate && /^\d{4}-\d{2}-\d{2}$/.test(checkOutDate.trim())
        ? `${checkOutDate.trim()}T11:00:00+02:00`
        : checkOutDate || new Date(Date.now() + 86_400_000).toISOString();

    const newStay: Stay = {
      id: stayId,
      propertyId: targetRoom.propertyId,
      roomId: targetRoom.id,
      guestTitle: guestTitle ?? '',
      guestName: guestName.trim(),
      guestPhone: guestPhone?.trim() || '',
      checkInAt: isAlreadyOccupiedEditingGuest
        ? targetRoom.guestCheckInDate || nowIso
        : nowIso,
      checkOutAt: checkOutIso,
      status: 'active',
      createdBy: actor?.email || actor?.name || 'Staff',
    };

    const updatedRooms = cachedDb.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const updated: Room = {
        ...r,
        status: 'occupied',
        guestTitle: guestTitle ?? '',
        currentGuestName: guestName.trim(),
        guestCheckInDate: newStay.checkInAt,
        guestCheckOutDate: checkOutIso,
        guestPhone: guestPhone?.trim() || '',
        activeStayId: stayId,
        updatedAt: nowIso,
      };
      void persistDoc('rooms', r.id, updated);
      return updated;
    });

    const otherStays = cachedDb.stays.filter((s) => s.id !== stayId);
    cachedDb = {
      ...cachedDb,
      rooms: updatedRooms,
      stays: [newStay, ...otherStays],
    };
    notifyListeners();

    void persistDoc('stays', stayId, newStay);

    recordActivityInternal({
      propertyId: targetRoom.propertyId,
      type: 'check_in',
      actorName: actor?.name || actor?.email || 'Manager',
      actorEmail: actor?.email,
      summary: `Checked in ${[guestTitle, guestName.trim()].filter(Boolean).join(' ')} to ${targetRoom.roomNumber}`,
    });

    return newStay;
  },

  /**
   * Check-out ends the active Stay (`status: 'checked_out'`), revokes guest stay access,
   * and sets the house to `available`.
   */
  checkOutRoom: (
    roomId: string,
    actor?: { name?: string; email?: string }
  ): void => {
    const targetRoom = cachedDb.rooms.find((r) => r.id === roomId);
    const activeStayId = targetRoom?.activeStayId;
    const nowIso = new Date().toISOString();

    const updatedStays = cachedDb.stays.map((s) => {
      if (s.id === activeStayId || (s.roomId === roomId && s.status === 'active')) {
        const closed: Stay = {
          ...s,
          status: 'checked_out',
          checkedOutAt: nowIso,
        };
        void persistDoc('stays', s.id, closed);
        return closed;
      }
      return s;
    });

    // If the active stay was not yet in cachedDb.stays, persist its checked_out state directly
    if (activeStayId && !cachedDb.stays.some((s) => s.id === activeStayId) && targetRoom) {
      const closedStay: Stay = {
        id: activeStayId,
        propertyId: targetRoom.propertyId,
        roomId: targetRoom.id,
        guestTitle: targetRoom.guestTitle || '',
        guestName: targetRoom.currentGuestName || 'Guest',
        guestPhone: targetRoom.guestPhone || '',
        checkInAt: targetRoom.guestCheckInDate || nowIso,
        checkOutAt: targetRoom.guestCheckOutDate || nowIso,
        status: 'checked_out',
        checkedOutAt: nowIso,
      };
      updatedStays.unshift(closedStay);
      void persistDoc('stays', activeStayId, closedStay);
    }

    const updatedRooms = cachedDb.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const updated: Room = {
        ...r,
        status: 'available',
        guestTitle: '',
        currentGuestName: '',
        guestCheckInDate: '',
        guestCheckOutDate: '',
        guestPhone: '',
        activeStayId: '',
        updatedAt: nowIso,
      };
      void persistDoc('rooms', r.id, updated);
      return updated;
    });

    cachedDb = {
      ...cachedDb,
      rooms: updatedRooms,
      stays: updatedStays,
    };
    notifyListeners();

    if (targetRoom) {
      recordActivityInternal({
        propertyId: targetRoom.propertyId,
        type: 'check_out',
        actorName: actor?.name || actor?.email || 'Manager',
        actorEmail: actor?.email,
        summary: `Checked out ${targetRoom.currentGuestName || 'guest'} from ${targetRoom.roomNumber}`,
      });
    }
  },

  /**
   * Archives a house (`archived: true`) instead of hard-deleting it.
   */
  deleteRoom: (roomId: string): void => {
    const nowIso = new Date().toISOString();
    const updatedRooms = cachedDb.rooms.map((r) => {
      if (r.id !== roomId) return r;
      const archivedRoom: Room = {
        ...r,
        archived: true,
        updatedAt: nowIso,
      };
      void persistDoc('rooms', r.id, archivedRoom);
      return archivedRoom;
    });
    const updatedQRs = cachedDb.qrCodes.map((q) => {
      if (q.roomId !== roomId) return q;
      const revoked: QRCodeRecord = { ...q, status: 'revoked', updatedAt: nowIso };
      void persistDoc('qrCodes', q.id, revoked);
      return revoked;
    });

    cachedDb = {
      ...cachedDb,
      rooms: updatedRooms,
      qrCodes: updatedQRs,
    };
    notifyListeners();
  },

  // --- MEDIA ---
  getAllMedia: (): MediaItem[] => cachedDb.media,

  getMediaById: (mediaId?: string | null): MediaItem | undefined => {
    if (!mediaId) return undefined;
    return cachedDb.media.find((m) => m.id === mediaId);
  },

  resolveRoomPhotoUrl: (room?: Room | null, property?: Property | null): string | undefined => {
    if (!room) return property?.coverImageUrl;
    if (room.imageId) {
      const media = cachedDb.media.find((m) => m.id === room.imageId);
      if (media?.dataUrl) return media.dataUrl;
    }
    if (room.imageUrl) return room.imageUrl;
    if (property?.coverImageId) {
      const media = cachedDb.media.find((m) => m.id === property.coverImageId);
      if (media?.dataUrl) return media.dataUrl;
    }
    return property?.coverImageUrl;
  },

  saveMedia: async (input: {
    ownerType: 'house' | 'property' | 'user';
    ownerId: string;
    propertyId?: string;
    dataUrl: string;
    width: number;
    height: number;
    uploadedBy: string;
  }): Promise<MediaItem> => {
    const mediaId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const item: MediaItem = {
      id: mediaId,
      propertyId: input.propertyId || 'prop_rocks_lusaka',
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      dataUrl: input.dataUrl,
      width: input.width,
      height: input.height,
      uploadedBy: input.uploadedBy,
      createdAt: new Date().toISOString(),
    };

    cachedDb = {
      ...cachedDb,
      media: [item, ...cachedDb.media],
    };
    notifyListeners();
    await persistDoc('media', item.id, item);
    return item;
  },

  // --- ACTIVITY LOG ---
  getActivityLog: (propertyId?: string): ActivityLogEntry[] => {
    if (!propertyId) return cachedActivityLog;
    return cachedDb.activity
      .filter((a) => !a.propertyId || a.propertyId === propertyId)
      .slice(0, 50);
  },

  recordActivity: (entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>): ActivityLogEntry => {
    return recordActivityInternal(entry);
  },

  // --- USERS & STAFF ---
  getUsersByProperty: (propertyId: string): UserProfile[] => {
    return cachedDb.users.filter((u) => u.propertyId === propertyId && u.active !== false);
  },

  getAllUsers: (): UserProfile[] => {
    if (cachedDb.users && cachedDb.users.length > 0) {
      return cachedDb.users;
    }
    if (typeof window !== 'undefined' && (window as any).__HOSPITALLY_INITIAL_DATA__?.users?.length) {
      return (window as any).__HOSPITALLY_INITIAL_DATA__.users;
    }
    return STABLE_EMPTY_USERS;
  },

  // --- DINING MENU ---
  getDiningByProperty: (propertyId: string): DiningItem[] => {
    return cachedDb.diningItems.filter((d) => d.propertyId === propertyId);
  },

  getAllDining: (): DiningItem[] => cachedDb.diningItems,

  addDiningItem: (
    propertyId: string,
    item: Omit<DiningItem, 'id' | 'propertyId' | 'createdAt'>
  ): DiningItem => {
    const newItem: DiningItem = {
      ...item,
      id: `din_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      propertyId,
      createdAt: new Date().toISOString(),
    };
    cachedDb = {
      ...cachedDb,
      diningItems: [newItem, ...cachedDb.diningItems],
    };
    notifyListeners();
    void persistDoc('dining', newItem.id, newItem);
    return newItem;
  },

  updateDiningItem: (itemId: string, updates: Partial<DiningItem>): void => {
    const updatedDining = cachedDb.diningItems.map((item) => {
      if (item.id === itemId) {
        const updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
        void persistDoc('dining', item.id, updated);
        return updated;
      }
      return item;
    });
    cachedDb = { ...cachedDb, diningItems: updatedDining };
    notifyListeners();
  },

  deleteDiningItem: (itemId: string): void => {
    const updatedDining = cachedDb.diningItems.map((item) => {
      if (item.id === itemId) {
        const updated = { ...item, available: false, updatedAt: new Date().toISOString() };
        void persistDoc('dining', item.id, updated);
        return updated;
      }
      return item;
    });
    cachedDb = {
      ...cachedDb,
      diningItems: updatedDining.filter((i) => i.id !== itemId),
    };
    notifyListeners();
  },

  // --- SERVICE REQUESTS ---
  getRequestsByProperty: (propertyId: string): ServiceRequest[] => {
    return cachedDb.requests
      .filter((r) => r.propertyId === propertyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getAllRequests: (): ServiceRequest[] => {
    return cachedSortedRequests;
  },

  getRequestsByRoom: (roomId: string, stayId?: string): ServiceRequest[] => {
    return cachedDb.requests
      .filter((r) => r.roomId === roomId && (!stayId || r.stayId === stayId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getRequestById: (requestId: string): ServiceRequest | undefined => {
    return cachedDb.requests.find((r) => r.id === requestId);
  },

  createRequest: (
    requestData: Omit<
      ServiceRequest,
      'id' | 'createdAt' | 'updatedAt' | 'history' | 'status' | 'stayId'
    > & { stayId?: string }
  ): ServiceRequest => {
    const targetProperty = cachedDb.properties.find((p) => p.id === requestData.propertyId);
    if (targetProperty && targetProperty.status === 'suspended') {
      throw new Error(
        targetProperty.suspendMessage ||
          "We're not taking requests through the app right now. Please contact reception."
      );
    }

    const matchingRoom = cachedDb.rooms.find((r) => r.id === requestData.roomId);
    const activeStayId = requestData.stayId || matchingRoom?.activeStayId;
    if (!activeStayId) {
      throw new Error('Cannot create a request without an active stay.');
    }

    const activeStay = cachedDb.stays.find((s) => s.id === activeStayId);
    const guestFullName =
      requestData.guestName ||
      (activeStay
        ? [activeStay.guestTitle, activeStay.guestName].filter(Boolean).join(' ')
        : matchingRoom
        ? [matchingRoom.guestTitle, matchingRoom.currentGuestName].filter(Boolean).join(' ')
        : 'Guest');

    const guestPhone =
      requestData.guestPhone || activeStay?.guestPhone || matchingRoom?.guestPhone || '';

    const now = new Date().toISOString();
    const newRequest: ServiceRequest = {
      ...requestData,
      category: requestData.category || (requestData as any).department || 'housekeeping',
      title: requestData.title || 'Service request',
      roomNumber: requestData.roomNumber || matchingRoom?.roomNumber || matchingRoom?.name || 'House',
      stayId: activeStayId,
      guestName: guestFullName,
      guestPhone,
      // Required by Firestore rules for anonymous guest requests
      ...(auth.currentUser?.isAnonymous ? { guestUid: auth.currentUser.uid } : {}),
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: 'pending',
      archived: false,
      createdAt: now,
      updatedAt: now,
      history: [{ status: 'pending', timestamp: now }],
    };

    cachedDb = {
      ...cachedDb,
      requests: [newRequest, ...cachedDb.requests],
    };
    notifyListeners();

    void persistDoc('requests', newRequest.id, newRequest);
    notificationService.playStaffAlertChime();

    return newRequest;
  },

  /**
   * Confirm a pending request (`status: 'acknowledged'`).
   * Per Spec §3: Confirm does NOT auto-assign anyone.
   */
  confirmRequest: (
    requestId: string,
    actor?: { uid: string; name: string }
  ): ServiceRequest | undefined => {
    const now = new Date().toISOString();
    let updatedItem: ServiceRequest | undefined;

    const updatedRequests = cachedDb.requests.map((req) => {
      if (req.id !== requestId) return req;
      updatedItem = {
        ...req,
        status: 'acknowledged',
        updatedAt: now,
        history: [
          ...req.history,
          {
            status: 'acknowledged',
            timestamp: now,
            actorId: actor?.uid,
            actorName: actor?.name,
            note: 'Confirmed by reception',
          },
        ],
      };
      void persistDoc('requests', updatedItem.id, updatedItem);
      return updatedItem;
    });

    if (updatedItem) {
      cachedDb = { ...cachedDb, requests: updatedRequests };
      notifyListeners();
      notificationService.playStatusUpdateChime();
    }
    return updatedItem;
  },

  /**
   * Assign a request to a property staff member or GM (never founder).
   * Logs assignment in request history.
   */
  assignRequest: (
    requestId: string,
    assignee: { uid: string; name: string; department?: StaffDepartment } | undefined,
    actor?: { uid: string; name: string }
  ): ServiceRequest | undefined => {
    const now = new Date().toISOString();
    let updatedItem: ServiceRequest | undefined;

    const updatedRequests = cachedDb.requests.map((req) => {
      if (req.id !== requestId) return req;
      const nextStatus: RequestStatus =
        req.status === 'pending' && assignee ? 'acknowledged' : req.status;
      const updated: ServiceRequest = {
        ...req,
        propertyId: req.propertyId || 'prop_rocks_lusaka',
        roomId: req.roomId || '',
        stayId: req.stayId || '',
        title: req.title || 'Request',
        description: req.description || '',
        status: nextStatus,
        assignedTo: assignee,
        updatedAt: now,
        history: [
          ...(req.history || []),
          {
            status: nextStatus,
            timestamp: now,
            actorId: actor?.uid || assignee?.uid,
            actorName: actor?.name || assignee?.name,
            note: assignee ? `Assigned to ${assignee.name}` : 'Unassigned',
          },
        ],
      };
      updatedItem = updated;
      void persistDoc('requests', updated.id, updated);
      return updated;
    });

    if (updatedItem) {
      cachedDb = { ...cachedDb, requests: updatedRequests };
      notifyListeners();
    }
    return updatedItem;
  },

  updateRequestStatus: (
    requestId: string,
    newStatus: RequestStatus,
    actor?: { uid: string; name: string; department?: StaffDepartment },
    cancelReason?: string
  ): ServiceRequest | undefined => {
    const now = new Date().toISOString();
    let updatedItem: ServiceRequest | undefined;

    const updatedRequests = cachedDb.requests.map((req) => {
      if (req.id !== requestId) return req;
      const updated: ServiceRequest = {
        ...req,
        propertyId: req.propertyId || 'prop_rocks_lusaka',
        roomId: req.roomId || '',
        stayId: req.stayId || '',
        title: req.title || 'Request',
        description: req.description || '',
        status: newStatus,
        verification:
          newStatus === 'completed'
            ? req.verification || 'pending'
            : newStatus === 'in_progress' && req.verification === 'pending'
            ? undefined
            : req.verification,
        cancelReason:
          newStatus === 'cancelled' ? cancelReason || req.cancelReason : req.cancelReason,
        updatedAt: now,
        history: [
          ...(req.history || []),
          {
            status: newStatus,
            timestamp: now,
            actorId: actor?.uid,
            actorName: actor?.name,
            note: cancelReason ? `Cancelled: ${cancelReason}` : undefined,
          },
        ],
      };
      updatedItem = updated;
      void persistDoc('requests', updated.id, updated);
      return updated;
    });

    if (updatedItem) {
      cachedDb = { ...cachedDb, requests: updatedRequests };
      notifyListeners();
      notificationService.playStatusUpdateChime();
    }

    return updatedItem;
  },

  /**
   * GM/Founder verification of completed requests.
   * - verify: marks verification = 'verified', verifiedBy, verifiedAt.
   * - reopen: moves status back to 'in_progress', clears verification, records reopenReason note.
   */
  verifyRequest: (
    requestId: string,
    action: 'verify' | 'reopen',
    actor: { uid: string; name: string; role?: string },
    reopenReason?: string
  ): ServiceRequest | undefined => {
    const now = new Date().toISOString();
    let updatedItem: ServiceRequest | undefined;

    const updatedRequests = cachedDb.requests.map((req) => {
      if (req.id !== requestId) return req;
      if (action === 'verify') {
        updatedItem = {
          ...req,
          verification: 'verified',
          verifiedBy: actor.name || actor.uid,
          verifiedAt: now,
          updatedAt: now,
          history: [
            ...(req.history || []),
            {
              status: req.status,
              timestamp: now,
              actorId: actor.uid,
              actorName: actor.name,
              note: 'Verified by GM',
            },
          ],
        };
      } else {
        // reopen
        updatedItem = {
          ...req,
          status: 'in_progress',
          verification: undefined,
          reopenReason: reopenReason || 'Reopened by GM',
          updatedAt: now,
          history: [
            ...(req.history || []),
            {
              status: 'in_progress',
              timestamp: now,
              actorId: actor.uid,
              actorName: actor.name,
              note: reopenReason ? `Reopened: ${reopenReason}` : 'Reopened by GM',
            },
          ],
        };
      }
      void persistDoc('requests', updatedItem.id, updatedItem);
      return updatedItem;
    });

    if (updatedItem) {
      cachedDb = { ...cachedDb, requests: updatedRequests };
      notifyListeners();
      notificationService.playStatusUpdateChime();
    }

    return updatedItem;
  },

  /**
   * Archive a cancelled or completed request ("Remove from board", GM/Founder only).
   * Kept in Firestore and visible under the "Archived" filter.
   * Allowed ONLY if cancelled or (completed and verified).
   */
  archiveRequest: (
    requestId: string,
    actor: { uid?: string; name: string; email?: string }
  ): ServiceRequest | undefined => {
    const now = new Date().toISOString();
    let updatedItem: ServiceRequest | undefined;

    const updatedRequests = cachedDb.requests.map((req) => {
      if (req.id !== requestId) return req;
      if (req.status !== 'cancelled' && req.verification !== 'verified') {
        const errorMsg = 'Archive allowed only after request is verified or cancelled.';
        console.warn(errorMsg);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('hospitally-write-error', {
              detail: { collection: 'requests', docId: req.id, error: errorMsg },
            })
          );
        }
        return req;
      }
      updatedItem = {
        ...req,
        archived: true,
        archivedAt: now,
        archivedBy: actor.email || actor.name,
        updatedAt: now,
      };
      void persistDoc('requests', updatedItem.id, updatedItem);
      return updatedItem;
    });

    if (updatedItem) {
      cachedDb = { ...cachedDb, requests: updatedRequests };
      notifyListeners();
      recordActivityInternal({
        propertyId: updatedItem.propertyId,
        type: 'request_archived',
        actorName: actor.name,
        actorEmail: actor.email,
        summary: `Archived request "${updatedItem.title}" (${updatedItem.roomNumber})`,
      });
    }
    return updatedItem;
  },

  updateDeliveryPreference: (
    requestId: string,
    deliveryPreference: DeliveryPreference
  ): ServiceRequest | undefined => {
    const now = new Date().toISOString();
    let updatedItem: ServiceRequest | undefined;

    const updatedRequests = cachedDb.requests.map((req) => {
      if (req.id !== requestId) return req;
      // Only editable while not completed or cancelled
      if (req.status === 'completed' || req.status === 'cancelled') return req;
      updatedItem = {
        ...req,
        deliveryPreference,
        updatedAt: now,
      };
      void persistDoc('requests', updatedItem.id, updatedItem);
      return updatedItem;
    });

    if (updatedItem) {
      cachedDb = { ...cachedDb, requests: updatedRequests };
      notifyListeners();
    }
    return updatedItem;
  },

  cancelRequestByGuest: (requestId: string): ServiceRequest | undefined => {
    const now = new Date().toISOString();
    let updatedItem: ServiceRequest | undefined;

    const updatedRequests = cachedDb.requests.map((req) => {
      if (req.id === requestId && req.status === 'pending') {
        updatedItem = {
          ...req,
          status: 'cancelled',
          updatedAt: now,
          history: [...req.history, { status: 'cancelled', timestamp: now }],
        };
        void persistDoc('requests', updatedItem.id, updatedItem);
        return updatedItem;
      }
      return req;
    });

    if (updatedItem) {
      cachedDb = { ...cachedDb, requests: updatedRequests };
      notifyListeners();
    }
    return updatedItem;
  },

  // --- STAFF PUSH DEVICE REGISTRATION & NOTIFICATION PREFERENCES ---
  updateUserNotificationSettings: (
    userId: string,
    settings: UserNotificationSettings
  ): void => {
    const now = new Date().toISOString();
    const updatedUsers = cachedDb.users.map((u) => {
      if (u.id === userId) {
        const updated: UserProfile = {
          ...u,
          notificationSettings: settings,
          updatedAt: now,
        };
        void persistDoc('users', u.id, updated);
        return updated;
      }
      return u;
    });
    cachedDb = { ...cachedDb, users: updatedUsers };
    notifyListeners();
  },

  saveStaffDeviceToken: async (
    userId: string,
    propertyId: string,
    fcmToken: string
  ): Promise<void> => {
    if (!PUSH_ENABLED) return;
    const now = new Date().toISOString();
    const deviceId = `dev_${userId}_${fcmToken.slice(-12).replace(/[^a-zA-Z0-9]/g, '')}`;
    const record: StaffDeviceRecord = {
      id: deviceId,
      userId,
      propertyId: propertyId || 'prop_rocks_lusaka',
      fcmToken,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      platform: typeof navigator !== 'undefined' ? navigator.platform : undefined,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await persistDoc('staffDevices', deviceId, record);
  },

  removeStaffDeviceToken: async (userId: string): Promise<void> => {
    if (!PUSH_ENABLED) return;
    try {
      const q = query(collection(db, 'staffDevices'), where('userId', '==', userId));
      const snap = await getDocs(q);
      await Promise.all(
        snap.docs.map((d) =>
          persistDoc('staffDevices', d.id, {
            ...(d.data() as StaffDeviceRecord),
            enabled: false,
            updatedAt: new Date().toISOString(),
          })
        )
      );
    } catch (err) {
      console.warn('Failed to disable staff device tokens:', err);
    }
  },

  // --- LEADS ---
  getLeads: (): Lead[] => cachedDb.leads || [],

  createLead: async (leadData: Omit<Lead, 'id' | 'createdAt'>): Promise<Lead> => {
    const leadId = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newLead: Lead = {
      ...leadData,
      id: leadId,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    cachedDb = {
      ...cachedDb,
      leads: [newLead, ...(cachedDb.leads || [])],
    };
    notifyListeners();
    try {
      await setDoc(doc(db, 'leads', leadId), newLead);
    } catch (err) {
      console.warn('Failed to write lead to Firestore:', err);
    }
    return newLead;
  },

  updateLeadStatus: async (leadId: string, status: Lead['status'], notes?: string): Promise<void> => {
    const updatedLeads = (cachedDb.leads || []).map((l) =>
      l.id === leadId ? { ...l, status, notes: notes !== undefined ? notes : l.notes } : l
    );
    cachedDb = { ...cachedDb, leads: updatedLeads };
    notifyListeners();
    try {
      await setDoc(doc(db, 'leads', leadId), { status, ...(notes !== undefined ? { notes } : {}) }, { merge: true });
    } catch (err) {
      console.warn('Failed to update lead status:', err);
    }
  },
};
