import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  UserProfile,
  Property,
  Room,
  Stay,
  QRCodeRecord,
  ServiceRequest,
  ActivityLogEntry,
  DiningItem,
  Lead,
  MediaItem,
} from '../types';
import {
  setSessionProperties,
  setSessionProperty,
  setSessionRooms,
  setSessionStays,
  setSessionQRCodes,
  setSessionRequests,
  setSessionUsers,
  setSessionActivity,
  setSessionDining,
  setSessionLeads,
  clearStoreCache,
  normalizeUserProfile,
  resetToSeedDataIfAvailable,
} from './store';

export interface DataSessionState {
  status: 'idle' | 'connecting' | 'connected' | 'retrying' | 'error';
  errorMessage: string | null;
  errorCode: string | null;
  retryAttempt: number;
}

let sessionState: DataSessionState = {
  status: 'idle',
  errorMessage: null,
  errorCode: null,
  retryAttempt: 0,
};

type SessionStateListener = (state: DataSessionState) => void;
const sessionStateListeners = new Set<SessionStateListener>();

function notifySessionState(next: Partial<DataSessionState>) {
  sessionState = { ...sessionState, ...next };
  sessionStateListeners.forEach((l) => l(sessionState));
}

export function subscribeSessionState(listener: SessionStateListener): () => void {
  listener(sessionState);
  sessionStateListeners.add(listener);
  return () => {
    sessionStateListeners.delete(listener);
  };
}

export function getSessionState(): DataSessionState {
  return sessionState;
}

// Track all active Firestore unsubscribe callbacks
let activeUnsubscribers: Unsubscribe[] = [];
let currentSessionProfile: UserProfile | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
const BACKOFF_SCHEDULE_MS = [2000, 5000, 15000];

// In-memory media cache: get by ID, never an unscoped list
const mediaCache = new Map<string, MediaItem>();

export async function getMediaById(mediaId: string): Promise<MediaItem | null> {
  const cleanId = (mediaId || '').trim();
  if (!cleanId) return null;
  if (mediaCache.has(cleanId)) return mediaCache.get(cleanId)!;
  try {
    const snap = await getDoc(doc(db, 'media', cleanId));
    if (snap.exists()) {
      const item = { ...(snap.data() as MediaItem), id: snap.id };
      mediaCache.set(cleanId, item);
      return item;
    }
  } catch (err: any) {
    console.warn(`[DataSession] Error fetching media ${cleanId}:`, err?.code || err?.message);
  }
  return null;
}

/**
 * Stop any active data session.
 * Unsubscribes all listeners, clears retry timers, clears store cache, and resets state.
 * Strictly idempotent. Safe in React StrictMode.
 */
export function stopSession(): void {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  // Execute all active unsubscribers
  activeUnsubscribers.forEach((unsub) => {
    try {
      unsub();
    } catch (err) {
      console.warn('[DataSession] Error during unsubscribe:', err);
    }
  });
  activeUnsubscribers = [];
  currentSessionProfile = null;

  // Clear in-memory store cache and notify subscribers
  clearStoreCache();

  // If running in an environment with initial seed data, reset back to seed data
  resetToSeedDataIfAvailable();

  notifySessionState({
    status: 'idle',
    errorMessage: null,
    errorCode: null,
    retryAttempt: 0,
  });
}

/**
 * Start a scoped data session for the authenticated user profile.
 * - Always calls stopSession() first to guarantee idempotency.
 * - Strictly scopes queries based on role and propertyId.
 * - Manages exponential backoff retries on snapshot failures.
 */
