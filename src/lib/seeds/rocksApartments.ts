import {
  Property,
  Room,
  QRCodeRecord,
  UserProfile,
  ServiceRequest,
  DiningItem,
  HouseGuideConfig,
} from '../../types';

export const DEFAULT_HOUSE_GUIDE: HouseGuideConfig = {
  checkInTime: '14:00',
  checkOutTime: '11:00',
  poolHours: '07:00 – 21:00 daily',
  poolRules: 'No glassware in or around the pool. Children must be supervised at all times.',
  poolGardenRules: 'No glassware in or around the pool. Children must be supervised at all times.',
  quietHours: '22:00 – 07:00',
  gateSecurity: '24-hour manned gate and electric perimeter fence. Call reception for late gate access.',
  gateInstructions: '24-hour manned gate and electric perimeter fence. Call reception for late gate access.',
  powerCuts: 'Solar and inverter backup powers lights, Wi-Fi, and TV automatically during grid outages.',
  powerWaterNotes: 'Solar and inverter backup powers lights, Wi-Fi, and TV automatically during grid outages.',
  gasInfo: 'Kitchen stove runs on LPG cylinder. If the flame weakens, send a "Gas & kitchen help" request.',
  emergencyNumbers: 'Reception: +260 97 782 8119 · Ambulance: 991 · Police: 999',
  emergencyPhone: '+260 97 782 8119',
  houseRules: [
    'Quiet hours from 22:00 to 07:00.',
    'No indoor smoking.',
    'Please turn off AC units when leaving the house.',
    'Notify reception if you are expecting visitors.',
  ],
  localTips: [
    'Waterfalls Mall is 3.5 km away for groceries, ATMs, and pharmacy.',
    'Kenneth Kaunda International Airport (KKIA) is approx. 15 min drive.',
    'Tap water is filtered and safe; bottled water is also provided in the fridge.',
  ],
  nearbyPlaces: [
    {
      name: 'Kenneth Kaunda International Airport (KKIA)',
      category: 'Airport',
      distanceKm: '11 km',
      note: 'Approx. 15 min drive along Airport Road',
    },
    {
      name: 'Waterfalls Mall',
      category: 'Shopping & Pharmacy',
      distanceKm: '3.5 km',
      note: 'Supermarket, ATMs, pharmacy & cafés',
    },
    {
      name: 'EastPark Mall',
      category: 'Dining & Retail',
      distanceKm: '12 km',
      note: 'Restaurants, cinema & international banking',
    },
    {
      name: 'Lusaka National Park',
      category: 'Wildlife & Nature',
      distanceKm: '24 km',
      note: 'White rhino sanctuary & game drives',
    },
  ],
};

export const ROCKS_APARTMENTS_PROPERTY: Property = {
  id: 'prop_rocks_lusaka',
  name: 'Rock Apartments',
  slug: 'rocks-apartments-lusaka',
  city: 'Lusaka',
  country: 'Zambia',
  timezone: 'Africa/Lusaka',
  currency: 'ZMW',
  primaryColor: '#1D2426',
  secondaryColor: '#F3EBE3',
  accentColor: '#2F7F86',
  coverImageUrl: '/images/rock-apartments-cover.jpg',
  wifiName: '8119 vip',
  wifiPassword: '@rocks.8119',
  description: 'Private pool houses and serviced apartments in Lusaka, Zambia.',
  contactPhone: '+260 97 000 0100',
  whatsappPhone: '+260 97 000 0100',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  diningEnabled: false,
  unitLabel: 'House',
  status: 'active',
  houseGuide: DEFAULT_HOUSE_GUIDE,
  createdAt: '2026-02-01T00:00:00Z',
};

export const ROCKS_ROOMS: Room[] = [];
export const ROCKS_QR_CODES: QRCodeRecord[] = [];
export const ROCKS_USERS: UserProfile[] = [];
export const ROCKS_REQUESTS: ServiceRequest[] = [];
export const ROCKS_DINING_ITEMS: DiningItem[] = [];
