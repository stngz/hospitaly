import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { StaffDepartment, UserProfile } from '../types';
import { dbService, normalizeUserProfile, subscribeToStore } from '../lib/store';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import {
  clearSessionTimestamps,
  ensureSessionTimestampsInitialized,
  isSessionExpired,
  markSessionExpiredBanner,
  recordSessionStart,
  touchSessionActivity,
} from '../lib/sessionPolicy';

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
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  provisionAccount: (input: ProvisionAccountInput) => Promise<{ profile: UserProfile; authCreated: boolean }>;
  setAccountActive: (userId: string, active: boolean) => Promise<void>;
  updateAccountAssignment: (
    userId: string,
    updates: { propertyId: string; role: 'manager' | 'staff'; department: StaffDepartment }
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
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

async function resolveAuthoritativeProfile(fbUser: FirebaseUser): Promise<UserProfile | null> {
  const cleanEmail = (fbUser.email || '').toLowerCase().trim();
  if (!cleanEmail) return null;

  // 1. Primary lookup by Firebase Auth UID
  try {
    const uidRef = doc(db, 'users', fbUser.uid);
    const uidSnap = await getDoc(uidRef);
    if (uidSnap.exists()) {
      const rawData = uidSnap.data();
      const normalized = normalizeUserProfile({ ...rawData, id: fbUser.uid });
      // Migrate legacy 'admin' role in Firestore to 'founder'
      if (rawData.role === 'admin') {
        await setDoc(uidRef, { role: 'founder', updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
      }
      return normalized;
    }
  } catch (err) {
    console.warn('Error looking up user profile by UID:', err);
  }

  // 2. Secondary lookup by email ONLY for linking an existing Founder-provisioned profile record to its UID
  try {
    const emailQuery = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const querySnap = await getDocs(emailQuery);
    if (!querySnap.empty) {
      const matchedDoc = querySnap.docs[0];
      const rawData = matchedDoc.data();
      const normalized = normalizeUserProfile({
        ...rawData,
        id: fbUser.uid,
        email: cleanEmail,
        updatedAt: new Date().toISOString(),
      });

      // Bind the profile document to the authoritative Firebase Auth UID
      await setDoc(doc(db, 'users', fbUser.uid), normalized, { merge: true }).catch(() => {});
      if (matchedDoc.id !== fbUser.uid) {
        await deleteDoc(doc(db, 'users', matchedDoc.id)).catch(() => {});
      }
      return normalized;
    }
  } catch (err) {
    console.warn('Error looking up pre-provisioned profile by email:', err);
  }

  // 3. Fallback bootstrapping for pilot seed accounts (Founder, Manager, Staff)
  if (cleanEmail === 'nathanielmazaba@gmail.com') {
    const founderProfile = normalizeUserProfile({
      id: fbUser.uid,
      propertyId: '',
      name: 'Nathaniel Mazaba (Founder)',
      email: cleanEmail,
      role: 'founder',
      department: 'management',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', fbUser.uid), founderProfile, { merge: true }).catch(() => {});
    return founderProfile;
  }

  if (cleanEmail === 'manager.test@example.com' || cleanEmail === 'manager.pilot@example.com') {
    const mgrProfile = normalizeUserProfile({
      id: fbUser.uid,
      propertyId: 'prop_rocks_lusaka',
      name: 'Rocks General Manager',
      email: cleanEmail,
      role: 'manager',
      department: 'management',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', fbUser.uid), mgrProfile, { merge: true }).catch(() => {});
    return mgrProfile;
  }

  if (cleanEmail === 'staff.test@example.com' || cleanEmail === 'staff.pilot@example.com') {
    const staffProfile = normalizeUserProfile({
      id: fbUser.uid,
      propertyId: 'prop_rocks_lusaka',
      name: 'Rocks House Attendant',
      email: cleanEmail,
      role: 'staff',
      department: 'housekeeping',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'users', fbUser.uid), staffProfile, { merge: true }).catch(() => {});
    return staffProfile;
  }

  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(true);

  const currentUser = useSyncExternalStore(
    subscribeToStore,
    dbService.getCurrentUser,
    dbService.getCurrentUser
  );

  // Restore and strictly validate authenticated Firebase user on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (!fbUser) {
          dbService.clearSensitiveSession();
          return;
        }

        const profile = await resolveAuthoritativeProfile(fbUser);
        if (!profile || !profile.active || profile.email === 'founder.test@example.com') {
          await firebaseSignOut(auth).catch(() => {});
          clearSessionTimestamps();
          dbService.clearSensitiveSession();
          return;
        }

        // Enforce idle & max session length policy on restore
        if (isSessionExpired(profile.role)) {
          markSessionExpiredBanner('Signed out due to inactivity');
          clearSessionTimestamps();
          await firebaseSignOut(auth).catch(() => {});
          dbService.clearSensitiveSession();
          return;
        }

        ensureSessionTimestampsInitialized();
        dbService.setCurrentUser(profile);
      } catch (err) {
        console.warn('Auth state restoration error:', err);
        dbService.clearSensitiveSession();
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === 'founder.test@example.com') {
      throw new Error('Access denied: This test founder account has been permanently disabled.');
    }
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);

    const profile = await resolveAuthoritativeProfile(cred.user);
    if (!profile) {
      await firebaseSignOut(auth).catch(() => {});
      clearSessionTimestamps();
      dbService.clearSensitiveSession();
      throw new Error('Access denied: No authorised Hospitally account profile found for this email.');
    }

    if (!profile.active) {
      await firebaseSignOut(auth).catch(() => {});
      clearSessionTimestamps();
      dbService.clearSensitiveSession();
      throw new Error('Access denied: This account has been deactivated by the Founder.');
    }

    recordSessionStart();
    dbService.setCurrentUser(profile);
    return profile;
  };

  const signOut = async () => {
    clearSessionTimestamps();
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase auth signOut warning:', e);
    } finally {
      dbService.clearSensitiveSession();
    }
  };

  // Enforce role-based idle timeout (30m founder, 60m manager/staff) & max session length (8h/12h)
  useEffect(() => {
    if (!currentUser || currentUser.role === 'guest' || typeof window === 'undefined') {
      return;
    }

    ensureSessionTimestampsInitialized();

    let lastWrite = 0;
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastWrite > 5000) {
        lastWrite = now;
        touchSessionActivity();
      }
    };

    const checkExpiration = () => {
      if (isSessionExpired(currentUser.role)) {
        markSessionExpiredBanner('Signed out due to inactivity');
        signOut();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isSessionExpired(currentUser.role)) {
          markSessionExpiredBanner('Signed out due to inactivity');
          signOut();
        } else {
          touchSessionActivity();
        }
      }
    };

    const activityEvents: (keyof WindowEventMap)[] = [
      'pointerdown',
      'keydown',
      'touchstart',
      'scroll',
    ];
    activityEvents.forEach((evt) =>
      window.addEventListener(evt, handleUserActivity, { passive: true })
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(checkExpiration, 15000);

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, [currentUser?.id, currentUser?.role]);

  const sendPasswordReset = async (email: string) => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      throw new Error('Please provide a valid email address.');
    }
    await sendPasswordResetEmail(auth, cleanEmail);
  };

  const provisionAccount = async (
    input: ProvisionAccountInput
  ): Promise<{ profile: UserProfile; authCreated: boolean }> => {
    if (!currentUser || currentUser.role !== 'founder') {
      throw new Error('Forbidden: Only the Founder can create manager or staff accounts.');
    }

    const fbCurrentUser = auth.currentUser;
    if (!fbCurrentUser) {
      throw new Error('Authentication session expired. Please sign in again.');
    }

    const idToken = await fbCurrentUser.getIdToken();
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        action: 'provision',
        ...input,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || 'Failed to provision account via backend.');
    }

    const createdProfile = normalizeUserProfile(data.profile);
    dbService.createUser(createdProfile);
    return { profile: createdProfile, authCreated: Boolean(data.authCreated) };
  };

  const setAccountActive = async (userId: string, active: boolean): Promise<void> => {
    if (!currentUser || currentUser.role !== 'founder') {
      throw new Error('Forbidden: Only the Founder can activate or deactivate accounts.');
    }
    if (userId === currentUser.id && !active) {
      throw new Error('Cannot deactivate your own active Founder account.');
    }
    dbService.setUserActiveStatus(userId, active);
  };

  const updateAccountAssignment = async (
    userId: string,
    updates: { propertyId: string; role: 'manager' | 'staff'; department: StaffDepartment }
  ): Promise<void> => {
    if (!currentUser || currentUser.role !== 'founder') {
      throw new Error('Forbidden: Only the Founder can modify account roles or property assignments.');
    }
    dbService.updateUserProfile(userId, updates);
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        loading: authLoading,
        loginWithEmail,
        signOut,
        sendPasswordReset,
        provisionAccount,
        setAccountActive,
        updateAccountAssignment,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
