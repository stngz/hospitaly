import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { USE_FIREBASE_EMULATOR } from './config';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

const dbId =
  !USE_FIREBASE_EMULATOR &&
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling: true,
    },
    dbId
  );
} catch {
  firestoreDb = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

let emulatorsConnected = false;
if (USE_FIREBASE_EMULATOR && !emulatorsConnected) {
  emulatorsConnected = true;
  const host =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_EMULATOR_HOST) ||
    '127.0.0.1';
  const authPort = Number(
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_AUTH_EMULATOR_PORT) ||
      9099
  );
  const firestorePort = Number(
    (typeof import.meta !== 'undefined' &&
      import.meta.env?.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT) ||
      8080
  );
  try {
    connectAuthEmulator(auth, `http://${host}:${authPort}`, { disableWarnings: true });
    connectFirestoreEmulator(firestoreDb, host, firestorePort);
  } catch {
    // Already connected
  }
}

export const db = firestoreDb;

export default app;
