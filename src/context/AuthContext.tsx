import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { UserProfile } from '../types';
import { dbService, subscribeToStore } from '../lib/store';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  GoogleAuthProvider, 
  signInWithPopup 
} from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInAs: (user: UserProfile) => void;
  loginWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  signUpWithEmail: (
    email: string, 
    pass: string, 
    name?: string, 
    role?: 'admin' | 'manager' | 'staff', 
    propertyId?: string
  ) => Promise<UserProfile>;
  signOut: () => Promise<void>;
  availableStaff: UserProfile[];
  signInWithGoogle: (targetRole?: 'admin' | 'staff') => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signInAs: () => {},
  loginWithEmail: async () => { throw new Error('AuthContext not initialized'); },
  signUpWithEmail: async () => { throw new Error('AuthContext not initialized'); },
  signOut: async () => {},
  availableStaff: [],
  signInWithGoogle: async () => { throw new Error('AuthContext not initialized'); },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authLoading, setAuthLoading] = useState(true);

  // Synchronize with reactive store cache
  const currentUser = useSyncExternalStore(
    subscribeToStore,
    dbService.getCurrentUser,
    dbService.getCurrentUser
  );

  const availableStaff = useSyncExternalStore(
    subscribeToStore,
    dbService.getUsers,
    dbService.getUsers
  );

  // Restore authenticated Firebase user on load
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser && fbUser.email) {
          const email = fbUser.email.toLowerCase().trim();
          const staff = dbService.getUsers();
          let matched = staff.find((u) => u.email.toLowerCase().trim() === email);

          if (!matched) {
            try {
              const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
              if (userDoc.exists()) {
                matched = userDoc.data() as UserProfile;
              }
            } catch (docErr) {
              console.warn('Could not read user profile from Firestore:', docErr);
            }
          }

          if (matched) {
            dbService.setCurrentUser(matched);
          }
        }
      } catch (err) {
        console.warn('Auth state restoration note:', err);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Shared tablet PIN access (Tier 3 floor staff)
  const signInAs = (staffMember: UserProfile) => {
    dbService.setCurrentUser(staffMember);
  };

  // Secure Firebase Email & Password login for Tier 1 Founder & Tier 2 GM
  const loginWithEmail = async (email: string, pass: string): Promise<UserProfile> => {
    const cleanEmail = email.toLowerCase().trim();
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    
    const staff = dbService.getUsers();
    let matched = staff.find((u) => u.email.toLowerCase().trim() === cleanEmail);

    if (!matched) {
      try {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        if (userDoc.exists()) {
          matched = userDoc.data() as UserProfile;
        }
      } catch (e) {
        console.warn('Could not fetch user profile from Firestore:', e);
      }
    }

    if (!matched) {
      // Auto-provision profile for known Founder or GM emails
      const isFounder = cleanEmail === 'nathanielmazaba@gmail.com' || cleanEmail.includes('founder');
      const isGM = cleanEmail === 'nathanielmazaba+gm@gmail.com' || cleanEmail === 'joe.zaza@rocksapartments.zm';
      
      matched = {
        id: cred.user.uid,
        propertyId: isFounder ? '' : 'prop_rocks_lusaka',
        name: isFounder 
          ? 'Nathaniel Mazaba (Founder)' 
          : isGM 
            ? 'Joe Zaza (General Manager)' 
            : 'Rocks Staff Member',
        email: cleanEmail,
        phone: '+260 97 555 0199',
        role: isFounder ? 'admin' : isGM ? 'manager' : 'staff',
        department: 'management',
        pinCode: isFounder ? '7777' : '1234',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      dbService.createUser(matched);
      try {
        await setDoc(doc(db, 'users', matched.id), matched, { merge: true });
      } catch (syncErr) {
        console.warn('User profile sync note:', syncErr);
      }
    }

    dbService.setCurrentUser(matched);
    return matched;
  };

  // One-time Firebase account creation for Founder / GM onboarding
  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    name?: string, 
    role?: 'admin' | 'manager' | 'staff', 
    propertyId?: string
  ): Promise<UserProfile> => {
    const cleanEmail = email.toLowerCase().trim();
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);

    const isFounder = cleanEmail === 'nathanielmazaba@gmail.com' || role === 'admin';
    const assignedRole = isFounder ? 'admin' : (role || 'manager');
    const assignedPropertyId = isFounder ? '' : (propertyId || 'prop_rocks_lusaka');
    const assignedName = name || (isFounder ? 'Nathaniel Mazaba (Founder)' : 'Joe Zaza (General Manager)');

    const newProfile: UserProfile = {
      id: cred.user.uid,
      propertyId: assignedPropertyId,
      name: assignedName,
      email: cleanEmail,
      phone: '+260 97 555 0199',
      role: assignedRole,
      department: 'management',
      pinCode: isFounder ? '7777' : '1234',
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    dbService.createUser(newProfile);
    try {
      await setDoc(doc(db, 'users', newProfile.id), newProfile, { merge: true });
    } catch (syncErr) {
      console.warn('User signup sync note:', syncErr);
    }

    dbService.setCurrentUser(newProfile);
    return newProfile;
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.warn('Firebase auth signOut warning:', e);
    }
    dbService.setCurrentUser(null);
  };

  const signInWithGoogle = async (targetRole: 'admin' | 'staff' = 'staff'): Promise<UserProfile> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const googleUser = result.user;
    const email = (googleUser.email || '').toLowerCase().trim();

    const users = dbService.getUsers();
    let matchedUser = users.find((u) => u.email.toLowerCase().trim() === email);

    if (!matchedUser) {
      const isFounder = targetRole === 'admin' || email === 'nathanielmazaba@gmail.com';
      matchedUser = {
        id: googleUser.uid,
        propertyId: isFounder ? '' : 'prop_rocks_lusaka',
        name: googleUser.displayName || (isFounder ? 'Nathaniel Mazaba (Founder)' : 'Joe Zaza (General Manager)'),
        email: googleUser.email || (isFounder ? 'nathanielmazaba@gmail.com' : 'joe.zaza@rocksapartments.zm'),
        role: isFounder ? 'admin' : 'manager',
        department: 'management',
        pinCode: isFounder ? '7777' : '1234',
        profileImageUrl: googleUser.photoURL || undefined,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dbService.createUser(matchedUser);
      try {
        await setDoc(doc(db, 'users', matchedUser.id), matchedUser, { merge: true });
      } catch (err) {
        console.warn('Google sign-in firestore sync note:', err);
      }
    }

    dbService.setCurrentUser(matchedUser);
    return matchedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        loading: authLoading,
        signInAs,
        loginWithEmail,
        signUpWithEmail,
        signOut,
        availableStaff,
        signInWithGoogle,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
