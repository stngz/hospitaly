/**
 * CLI script to archive obsolete test requests in Firestore (`archived: true`).
 * Never runs automatically in the browser; requires explicit CLI execution.
 *
 * Usage:
 *   npx tsx scripts/cleanup-test-data.ts            # dry-run (default)
 *   npx tsx scripts/cleanup-test-data.ts --apply    # writes archived=true
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const TEST_PATTERNS = [
  /e2e/i,
  /playwright/i,
  /vitest/i,
  /smoke test/i,
  /audit test/i,
];

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

  const snap = await getDocs(collection(db, 'requests'));
  const matches = snap.docs.filter((d) => {
    const data = d.data();
    if (data.archived) return false;
    const text = `${data.title || ''} ${data.description || ''} ${data.guestName || ''}`;
    return TEST_PATTERNS.some((re) => re.test(text));
  });

  console.log(`Scanned ${snap.size} requests; found ${matches.length} unarchived test requests.`);
  for (const m of matches) {
    const data = m.data();
    console.log(`  - ${m.id}: [${data.roomNumber}] "${data.title}" (${data.status})`);
    if (apply) {
      await setDoc(
        doc(db, 'requests', m.id),
        {
          archived: true,
          archivedAt: new Date().toISOString(),
          archivedBy: auth.currentUser?.uid || 'cli_script',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log(`    [ARCHIVED] ${m.id}`);
    }
  }

  if (!apply) {
    console.log('\n[DRY RUN] No changes written. Re-run with --apply to archive matching test requests.');
  } else {
    console.log('\n[DONE] Cleanup complete.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
