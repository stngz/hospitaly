/**
 * Seed script for Firebase Emulator Suite (Auth + Firestore) or local test state.
 * Seeds the exact Rock Apartments, Lusaka pilot dataset required by docs/go/01-SPEC.md & 04-AGENT-TASKS.md:
 *   - 1 Property: Rock Apartments, Lusaka (Africa/Lusaka, ZMW)
 *   - 3 Active Houses:
 *       1. Chipo (available, Wi-Fi: "8119 vip" / "@rocks.8119", token: "ROCKSAPA-CHIPO-4550")
 *       2. Chisenga (occupied by Ms Princess Mazaba, check-out tomorrow 11:00 Lusaka, Wi-Fi: "8119 vip" / "@rocks.8119", token: "ROCKSAPA-CHISENGA-HI55")
 *       3. Bobo (occupied by Mr Chipo Mazaba, check-out today 11:00 Lusaka, Wi-Fi: "Bobo Vip" / "@rocks.8119", token: "ROCKSAPA-BOBO-867Y")
 *   - 2 Archived Demo Rooms:
 *       4. Demo Room 101 (archived: true)
 *       5. Demo Villa 202 (archived: true)
 *   - 5 Users:
 *       - Founder (founder.pilot@hospitaly.app)
 *       - GM (manager.pilot@example.com)
 *       - Housekeeping Staff (housekeeping.pilot@example.com)
 *       - Maintenance Staff (maintenance.pilot@example.com)
 *       - Deactivated Staff (inactive.pilot@example.com, active: false)
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  setDoc,
} from 'firebase/firestore';
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

const PROPERTY_ID = 'prop_rocks_lusaka';

export function buildPilotSeedData(now = new Date()) {
  const isoNow = now.toISOString();

  // Compute today 11:00 Lusaka (09:00 UTC) and tomorrow 11:00 Lusaka (09:00 UTC)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lusaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const todayStr = formatter.format(now);
  const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = formatter.format(tomorrowDate);

  const checkOutToday11 = `${todayStr}T11:00`;
  const checkOutTomorrow11 = `${tomorrowStr}T11:00`;

  const property = {
    id: PROPERTY_ID,
    name: 'Rock Apartments',
    slug: 'rocks-apartments',
    description:
      'Private serviced apartments in Lusaka with pool, garden, and dedicated on-site team.',
    logoUrl: '/images/rocks-logo.png',
    coverImageUrl: '/images/rock-apartments-cover.jpg',
    primaryColor: '#1E3A5F',
    secondaryColor: '#C8A45D',
    accentColor: '#3B82F6',
    contactPhone: '+260 97 405 6547',
    whatsappPhone: '+260 97 405 6547',
    contactEmail: 'reservations@rocksapartments.co.zm',
    address: 'Plot 8119, Off Katima Mulilo Road, Olympia Park',
    city: 'Lusaka',
    country: 'Zambia',
    timezone: 'Africa/Lusaka',
    currency: 'ZMW',
    wifiName: '8119 vip',
    wifiPassword: '@rocks.8119',
    checkInTime: '14:00',
    checkOutTime: '11:00',
    status: 'active',
    suspendedAt: null,
    suspendedBy: null,
    suspendMessage:
      "We're not taking requests through the app right now. Please contact reception: +260 97 405 6547",
    unitLabel: 'House',
    diningEnabled: false,
    errandsEnabled: false,
    airportTransfersEnabled: true,
    amenities: [
      'Private Swimming Pool',
      '24/7 Security & Electric Fence',
      'Backup Power Generator & Solar Inverter',
      'Borehole Water Supply',
      'Complimentary High-Speed Fibre Wi-Fi',
      'Secure On-Site Parking',
      'Daily Housekeeping',
      'Outdoor Braai & Garden Area',
    ],
    nearbyAttractions: [
      'Manda Hill Shopping Mall (5 mins)',
      'EastPark Mall & Arcades (8 mins)',
      'Mulungushi International Conference Centre (10 mins)',
      'Kenneth Kaunda International Airport - LUN (25 mins)',
    ],
    houseGuide: {
      emergencyPhone: '+260 97 405 6547',
      gateInstructions:
        'Our security team staffs the main gate 24 hours a day. Let reception know if you are expecting visitors.',
      powerWaterNotes:
        'Backup solar and generator power switch on automatically during ZESCO outages. Borehole water runs continuously.',
      poolGardenRules:
        'Pool hours are 07:00 to 20:00. No glassware by the pool edge. Ask housekeeping if you need fresh pool towels.',
      localTips: [
        'Manda Hill Mall — 5 mins drive',
        'EastPark Mall & Arcades — 8 mins drive',
        'Kenneth Kaunda International Airport (KKIA) — 25 mins drive',
      ],
      houseRules: [
        'Quiet hours from 22:00 to 07:00.',
        'No smoking inside the house.',
        'Visitors are welcome until 21:00; overnight visitors must register at reception.',
        'Lock doors and windows when leaving the house.',
      ],
    },
    createdAt: isoNow,
    updatedAt: isoNow,
  };

  const stays = [
    {
      id: 'stay_chisenga_active',
      propertyId: PROPERTY_ID,
      roomId: 'room_chisenga',
      roomName: 'Chisenga',
      guestTitle: 'Ms',
      guestName: 'Princess Mazaba',
      guestPhone: '+260 97 700 1122',
      checkInAt: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      checkOutAt: checkOutTomorrow11,
      checkedOutAt: null,
      status: 'active',
      createdBy: 'usr_gm_rocks',
    },
    {
      id: 'stay_bobo_active',
      propertyId: PROPERTY_ID,
      roomId: 'room_bobo',
      roomName: 'Bobo',
      guestTitle: 'Mr',
      guestName: 'Chipo Mazaba',
      guestPhone: '+260 97 700 3344',
      checkInAt: new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString(),
      checkOutAt: checkOutToday11,
      checkedOutAt: null,
      status: 'active',
      createdBy: 'usr_gm_rocks',
    },
  ];

  const rooms = [
    {
      id: 'room_chipo',
      propertyId: PROPERTY_ID,
      name: 'Chipo',
      roomNumber: 'Chipo',
      houseType: 'Two-Bedroom Garden Apartment',
      roomType: 'Two-Bedroom Garden Apartment',
      status: 'available',
      archived: false,
      wifiName: '8119 vip',
      wifiPassword: '@rocks.8119',
      amenities: ['Private Pool', 'Full Kitchen', 'Unit AC', 'High-Speed Wi-Fi'],
      houseRules: [
        'Quiet hours from 22:00 to 07:00.',
        'No smoking inside the house.',
      ],
      qrToken: 'ROCKSAPA-CHIPO-4550',
      activeStayId: null,
      currentGuestName: null,
      guestTitle: null,
      guestPhone: null,
      guestCheckOutDate: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'room_chisenga',
      propertyId: PROPERTY_ID,
      name: 'Chisenga',
      roomNumber: 'Chisenga',
      houseType: 'Garden Studio Apartment',
      roomType: 'Garden Studio Apartment',
      status: 'occupied',
      archived: false,
      wifiName: '8119 vip',
      wifiPassword: '@rocks.8119',
      amenities: ['Private Pool', 'Full Kitchen', 'Unit AC', 'High-Speed Wi-Fi'],
      houseRules: [
        'Quiet hours from 22:00 to 07:00.',
        'No smoking inside the house.',
      ],
      qrToken: 'ROCKSAPA-CHISENGA-HI55',
      activeStayId: 'stay_chisenga_active',
      currentGuestName: 'Princess Mazaba',
      guestTitle: 'Ms',
      guestPhone: '+260 97 700 1122',
      guestCheckOutDate: checkOutTomorrow11,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'room_bobo',
      propertyId: PROPERTY_ID,
      name: 'Bobo',
      roomNumber: 'Bobo',
      houseType: 'Executive Twin Suite',
      roomType: 'Executive Twin Suite',
      status: 'occupied',
      archived: false,
      wifiName: 'Bobo Vip',
      wifiPassword: '@rocks.8119',
      amenities: ['Private Pool', 'Full Kitchen', 'Unit AC', 'High-Speed Wi-Fi'],
      houseRules: [
        'Quiet hours from 22:00 to 07:00.',
        'No smoking inside the house.',
      ],
      qrToken: 'ROCKSAPA-BOBO-867Y',
      activeStayId: 'stay_bobo_active',
      currentGuestName: 'Chipo Mazaba',
      guestTitle: 'Mr',
      guestPhone: '+260 97 700 3344',
      guestCheckOutDate: checkOutToday11,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'room_demo_101',
      propertyId: PROPERTY_ID,
      name: 'Demo Room 101',
      roomNumber: 'Demo Room 101',
      houseType: 'Standard Room',
      roomType: 'Standard Room',
      status: 'available',
      archived: true,
      wifiName: '8119 vip',
      wifiPassword: '@rocks.8119',
      amenities: [],
      qrToken: 'ROCKSAPA-DEMO101-ARCH',
      activeStayId: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'room_demo_202',
      propertyId: PROPERTY_ID,
      name: 'Demo Villa 202',
      roomNumber: 'Demo Villa 202',
      houseType: 'Presidential Villa',
      roomType: 'Presidential Villa',
      status: 'available',
      archived: true,
      wifiName: '8119 vip',
      wifiPassword: '@rocks.8119',
      amenities: [],
      qrToken: 'ROCKSAPA-DEMO202-ARCH',
      activeStayId: null,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  const qrCodes = [
    {
      id: 'qr_chipo',
      propertyId: PROPERTY_ID,
      roomId: 'room_chipo',
      locationType: 'room',
      token: 'ROCKSAPA-CHIPO-4550',
      status: 'active',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'qr_chisenga',
      propertyId: PROPERTY_ID,
      roomId: 'room_chisenga',
      locationType: 'room',
      token: 'ROCKSAPA-CHISENGA-HI55',
      status: 'active',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'qr_bobo',
      propertyId: PROPERTY_ID,
      roomId: 'room_bobo',
      locationType: 'room',
      token: 'ROCKSAPA-BOBO-867Y',
      status: 'active',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'qr_revoked_old',
      propertyId: PROPERTY_ID,
      roomId: 'room_chisenga',
      locationType: 'room',
      token: 'ROCKSAPA-REVOKED-0000',
      status: 'revoked',
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  const users = [
    {
      id: 'usr_founder_hq',
      propertyId: '',
      name: 'Nathaniel (Founder)',
      email: 'founder.pilot@hospitaly.app',
      phone: '+260 97 000 0001',
      role: 'founder',
      department: 'management',
      active: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'usr_gm_rocks',
      propertyId: PROPERTY_ID,
      name: 'Mutale Banda (GM)',
      email: 'manager.pilot@example.com',
      phone: '+260 97 405 6547',
      role: 'manager',
      department: 'management',
      active: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'usr_staff_hk',
      propertyId: PROPERTY_ID,
      name: 'Grace Phiri',
      email: 'staff.pilot@example.com',
      phone: '+260 97 555 0101',
      role: 'staff',
      department: 'housekeeping',
      active: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'usr_staff_maint',
      propertyId: PROPERTY_ID,
      name: 'Kelvin Tembo',
      email: 'maintenance.pilot@example.com',
      phone: '+260 97 555 0102',
      role: 'staff',
      department: 'maintenance',
      active: true,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
    {
      id: 'usr_staff_inactive',
      propertyId: PROPERTY_ID,
      name: 'Former Staff Member',
      email: 'inactive.pilot@example.com',
      phone: '+260 97 555 0199',
      role: 'staff',
      department: 'housekeeping',
      active: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    },
  ];

  return { property, stays, rooms, qrCodes, users };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');

  const seed = buildPilotSeedData();
  console.log('=== Hospitaly Emulator Seed Plan ===');
  console.log(`Property: ${seed.property.name} (${seed.property.id})`);
  console.log(`Active Houses: ${seed.rooms.filter((r) => !r.archived).map((r) => r.name).join(', ')}`);
  console.log(`Archived Demo Houses: ${seed.rooms.filter((r) => r.archived).map((r) => r.name).join(', ')}`);
  console.log(`Active Stays: ${seed.stays.map((s) => `${s.roomName} -> ${s.guestTitle} ${s.guestName}`).join('; ')}`);
  console.log(`Users: ${seed.users.map((u) => `${u.email} (${u.role}, active=${u.active})`).join(', ')}`);

  if (!apply) {
    console.log('\n[DRY RUN] No changes written. Pass --apply to seed the Firebase Emulator (127.0.0.1:8080 & 127.0.0.1:9099).');
    return;
  }

  const app = initializeApp({
    apiKey: 'demo-api-key',
    authDomain: 'demo-hospitally.firebaseapp.com',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ai-studio-hospitally-68b68276-82ec-4e97-bb13-4ee43447f766',
  });

  const db = getFirestore(app);
  const auth = getAuth(app);
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });

  // Create Auth accounts first and capture their UIDs
  for (const user of seed.users) {
    let uid = user.id;
    try {
      const cred = await createUserWithEmailAndPassword(auth, user.email, 'Hospitaly2026!');
      uid = cred.user.uid;
    } catch {
      try {
        const cred = await signInWithEmailAndPassword(auth, user.email, 'Hospitaly2026!');
        uid = cred.user.uid;
      } catch (e) {
        console.warn(`Could not create/sign-in Auth user ${user.email}:`, e);
      }
    }
    await setDoc(doc(db, 'users', uid), { ...user, id: uid });
  }

  await setDoc(doc(db, 'properties', seed.property.id), seed.property);
  for (const stay of seed.stays) {
    await setDoc(doc(db, 'stays', stay.id), stay);
  }
  for (const room of seed.rooms) {
    await setDoc(doc(db, 'rooms', room.id), room);
  }
  for (const qr of seed.qrCodes) {
    await setDoc(doc(db, 'qrCodes', qr.id), qr);
  }

  console.log('\n[APPLIED] Emulator seeded with pilot data.');
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, '/').endsWith('seed-emulator.ts');

if (isDirectExecution) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
