import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { UserProfile } from '../types';
import { dbService, subscribeToStore } from '../lib/store';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signInAs: (user: UserProfile) => void;
  signOut: () => Promise<void>;
  availableStaff: UserProfile[];
  signInWithGoogle: (targetRole?: 'admin' | 'staff') => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  signInAs: () => {},
  signOut: async () => {},
  availableStaff: [],
  signInWithGoogle: async () => { throw new Error('AuthContext not initialized'); },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use stable getters directly as getSnapshot
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

  const signInAs = (staffMember: UserProfile) => {
    dbService.setCurrentUser(staffMember);
  };

  const signOut = async () => {
    try {
      await auth.signOut();
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
        id: `user_${googleUser.uid.slice(0, 12)}`,
        propertyId: isFounder ? 'prop_zambezi_01' : 'prop_rocks_lusaka',
        name: googleUser.displayName || (isFounder ? 'Nathaniel Mazaba (Founder)' : 'Hotel Manager'),
        email: googleUser.email || (isFounder ? 'nathanielmazaba@gmail.com' : 'staff@hospitally.io'),
        role: isFounder ? 'admin' : 'manager',
        department: 'management',
        pinCode: '1234',
        profileImageUrl: googleUser.photoURL || undefined,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dbService.createUser(matchedUser);
    } else {
      // If logging into admin gate and email is the project owner
      if (targetRole === 'admin' && matchedUser.role !== 'admin' && email === 'nathanielmazaba@gmail.com') {
        matchedUser = { ...matchedUser, role: 'admin' };
        dbService.updateUserProfile(matchedUser.id, { role: 'admin' });
      }
    }

    dbService.setCurrentUser(matchedUser);
    return matchedUser;
  };

  return (
    <AuthContext.Provider
      value={{
        user: currentUser,
        loading: false,
        signInAs,
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
