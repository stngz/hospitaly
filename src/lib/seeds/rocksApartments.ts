import { Property, Room, QRCodeRecord, UserProfile, ServiceRequest, DiningItem } from '../../types';

export const SEED_PROPERTIES: Property[] = [
  {
    id: "prop_rocks_lusaka",
    name: "Rocks Apartments Lusaka",
    slug: "rocks-apartments",
    description: "Comfortable furnished holiday houses in Waterfalls Estate, Airport Road Corridor, Lusaka. Features private swimming pool, sun deck, fully equipped self-catering kitchen, individual air-conditioning, smart TVs, free high-speed WiFi, and 24/7 secure parking. 6.8 mi from Kenneth Kaunda International Airport, 11 mi from Lusaka Golf Club, and 12 mi from the National Museum.",
    logoUrl: "",
    coverImageUrl: "/images/rocks-suite-enhanced.jpg",
    primaryColor: "#1E3A5F", // Slate Sapphire
    secondaryColor: "#D4AF37", // Warm Ochre
    accentColor: "#3B82F6", // Pool Azure
    contactPhone: "+260 97 000 0100",
    contactEmail: "reception@rockapartments.example.com",
    address: "Waterfalls Estate, Airport Road Corridor, Lusaka",
    city: "Lusaka",
    country: "Zambia",
    timezone: "Africa/Lusaka",
    currency: "ZMW",
    wifiName: "RocksApartments_UltraFast",
    wifiPassword: "RocksPool2026",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    status: "active",
    unitLabel: "House",
    diningEnabled: false,
    errandsEnabled: false,
    airportTransfersEnabled: true,
    amenities: [
      { icon: "pool", label: "Private Pool" },
      { icon: "kitchen", label: "Full Kitchen" },
      { icon: "ac_unit", label: "Unit AC" },
      { icon: "wifi", label: "High-Speed Wi-Fi" },
    ],
    nearbyAttractions: [
      { name: "Kenneth Kaunda Int'l Airport (KKIA)", distance: "6.8 mi" },
      { name: "Lusaka Golf Club", distance: "11 mi" },
      { name: "National Museum of Zambia", distance: "12 mi" },
      { name: "Chilanga Golf Club & Munda Wanga", distance: "15 mi" },
    ],
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  }
];

export const SEED_ROOMS: Room[] = [
  { 
    id: "room_rocks_101", 
    propertyId: "prop_rocks_lusaka", 
    roomNumber: "Suite 1 (Master King)", 
    roomType: "Master En-Suite with Pool View", 
    status: "available", 
    imageUrl: "/images/rocks-suite-enhanced.jpg",
    amenities: ["Private Pool", "Full Kitchen", "Unit AC", "High-Speed Wi-Fi"],
    qrLabel: "SUITE 1",
    createdAt: "2026-02-01T00:00:00Z", 
    updatedAt: "2026-02-01T00:00:00Z" 
  },
  { 
    id: "room_rocks_102", 
    propertyId: "prop_rocks_lusaka", 
    roomNumber: "Bedroom 2 (Queen Poolside)", 
    roomType: "Deluxe Queen Bedroom", 
    status: "available", 
    imageUrl: "/images/rocks-suite-enhanced.jpg",
    amenities: ["Private Pool", "Full Kitchen", "Unit AC", "High-Speed Wi-Fi"],
    qrLabel: "BED 2",
    createdAt: "2026-02-01T00:00:00Z", 
    updatedAt: "2026-02-01T00:00:00Z" 
  },
  { 
    id: "room_rocks_103", 
    propertyId: "prop_rocks_lusaka", 
    roomNumber: "Bedroom 3 (Executive Twin)", 
    roomType: "Executive Twin Bedroom", 
    status: "available", 
    amenities: ["Private Pool", "Full Kitchen", "Unit AC", "High-Speed Wi-Fi"],
    qrLabel: "BED 3",
    createdAt: "2026-02-01T00:00:00Z", 
    updatedAt: "2026-02-01T00:00:00Z" 
  },
  { 
    id: "room_rocks_104", 
    propertyId: "prop_rocks_lusaka", 
    roomNumber: "Bedroom 4 (Garden Double)", 
    roomType: "Garden View Double Bedroom", 
    status: "available", 
    imageUrl: "/images/rocks-suite-enhanced.jpg",
    amenities: ["Private Pool", "Full Kitchen", "Unit AC", "High-Speed Wi-Fi"],
    qrLabel: "BED 4",
    createdAt: "2026-02-01T00:00:00Z", 
    updatedAt: "2026-02-01T00:00:00Z" 
  },
  { 
    id: "room_rocks_105", 
    propertyId: "prop_rocks_lusaka", 
    roomNumber: "Bedroom 5 (Penthouse Suite)", 
    roomType: "Upper Floor Balcony Suite", 
    status: "available", 
    notes: "Direct access to upper balcony terrace", 
    amenities: ["Private Pool", "Full Kitchen", "Unit AC", "High-Speed Wi-Fi"],
    qrLabel: "BED 5",
    createdAt: "2026-02-01T00:00:00Z", 
    updatedAt: "2026-02-01T00:00:00Z" 
  },
];