export function startSession(profile: UserProfile): void {
  // Always stop existing session first
  stopSession();

  if (!profile || !profile.active) {
    console.warn('[DataSession] Cannot start session for inactive or missing profile');
    return;
  }

  // In test mock / seed environments, populate cache immediately
  resetToSeedDataIfAvailable();

  currentSessionProfile = profile;
  notifySessionState({
    status: 'connecting',
    errorMessage: null,
    errorCode: null,
    retryAttempt: 0,
  });

  const isFounder = profile.role === 'founder';
  const propertyId = profile.propertyId;

  const handleListenerError = (name: string, err: any) => {
    const code = err?.code || 'unknown';
    console.warn(`[DataSession] Firestore ${name} listener error:`, code, err?.message);

    // If permission-denied or unauthenticated, do not retry blindly
    if (code === 'permission-denied' || code === 'unauthenticated') {
      notifySessionState({
        status: 'error',
        errorCode: code,
        errorMessage: `Permission denied for ${name}`,
      });
      return;
    }

    // Schedule retry with backoff (2s, 5s, 15s)
    const attempt = sessionState.retryAttempt;
    const delay = BACKOFF_SCHEDULE_MS[Math.min(attempt, BACKOFF_SCHEDULE_MS.length - 1)];

    notifySessionState({
      status: 'retrying',
      errorCode: code,
      errorMessage: `Couldn't load ${name} — retrying...`,
      retryAttempt: attempt + 1,
    });

    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      if (currentSessionProfile) {
        startSession(currentSessionProfile);
      }
    }, delay);
  };

  try {
    // 1. PROPERTIES
    if (isFounder) {
      // Founder observes all properties
      const unsubProps = onSnapshot(
        collection(db, 'properties'),
        (snap) => {
          const properties = snap.docs.map((d) => ({
            ...(d.data() as Property),
            id: d.id,
          }));
          setSessionProperties(properties);
          notifySessionState({ status: 'connected', errorMessage: null, errorCode: null });
        },
        (err) => handleListenerError('properties', err)
      );
      activeUnsubscribers.push(unsubProps);
    } else if (propertyId) {
      // Manager / Staff listens only to their own property doc
      const unsubPropDoc = onSnapshot(
        doc(db, 'properties', propertyId),
        (snap) => {
          if (snap.exists()) {
            const prop = { ...(snap.data() as Property), id: snap.id };
            setSessionProperty(prop);
          }
          notifySessionState({ status: 'connected', errorMessage: null, errorCode: null });
        },
        (err) => handleListenerError(`property/${propertyId}`, err)
      );
      activeUnsubscribers.push(unsubPropDoc);
    }

    // 2. ROOMS (HOUSES)
    const roomsQuery = isFounder
      ? collection(db, 'rooms')
      : query(collection(db, 'rooms'), where('propertyId', '==', propertyId));

    const unsubRooms = onSnapshot(
      roomsQuery,
      (snap) => {
        const rooms = snap.docs.map((d) => {
          const data = d.data() as Room;
          return {
            ...data,
            id: d.id,
            roomNumber: data.name || data.roomNumber || d.id,
            name: data.name || data.roomNumber || d.id,
            roomType: data.houseType || data.roomType || 'Apartment',
            houseType: data.houseType || data.roomType || 'Apartment',
          };
        });
        setSessionRooms(rooms);
      },
      (err) => handleListenerError('rooms', err)
    );
    activeUnsubscribers.push(unsubRooms);

    // 3. STAYS
    const staysQuery = isFounder
      ? collection(db, 'stays')
      : query(collection(db, 'stays'), where('propertyId', '==', propertyId));

    const unsubStays = onSnapshot(
      staysQuery,
      (snap) => {
        const stays = snap.docs.map((d) => ({
          ...(d.data() as Stay),
          id: d.id,
        }));
        setSessionStays(stays);
      },
      (err) => handleListenerError('stays', err)
    );
    activeUnsubscribers.push(unsubStays);

    // 4. QR CODES
    const qrQuery = isFounder
      ? collection(db, 'qrCodes')
      : query(collection(db, 'qrCodes'), where('propertyId', '==', propertyId));

    const unsubQRs = onSnapshot(
      qrQuery,
      (snap) => {
        const qrCodes = snap.docs.map((d) => ({
          ...(d.data() as QRCodeRecord),
          id: d.id,
          token: (d.data() as any).token || d.id,
        }));
        setSessionQRCodes(qrCodes);
      },
      (err) => handleListenerError('qrCodes', err)
    );
    activeUnsubscribers.push(unsubQRs);

    // 5. REQUESTS
    const reqQuery = isFounder
      ? collection(db, 'requests')
      : query(collection(db, 'requests'), where('propertyId', '==', propertyId));

    const unsubReqs = onSnapshot(
      reqQuery,
      (snap) => {
        const requests = snap.docs
          .map((d) => {
            const raw = d.data() as Partial<ServiceRequest>;
            return {
              ...raw,
              id: d.id,
              propertyId: raw.propertyId || propertyId || 'prop_rocks_lusaka',
              roomId: raw.roomId || 'room_general',
              roomNumber: raw.roomNumber || 'House',
              title: raw.title || 'Service request',
              category: raw.category || (raw as any).department || 'general',
              status: raw.status || 'pending',
              history:
                Array.isArray(raw.history) && raw.history.length > 0
                  ? raw.history
                  : [
                      {
                        status: raw.status || 'pending',
                        timestamp: raw.createdAt || new Date().toISOString(),
                      },
                    ],
              archived: typeof raw.archived === 'boolean' ? raw.archived : false,
              priority: raw.priority || 'normal',
              createdAt: raw.createdAt || new Date().toISOString(),
              updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
            } as ServiceRequest;
          })
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          );
        setSessionRequests(requests);
      },
      (err) => handleListenerError('requests', err)
    );
    activeUnsubscribers.push(unsubReqs);

    // 6. USERS
    const usersQuery = isFounder
      ? collection(db, 'users')
      : query(collection(db, 'users'), where('propertyId', '==', propertyId));

    const unsubUsers = onSnapshot(
      usersQuery,
      (snap) => {
        const users = snap.docs.map((d) =>
          normalizeUserProfile(d.data() as Partial<UserProfile>, d.id)
        );
        setSessionUsers(users);
      },
      (err) => handleListenerError('users', err)
    );
    activeUnsubscribers.push(unsubUsers);

    // 7. ACTIVITY (Founder observes all; managers/staff observe their property)
    const actQuery = isFounder
      ? collection(db, 'activity')
      : query(collection(db, 'activity'), where('propertyId', '==', propertyId));

    const unsubActivity = onSnapshot(
      actQuery,
      (snap) => {
        const activity = snap.docs
          .map((d) => ({ ...(d.data() as ActivityLogEntry), id: d.id }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 50);
        setSessionActivity(activity);
      },
      (err) => handleListenerError('activity', err)
    );
    activeUnsubscribers.push(unsubActivity);

    // 8. LEADS (Founder only)
    if (isFounder) {
      const unsubLeads = onSnapshot(
        collection(db, 'leads'),
        (snap) => {
          const leads = snap.docs
            .map((d) => ({ ...(d.data() as Lead), id: d.id }))
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setSessionLeads(leads);
        },
        (err) => handleListenerError('leads', err)
      );
      activeUnsubscribers.push(unsubLeads);
    }

    // 9. DINING (Available to all authenticated staff & founder)
    const unsubDining = onSnapshot(
      collection(db, 'dining'),
      (snap) => {
        const diningItems = snap.docs.map((d) => ({
          ...(d.data() as DiningItem),
          id: d.id,
        }));
        setSessionDining(diningItems);
      },
      (err) => handleListenerError('dining', err)
    );
    activeUnsubscribers.push(unsubDining);
  } catch (err: any) {
    console.warn('[DataSession] Error starting session listeners:', err);
    // If running in a test context where window.__HOSPITALLY_INITIAL_DATA__ was provided,
    // ensure test mock data remains accessible
    resetToSeedDataIfAvailable();
  }
}

export function isSessionActive(): boolean {
  return currentSessionProfile !== null && activeUnsubscribers.length > 0;
}

export function getCurrentSessionProfile(): UserProfile | null {
  return currentSessionProfile;
}
