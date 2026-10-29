/**
 * CLI script to migrate occupied rooms in Firestore to explicit `stays/{stayId}` documents
 * and update Wi-Fi credentials on Rock Apartments and its 3 active houses (Chipo, Chisenga, Bobo).
 *
 * Usage:
 *   npx tsx scripts/migrate-stays.ts            # dry-run (default)
 *   npx tsx scripts/migrate-stays.ts --apply    # writes changes
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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

  const roomsSnap = await getDocs(collection(db, 'rooms'));
  console.log(`Inspecting ${roomsSnap.size} rooms for stay migration & Wi-Fi standardization...`);

  for (const d of roomsSnap.docs) {
    const room = d.data();
    const rawName = String(room.name || room.roomNumber || d.id).trim();
    const canonicalName =
      rawName.toLowerCase() === 'chipo'
        ? 'Chipo'
        : rawName.toLowerCase() === 'chisenga'
        ? 'Chisenga'
        : rawName.toLowerCase() === 'bobo'
        ? 'Bobo'
        : rawName;

    const isPilot = ['Chipo', 'Chisenga', 'Bobo'].includes(canonicalName);
    const targetWifiName = canonicalName === 'Bobo' ? 'Bobo Vip' : '8119 vip';
    const targetWifiPassword = '@rocks.8119';

    console.log(
      `  - Room ${d.id}: name="${canonicalName}", status=${room.status}, activeStayId=${room.activeStayId || 'none'}, wifi="${targetWifiName}"`
    );

    if (room.status === 'occupied' && room.activeStayId) {
      const stayRef = doc(db, 'stays', room.activeStayId);
      const staySnap = await getDoc(stayRef);
      if (!staySnap.exists()) {
        const newStay = {
          id: room.activeStayId,
          propertyId: room.propertyId || 'prop_rocks_lusaka',
          roomId: d.id,
          roomName: canonicalName,
          guestTitle: room.guestTitle || '',
          guestName: room.currentGuestName || 'Guest',
          guestPhone: room.guestPhone || '',
          checkInAt: room.updatedAt || room.createdAt || new Date().toISOString(),
          checkOutAt: room.guestCheckOutDate || new Date(Date.now() + 86400000).toISOString(),
          checkedOutAt: null,
          status: 'active',
          createdBy: auth.currentUser?.uid || 'migration',
        };
        console.log(`    -> Missing Stay doc ${room.activeStayId}; will create for ${newStay.guestName}`);
        if (apply) {
          await setDoc(stayRef, newStay, { merge: true });
        }
      }
    }

    if (apply) {
      await setDoc(
        doc(db, 'rooms', d.id),
        {
          name: canonicalName,
          roomNumber: canonicalName,
          houseType: room.houseType || room.roomType || 'Apartment',
          roomType: room.houseType || room.roomType || 'Apartment',
          archived: !isPilot,
          wifiName: targetWifiName,
          wifiPassword: targetWifiPassword,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  }

  if (!apply) {
    console.log('\n[DRY RUN] No changes written. Re-run with --apply to migrate Firestore.');
  } else {
    console.log('\n[DONE] Stay migration & Wi-Fi standardization complete.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