export const SEED_QR_CODES: QRCodeRecord[] = [
  {
    id: "qr_rocks_101",
    propertyId: "prop_rocks_lusaka",
    roomId: "room_rocks_101",
    locationType: "room",
    token: "ROCKS-SUITE1-8F21",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "qr_rocks_102",
    propertyId: "prop_rocks_lusaka",
    roomId: "room_rocks_102",
    locationType: "room",
    token: "ROCKS-BED2-4A99",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "qr_rocks_103",
    propertyId: "prop_rocks_lusaka",
    roomId: "room_rocks_103",
    locationType: "room",
    token: "ROCKS-BED3-7C12",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "qr_rocks_104",
    propertyId: "prop_rocks_lusaka",
    roomId: "room_rocks_104",
    locationType: "room",
    token: "ROCKS-BED4-3D45",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "qr_rocks_105",
    propertyId: "prop_rocks_lusaka",
    roomId: "room_rocks_105",
    locationType: "room",
    token: "ROCKS-BED5-9E88",
    status: "active",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  }
];

export const SEED_STAFF_USERS: UserProfile[] = [
  {
    id: "founder_seed_01",
    propertyId: "", // Platform-wide Founder
    name: "Nathaniel Mazaba (Founder)",
    email: "nathanielmazaba@gmail.com",
    phone: "+260 97 000 0001",
    role: "founder",
    department: "management",
    active: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "manager_seed_01",
    propertyId: "prop_rocks_lusaka",
    name: "Rocks General Manager",
    email: "manager.test@example.com",
    phone: "+260 97 000 0002",
    role: "manager",
    department: "management",
    active: true,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  },
  {
    id: "staff_seed_01",
    propertyId: "prop_rocks_lusaka",
    name: "Rocks House Attendant",
    email: "staff.test@example.com",
    phone: "+260 97 000 0003",
    role: "staff",
    department: "housekeeping",
    active: true,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
  }
];

export const SEED_DINING_ITEMS: DiningItem[] = [
  {
    id: "dine_rocks_1",
    propertyId: "prop_rocks_lusaka",
    name: "Private Poolside BBQ Platter",
    category: "dinner",
    description: "Succulent grilled beef skewers, herb-basted pork chops, garlic butter bread, and fresh garden salad served by the pool.",
    price: 320,
    dietary: ["Signature", "Poolside"],
    imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80",
    available: true,
  },
  {
    id: "dine_rocks_2",
    propertyId: "prop_rocks_lusaka",
    name: "Zambian Traditional T-Bone & Nshima",
    category: "lunch",
    description: "Generous flame-grilled T-bone steak served with steaming white nshima, chibwabwa (pumpkin leaves in peanut sauce), and tomato relish.",
    price: 240,
    dietary: ["Local Specialty"],
    imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
    available: true,
  },
  {
    id: "dine_rocks_3",
    propertyId: "prop_rocks_lusaka",
    name: "Waterfalls Sunrise Breakfast Basket",
    category: "breakfast",
    description: "Fresh warm bakery croissants, tropical fruit bowl, eggs cooked to preference, Zambian coffee and chilled orange juice.",
    price: 180,
    dietary: ["Fresh & Healthy"],
    imageUrl: "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=600&q=80",
    available: true,
  },
  {
    id: "dine_rocks_4",
    propertyId: "prop_rocks_lusaka",
    name: "Chilled Mosi Lager & Cider Bucket",
    category: "drinks",
    description: "Ice bucket with 4 cold bottles of Zambian Mosi Premium Lager and Savanna dry ciders.",
    price: 140,
    dietary: ["Chilled"],
    imageUrl: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=600&q=80",
    available: true,
  }
];

export const INITIAL_REQUESTS: ServiceRequest[] = [];
