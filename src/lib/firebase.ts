import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? firebaseConfig.firestoreDatabaseId
  : undefined;

// Configure Firestore with auto-detecting long-polling to prevent WebChannel RPC 'Listen' stream transport errors
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  }, dbId);
} catch (e) {
  // If already initialized (e.g. HMR or re-render), retrieve existing instance
  firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db = firestoreDb;

export default app;

