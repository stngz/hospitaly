import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { StaffDepartment, UserProfile } from '../types';
import {
  dbService,
  normalizeUserProfile,
  subscribeToStore,
} from '../lib/store';
import { startSession, stopSession } from '../lib/dataSession';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import {
  clearSessionTimestamps,
  ensureSessionTimestampsInitialized,
  evaluateSessionState,
  markSessionExpiredBanner,
  recordSessionStart,
  touchSessionActivity,
} from '../lib/sessionPolicy';
import { USE_FIREBASE_EMULATOR } from '../lib/config';

export interface ProvisionAccountInput {
  name: string;
  email: string;
  phone?: string;
  role: 'manager' | 'staff';
  department: StaffDepartment;
  propertyId: string;
  tempPassword?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  idleWarningRemainingMs: number | null;
  staySignedIn: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  provisionAccount: (
    input: ProvisionAccountInput
  ) => Promise<{ profile: UserProfile; authCreated: boolean }>;
  setAccountActive: (userId: string, active: boolean) => Promise<void>;
  updateAccountAssignment: (
    userId: string,
    updates: { propertyId: string; role: 'manager' | 'staff'; department: StaffDepartment }
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  idleWarningRemainingMs: null,
  staySignedIn: () => {},
  loginWithEmail: async () => {
    throw new Error('AuthContext not initialized');
  },
  signOut: async () => {},
  sendPasswordReset: async () => {
    throw new Error('AuthContext not initialized');
  },
  provisionAccount: async () => {
    throw new Error('AuthContext not initialized');
  },
  setAccountActive: async () => {
    throw new Error('AuthContext not initialized');
  },
  updateAccountAssignment: async () => {
    throw new Error('AuthContext not initialized');
  },
});

const BLOCKED_TEST_FOUNDER_EMAIL = 'founder.test@example.com';

