/**
 * CLI migration script for legacy requests in Firestore.
 * Fills in missing fields (roomId, stayId, propertyId, history, archived, verification)
 * so older requests (such as "Gas & kitchen help" on Chisenga) can be assigned,
 * confirmed, started, and cancelled without snapping back or failing Firestore rules.
 *
 * Usage:
 *   npx tsx scripts/migrate-legacy-requests.ts            # dry-run (default)
 *   npx tsx scripts/migrate-legacy-requests.ts --apply    # writes updates to Firestore
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

const DEFAULT_PROPERTY_ID = 'prop_rocks_lusaka';

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  console.log(`=== Hospitaly Legacy Request Migration ===`);
  console.log(`Mode: ${apply ? 'APPLY (writing to Firestore)' : 'DRY-RUN (pass --apply to commit)'}\n`);

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = process.env.ADMIN_EMAIL || 'manager.pilot@example.com';
  const password = process.env.ADMIN_PASSWORD || 'Hospitaly2026!';
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    console.warn(`Auth sign in warning (proceeding):`, err);
  }

  // Load rooms to map roomNumber -> roomId and activeStayId
  const roomsSnap = await getDocs(collection(db, 'rooms'));
  const roomMap = new Map<string, { id: string; activeStayId?: string; propertyId?: string }>();
  for (const d of roomsSnap.docs) {
    const data = d.data();
    const name = String(data.name || data.roomNumber || '').trim().toLowerCase();
    if (name) {
      roomMap.set(name, { id: d.id, activeStayId: data.activeStayId, propertyId: data.propertyId });
    }
    roomMap.set(d.id.toLowerCase(), { id: d.id, activeStayId: data.activeStayId, propertyId: data.propertyId });
  }

  // Fallback map for pilot houses
  if (!roomMap.has('chisenga')) {
    roomMap.set('chisenga', { id: 'room_chisenga', activeStayId: 'stay_chisenga_active', propertyId: DEFAULT_PROPERTY_ID });
  }
  if (!roomMap.has('chipo')) {
    roomMap.set('chipo', { id: 'room_chipo', activeStayId: undefined, propertyId: DEFAULT_PROPERTY_ID });
  }
  if (!roomMap.has('bobo')) {
    roomMap.set('bobo', { id: 'room_bobo', activeStayId: 'stay_bobo_active', propertyId: DEFAULT_PROPERTY_ID });
  }

  const requestsSnap = await getDocs(collection(db, 'requests'));
  console.log(`Found ${requestsSnap.size} total requests to inspect.\n`);

  let migratedCount = 0;
  let healthyCount = 0;

  for (const d of requestsSnap.docs) {
    const req = d.data();
    const missing: string[] = [];
    const updates: Record<string, any> = {};

    // 1. Check propertyId
    if (!req.propertyId) {
      missing.push('propertyId');
      updates.propertyId = DEFAULT_PROPERTY_ID;
    }

    // 2. Check roomId
    let resolvedRoomId = req.roomId;
    if (!resolvedRoomId) {
      missing.push('roomId');
      const roomKey = String(req.roomNumber || req.roomName || '').trim().toLowerCase();
      const matched = roomMap.get(roomKey);
      resolvedRoomId = matched?.id || (roomKey.includes('chisenga') ? 'room_chisenga' : roomKey.includes('bobo') ? 'room_bobo' : 'room_chipo');
      updates.roomId = resolvedRoomId;
    }

    // 3. Check stayId
    if (!req.stayId) {
      missing.push('stayId');
      const matched = roomMap.get(String(req.roomNumber || '').toLowerCase());
      updates.stayId = matched?.activeStayId || (resolvedRoomId === 'room_chisenga' ? 'stay_chisenga_active' : resolvedRoomId === 'room_bobo' ? 'stay_bobo_active' : 'stay_legacy');
    }

    // 4. Check history array
    if (!Array.isArray(req.history) || req.history.length === 0) {
      missing.push('history');
      updates.history = [
        {
          status: req.status || 'pending',
          timestamp: req.createdAt || new Date().toISOString(),
          note: 'Request initialized (migrated from legacy shape)',
        },
      ];
    }

    // 5. Check archived flag
    if (typeof req.archived !== 'boolean') {
      missing.push('archived');
      updates.archived = false;
    }

    // 6. Check priority
    if (!req.priority) {
      missing.push('priority');
      updates.priority = 'normal';
    }

    // 7. Check category (sets category from department or 'general')
    if (!req.category) {
      missing.push('category');
      const resolvedCategory = req.department || (
        req.title?.toLowerCase().includes('clean') || req.title?.toLowerCase().includes('towel') || req.title?.toLowerCase().includes('pillow')
          ? 'housekeeping'
          : req.title?.toLowerCase().includes('broken') || req.title?.toLowerCase().includes('gas') || req.title?.toLowerCase().includes('kitchen') || req.title?.toLowerCase().includes('stove')
          ? 'maintenance'
          : 'general'
      );
      updates.category = resolvedCategory;
      console.log(`[LEGACY REQUEST FOUND] Request ID: ${d.id} has no category. Setting category -> "${resolvedCategory}"`);
    }

    // 8. Check verification for completed items
    if (req.status === 'completed' && !req.verification) {
      missing.push('verification');
      updates.verification = 'verified';
      updates.verifiedBy = 'Legacy Migration';
      updates.verifiedAt = new Date().toISOString();
    }

    if (missing.length > 0) {
      migratedCount++;
      console.log(`[REQ ${d.id}] "${req.title || 'Untitled'}" (${req.roomNumber || 'Unknown Room'})`);
      console.log(`  Missing: ${missing.join(', ')}`);
      console.log(`  Updates: ${JSON.stringify(updates)}`);

      if (apply) {
        await updateDoc(doc(db, 'requests', d.id), updates);
        console.log(`  -> Applied update to Firestore.`);
      }
    } else {
      healthyCount++;
    }
  }

  console.log(`\n=== Migration Summary ===`);
  console.log(`Total inspected: ${requestsSnap.size}`);
  console.log(`Healthy (no action required): ${healthyCount}`);
  console.log(`Requiring migration: ${migratedCount}`);

  if (!apply && migratedCount > 0) {
    console.log(`\nTo commit these updates, run:\n  npx tsx scripts/migrate-legacy-requests.ts --apply`);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
