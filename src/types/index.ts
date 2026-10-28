export type UserRole = 'founder' | 'manager' | 'staff' | 'guest';

export type StaffDepartment =
  | 'housekeeping'
  | 'maintenance'
  | 'concierge'
  | 'reception'
  | 'restaurant'
  | 'management'
  | 'other';

export type RequestStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export type LocationType =
  | 'room'
  | 'restaurant'
  | 'pool'
  | 'reception'
  | 'spa'
  | 'gym'
  | 'other';

export interface Property {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  wifiName: string;
  wifiPassword?: string;
  checkInTime: string;
  checkOutTime: string;
  status: 'active' | 'suspended';
  unitLabel?: 'House' | 'Room' | 'Villa' | 'Suite' | 'Chalet';
  diningEnabled?: boolean;
  errandsEnabled?: boolean;
  airportTransfersEnabled?: boolean;
  amenities?: { icon: string; label: string }[];
  nearbyAttractions?: { name: string; distance: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface Room {
  id: string;
  propertyId: string;
  buildingId?: string;
  floorId?: string;
  roomNumber: string;
  roomType: string;
  imageUrl?: string;
  status: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  activeStayId?: string;
  currentGuestName?: string;
  guestCheckOutDate?: string;
  guestPhone?: string;
  notes?: string;
  amenities?: string[];
  qrLabel?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QRCodeRecord {
  id: string;
  propertyId: string;
  roomId?: string;
  locationType: LocationType;
  token: string;
  status: 'active' | 'revoked' | 'disabled';
  createdAt: string;
  updatedAt: string;
}

export interface ServiceItem {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  category: 'housekeeping' | 'maintenance' | 'dining' | 'concierge' | 'transport' | 'other';
  icon: string;
  imageUrl?: string;
  active: boolean;
  requiresRoom: boolean;
  sortOrder: number;
  options?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: string;
  propertyId: string;
  roomId: string;
  roomNumber: string;
  guestSessionId?: string;
  serviceId?: string;
  category: 'housekeeping' | 'maintenance' | 'dining' | 'concierge' | 'transport' | 'other';
  title: string;
  description: string;
  priority: RequestPriority;
  status: RequestStatus;
  assignedTo?: {
    uid: string;
    name: string;
  };
  guestName?: string;
  guestPhone?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface UserNotificationSettings {
  enabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  onDutyNight?: boolean;
}

export interface UserProfile {
  id: string;
  propertyId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  department: StaffDepartment;
  profileImageUrl?: string;
  active: boolean;
  notificationSettings?: UserNotificationSettings;
  createdAt: string;
  updatedAt: string;
}

export interface DiningItem {
  id: string;
  propertyId: string;
  name: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'dessert';
  description: string;
  price: number;
  dietary?: string[];
  imageUrl: string;
  available: boolean;
}
