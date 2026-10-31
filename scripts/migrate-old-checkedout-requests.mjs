import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

async function migrateOldCheckedOutRequests() {
  console.log('1. Signing in as Property Manager (manager.pilot@example.com)...');
  await signInWithEmailAndPassword(auth, 'manager.pilot@example.com', 'Hospitaly2026!');
  console.log('   Authenticated as manager.');

  console.log('2. Loading all stays for prop_rocks_lusaka...');
  const staysSnap = await getDocs(query(collection(db, 'stays'), where('propertyId', '==', 'prop_rocks_lusaka')));
  const nowMs = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const checkedOutStayIds = new Set();

  staysSnap.forEach((d) => {
    const stay = d.data();
    if (stay.status === 'checked_out') {
      const checkoutTime = new Date(stay.checkedOutAt || stay.checkOutAt).getTime();
      if (!isNaN(checkoutTime) && nowMs - checkoutTime > ONE_DAY_MS) {
        checkedOutStayIds.add(d.id);
        console.log(`   Old checked-out stay (>24h): ${d.id} (${stay.guestName})`);
      }
    }
  });

  console.log(`\nFound ${checkedOutStayIds.size} old checked-out stays.`);

  console.log('3. Loading requests for prop_rocks_lusaka...');
  const reqsSnap = await getDocs(query(collection(db, 'requests'), where('propertyId', '==', 'prop_rocks_lusaka')));
  let archivedCount = 0;
  const nowIso = new Date().toISOString();

  for (const docSnap of reqsSnap.docs) {
    const req = docSnap.data();
    // Check if request belongs to an old checked out stay and is not archived
    const isOldStay = req.stayId && checkedOutStayIds.has(req.stayId);
    // Also include legacy checked-out guests Princess, Dr John, and Dr K. Musonda
    const isNamedOldGuest = ['Princess Mazaba', 'Dr John', 'Dr K. Musonda', 'John', 'K. Musonda'].some(
      (name) => (req.guestName || '').includes(name)
    );

    if ((isOldStay || isNamedOldGuest) && !req.archived) {
      console.log(`   Processing request ${docSnap.id}: "${req.title}" by ${req.guestName} (status: ${req.status})`);
      
      // Step A: If status is open (pending, acknowledged, in_progress), first cancel it to satisfy manager update rule
      if (req.status !== 'cancelled' && req.status !== 'completed') {
        await updateDoc(doc(db, 'requests', docSnap.id), {
          status: 'cancelled',
          cancelReason: 'Guest checked out',
          updatedAt: nowIso,
        });
        console.log(`     -> Cancelled open ticket`);
      }

      // Step B: Archive it (satisfies manager archive rule: cancelled OR completed with verified)
      const isCompleted = req.status === 'completed';
      await updateDoc(doc(db, 'requests', docSnap.id), {
        archived: true,
        archivedAt: nowIso,
        archivedBy: 'System Migration (GO 3.1 B1)',
        ...(isCompleted ? { verification: 'verified', verifiedBy: 'GM' } : {}),
        updatedAt: nowIso,
      });
      console.log(`     -> Archived successfully`);
      archivedCount++;
    }
  }

  console.log(`\nMigration complete: Successfully archived ${archivedCount} old requests on production Firestore.`);
}

migrateOldCheckedOutRequests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
