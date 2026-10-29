/**
 * CLI script to archive non-pilot houses in Firestore (`archived: true`).
 * Keeps only Chipo, Chisenga, and Bobo active (`archived: false`).
 *
 * Usage:
 *   npx tsx scripts/archive-demo-houses.ts            # dry-run (default)
 *   npx tsx scripts/archive-demo-houses.ts --apply    # writes changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const PILOT_HOUSES = new Set(['chipo', 'chisenga', 'bobo']);

async function main() {
  const apply = process.argv.includes('--apply');

  const app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  });

  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = process.env.ADMIN_EMAIL || 'manager.pilot@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Hospitaly2026!';
  await signInWithEmailAndPassword(auth, email, password);

  const snap = await getDocs(collection(db, 'rooms'));
  console.log(`Found ${snap.size} room documents in Firestore.`);

  for (const d of snap.docs) {
    const data = d.data();
    const rawName = String(data.name || data.roomNumber || d.id).trim();
    const isPilot = PILOT_HOUSES.has(rawName.toLowerCase());
    const targetArchived = !isPilot;

    console.log(
      `  - ${d.id} ("${rawName}"): current archived=${Boolean(data.archived)} -> target archived=${targetArchived}`
    );

    if (apply && Boolean(data.archived) !== targetArchived) {
      await setDoc(
        doc(db, 'rooms', d.id),
        {
          archived: targetArchived,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`    [UPDATED] ${d.id} archived=${targetArchived}`);
    }
  }

  if (!apply) {
    console.log('\n[DRY RUN] No changes written. Re-run with --apply to update Firestore.');
  } else {
    console.log('\n[DONE] Archive demo houses complete.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