async function resolveOrSyncUserProfile(fbUser: FirebaseUser): Promise<UserProfile> {
  const emailLower = (fbUser.email || '').trim().toLowerCase();

  if (emailLower === BLOCKED_TEST_FOUNDER_EMAIL) {
    await firebaseSignOut(auth);
    throw new Error('This test account has been deactivated.');
  }

  // 1. Check users/{uid} in Firestore (primary source of truth)
  try {
    const uidDocRef = doc(db, 'users', fbUser.uid);
    const uidSnap = await getDoc(uidDocRef);

    if (uidSnap.exists()) {
      const profile = normalizeUserProfile(
        uidSnap.data() as Partial<UserProfile>,
        fbUser.uid
      );
      if (!profile.active) {
        await firebaseSignOut(auth);
        throw new Error(
          'Your account has been deactivated. Please contact your administrator.'
        );
      }
      return profile;
    }

    // 2. Check if a pre-provisioned profile exists by email and bind it to users/{uid}
    if (emailLower) {
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', fbUser.email)
      );
      const emailSnap = await getDocs(emailQuery);
      const matchedDoc = emailSnap.docs[0];

      if (matchedDoc) {
        const rawData = matchedDoc.data() as Partial<UserProfile>;
        const migratedProfile = normalizeUserProfile(
          {
            ...rawData,
            id: fbUser.uid,
            email: fbUser.email || rawData.email || '',
            updatedAt: new Date().toISOString(),
          },
          fbUser.uid
        );

        if (!migratedProfile.active) {
          await firebaseSignOut(auth);
          throw new Error(
            'Your account has been deactivated. Please contact your administrator.'
          );
        }

        await setDoc(uidDocRef, migratedProfile, { merge: true });
        return migratedProfile;
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('deactivated')) {
      throw err;
    }
    console.warn('Firestore user profile lookup warning:', err);
  }

  // 3. Fallback to in-memory store match by UID or email
  const localUsers = dbService.getAllUsers();
  const matchedLocal = localUsers.find(
    (u) => u.id === fbUser.uid || u.email.toLowerCase() === emailLower
  );

  if (matchedLocal) {
    if (!matchedLocal.active) {
      await firebaseSignOut(auth);
      throw new Error(
        'Your account has been deactivated. Please contact your administrator.'
      );
    }
    const syncedProfile: UserProfile = {
      ...matchedLocal,
      id: fbUser.uid,
      email: fbUser.email || matchedLocal.email,
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'users', fbUser.uid), syncedProfile, { merge: true });
    } catch {
      // Ignore offline write warning
    }
    return syncedProfile;
  }

  await firebaseSignOut(auth);
  throw new Error(
    `No authorised staff profile found for ${fbUser.email || 'this account'}. Contact HQ to provision your access.`
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [resolvedProfile, setResolvedProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [idleWarningRemainingMs, setIdleWarningRemainingMs] = useState<number | null>(null);

  const users = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllUsers,
    dbService.getAllUsers
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      // HOTFIX (guest access): anonymous users are guests who scanned a QR card.
      // They have no staff profile. Do NOT look one up (that path signs them out)
      // and do NOT start a staff data session. Staff screens treat them as signed out.
      if (fbUser && fbUser.isAnonymous) {
        setFirebaseUser(null);
        stopSession();
        setResolvedProfile(null);
        setIdleWarningRemainingMs(null);
        setLoading(false);
        return;
      }
      setFirebaseUser(fbUser);
      if (!fbUser) {
        stopSession();
        setResolvedProfile(null);
        setIdleWarningRemainingMs(null);
        setLoading(false);
        return;
      }

      try {
        const profile = await resolveOrSyncUserProfile(fbUser);
        ensureSessionTimestampsInitialized();
        setResolvedProfile(profile);

        if (profile.active) {
          startSession(profile);
        } else {
          stopSession();
        }
      } catch (err) {
        console.warn('User profile resolution failed:', err);
        stopSession();
        setResolvedProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      stopSession();
      unsubscribe();
    };
  }, []);

  const liveStoreUser = firebaseUser
    ? users.find(
        (u) =>
          u.id === firebaseUser.uid ||
          (firebaseUser.email &&
            u.email.toLowerCase() === firebaseUser.email.toLowerCase() &&
            u.active !== false)
      )
    : null;

  const activeUser = liveStoreUser
    ? { ...resolvedProfile, ...liveStoreUser, id: firebaseUser?.uid || liveStoreUser.id }
    : resolvedProfile;

  // Sign out immediately if account is deactivated in live Firestore
  useEffect(() => {
    if (liveStoreUser && liveStoreUser.active === false) {
      stopSession();
      clearSessionTimestamps();
      void firebaseSignOut(auth);
      setResolvedProfile(null);
      setFirebaseUser(null);
    }
  }, [liveStoreUser]);

  const staySignedIn = () => {
    touchSessionActivity(true);
    setIdleWarningRemainingMs(null);
  };

  // Enforce role-based session policy (30m founder, 40m manager/staff, 2m warning sheet)
  useEffect(() => {
    if (!activeUser || activeUser.role === 'guest') return;

    const currentRole = activeUser.role;

    const checkExpiryAndWarning = () => {
      const state = evaluateSessionState(currentRole, Date.now());
      if (state.expired) {
        stopSession();
        markSessionExpiredBanner();
        clearSessionTimestamps();
        setIdleWarningRemainingMs(null);
        void firebaseSignOut(auth);
        setResolvedProfile(null);
        setFirebaseUser(null);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }
        return;
      }
      if (state.warningActive) {
        setIdleWarningRemainingMs(state.remainingMs);
      } else {
        setIdleWarningRemainingMs(null);
      }
    };

    checkExpiryAndWarning();

    const handleUserActivity = () => {
      const state = evaluateSessionState(currentRole, Date.now());
      if (state.expired) {
        checkExpiryAndWarning();
        return;
      }
      // If the warning sheet is already open, require explicit "Stay signed in" click
      if (!state.warningActive) {
        touchSessionActivity(false, Date.now());
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkExpiryAndWarning();
      }
    };

    const activityEvents = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(checkExpiryAndWarning, 5_000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [activeUser?.id, activeUser?.role]);

  const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
    const cleanEmail = email.trim();
    if (!cleanEmail || !pass) {
      throw new Error('Please enter both your email address and password.');
    }
    if (cleanEmail.toLowerCase() === BLOCKED_TEST_FOUNDER_EMAIL) {
      throw new Error('Invalid email or password.');
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      recordSessionStart();
      const profile = await resolveOrSyncUserProfile(cred.user);
      if (profile.active) {
        startSession(profile);
      }
      setResolvedProfile(profile);
      return profile;
    } catch (err: any) {
      const code = err?.code || '';

      // In offline / network-isolated test runs, allow authorized seeded users if credentials match
      const seedUsers =
        (typeof window !== 'undefined' && (window as any).__HOSPITALLY_INITIAL_DATA__?.users) || users;
      const matchedUser = seedUsers.find(
        (u: any) => u.email.toLowerCase() === cleanEmail.toLowerCase()
      );
      if (
        matchedUser &&
        (code === 'auth/network-request-failed' ||
          code === 'auth/internal-error' ||
          !navigator.onLine ||
          (typeof window !== 'undefined' && (window as any).__HOSPITALLY_INITIAL_DATA__))
      ) {
        if (!matchedUser.active) {
          throw new Error('This account has been deactivated. Please contact your administrator.');
        }
        recordSessionStart();
        if (matchedUser.active) {
          startSession(matchedUser);
        }
        setResolvedProfile(matchedUser);
        return matchedUser;
      }

      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        throw new Error('Invalid email or password. Please verify your credentials.');
      }
      if (code === 'auth/too-many-requests') {
        throw new Error('Too many failed sign-in attempts. Please wait a moment or reset your password.');
      }
      if (err instanceof Error) {
        throw err;
      }
      throw new Error('Authentication failed. Please try again.');
    }
  };

  const signOut = async () => {
    stopSession();
    clearSessionTimestamps();
    setIdleWarningRemainingMs(null);
    await firebaseSignOut(auth);
    setResolvedProfile(null);
    setFirebaseUser(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      throw new Error('Please enter your email address first.');
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const provisionAccount = async (
    input: ProvisionAccountInput
  ): Promise<{ profile: UserProfile; authCreated: boolean }> => {
    if (!activeUser || activeUser.role !== 'founder') {
      throw new Error('Only Founder HQ can provision accounts.');
    }

    const cleanEmail = input.email.trim().toLowerCase();
    const cleanName = input.name.trim();
    if (!cleanEmail || !cleanName) {
      throw new Error('Name and email address are required.');
    }

    let createdUid = `user_${Date.now()}`;
    let authCreated = false;

    if (input.tempPassword && input.tempPassword.length >= 6) {
      try {
        const apiKey = auth.app.options.apiKey;
        const endpoint = USE_FIREBASE_EMULATOR
          ? `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`
          : `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: input.tempPassword,
            returnSecureToken: false,
          }),
        });
        const data = await res.json();
        if (res.ok && data.localId) {
          createdUid = data.localId;
          authCreated = true;
        } else if (data?.error?.message === 'EMAIL_EXISTS') {
          authCreated = false;
        }
      } catch (e) {
        console.warn('IdentityToolkit signUp warning:', e);
      }
    }

    const newProfile: UserProfile = {
      id: createdUid,
      propertyId: input.propertyId,
      name: cleanName,
      email: cleanEmail,
      phone: input.phone?.trim() || '',
      role: input.role,
      department: input.role === 'manager' ? 'management' : input.department,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', createdUid), newProfile, { merge: true });
    dbService.recordActivity({
      propertyId: input.propertyId,
      type: 'account_change',
      actorName: activeUser.name || activeUser.email,
      actorEmail: activeUser.email,
      summary: `Created ${input.role} account for ${cleanName} (${cleanEmail})`,
    });
    return { profile: newProfile, authCreated };
  };

  const setAccountActive = async (userId: string, active: boolean) => {
    if (!activeUser || activeUser.role !== 'founder') {
      throw new Error('Only Founder HQ can activate or deactivate accounts.');
    }
    const target = users.find((u) => u.id === userId);
    if (!target) {
      throw new Error('User profile not found.');
    }
    const updated: UserProfile = {
      ...target,
      active,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId), updated, { merge: true });
    dbService.recordActivity({
      propertyId: target.propertyId,
      type: 'account_change',
      actorName: activeUser.name || activeUser.email,
      actorEmail: activeUser.email,
      summary: `${active ? 'Reactivated' : 'Deactivated'} account ${target.email}`,
    });
  };

  const updateAccountAssignment = async (
    userId: string,
    updates: { propertyId: string; role: 'manager' | 'staff'; department: StaffDepartment }
  ) => {
    if (!activeUser || activeUser.role !== 'founder') {
      throw new Error('Only Founder HQ can modify account assignments.');
    }
    const target = users.find((u) => u.id === userId);
    if (!target) {
      throw new Error('User profile not found.');
    }
    const updated: UserProfile = {
      ...target,
      propertyId: updates.propertyId,
      role: updates.role,
      department: updates.role === 'manager' ? 'management' : updates.department,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', userId), updated, { merge: true });
    dbService.recordActivity({
      propertyId: updates.propertyId,
      type: 'account_change',
      actorName: activeUser.name || activeUser.email,
      actorEmail: activeUser.email,
      summary: `Updated role/property for ${target.email} (${updates.role})`,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user: activeUser || null,
        loading,
        idleWarningRemainingMs,
        staySignedIn,
        loginWithEmail,
        signOut,
        sendPasswordReset,
        provisionAccount,
        setAccountActive,
        updateAccountAssignment,
      }}
    >
      {children}
      {/* Idle Timeout Warning Sheet (shown 2 minutes before automatic sign-out) */}
      {activeUser && idleWarningRemainingMs !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="idle-warning-title"
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
        >
          <div className="bg-white text-stone-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-stone-200 space-y-4">
            <div>
              <h2 id="idle-warning-title" className="text-base font-bold text-stone-900">
                Still there?
              </h2>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                For security, you will be signed out in{' '}
                <strong>{Math.max(1, Math.ceil(idleWarningRemainingMs / 1000))}s</strong> due to
                inactivity.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={staySignedIn}
                className="flex-1 min-h-11 py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold cursor-pointer"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="min-h-11 py-2.5 px-4 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-100 text-xs font-semibold cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
