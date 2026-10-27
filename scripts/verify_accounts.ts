import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { initializeFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

async function main() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

  console.log("1. Signing in as manager.pilot@example.com...");
  const managerCred = await signInWithEmailAndPassword(auth, "manager.pilot@example.com", "Hospitaly2026!");
  console.log("   Manager Auth UID:", managerCred.user.uid);

  const managerDocRef = doc(db, 'users', managerCred.user.uid);
  const managerDocSnap = await getDoc(managerDocRef);
  if (managerDocSnap.exists()) {
    console.log("   Manager Firestore Profile:", JSON.stringify(managerDocSnap.data(), null, 2));
  } else {
    console.log("   Manager Firestore Profile NOT FOUND at doc ID:", managerCred.user.uid);
  }

  console.log("\n2. Signing in as staff.pilot@example.com...");
  const staffCred = await signInWithEmailAndPassword(auth, "staff.pilot@example.com", "Hospitaly2026!");
  console.log("   Staff Auth UID:", staffCred.user.uid);

  const staffDocRef = doc(db, 'users', staffCred.user.uid);
  const staffDocSnap = await getDoc(staffDocRef);
  if (staffDocSnap.exists()) {
    console.log("   Staff Firestore Profile:", JSON.stringify(staffDocSnap.data(), null, 2));
  } else {
    console.log("   Staff Firestore Profile NOT FOUND at doc ID:", staffCred.user.uid);
  }

  console.log("\n3. Listing all users in Firestore 'users' collection (using Manager auth):");
  const allUsersSnap = await getDocs(collection(db, 'users'));
  allUsersSnap.forEach(uDoc => {
    const data = uDoc.data();
    console.log(`   - Doc ID: ${uDoc.id} | Email: ${data.email} | Name: ${data.name} | Role: ${data.role} | Prop: ${data.propertyId}`);
  });

  console.log("\n4. Checking properties in Firestore:");
  const propsSnap = await getDocs(collection(db, 'properties'));
  propsSnap.forEach(p => {
    const d = p.data();
    console.log(`   - Property ID: ${p.id} | Name: ${d.name} | unitLabel: ${d.unitLabel} | diningEnabled: ${d.diningEnabled} | errandsEnabled: ${d.errandsEnabled}`);
  });

  console.log("\n5. Checking houses/rooms in Firestore:");
  const roomsSnap = await getDocs(collection(db, 'rooms'));
  roomsSnap.forEach(r => {
    const d = r.data();
    console.log(`   - House ID: ${r.id} | Number: ${d.roomNumber} | Status: ${d.status} | activeStayId: ${d.activeStayId || 'none'}`);
  });

  console.log("\nAll account and database verifications complete!");
}

main().catch(console.error);
