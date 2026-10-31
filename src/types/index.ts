export type UserRole = 'founder' | 'manager' | 'staff' | 'guest';

export type StaffDepartment =
  | 'reception'
  | 'housekeeping'
  | 'maintenance'
  | 'concierge'
  | 'pool_garden'
  | 'management';

export type RequestCategory =
  | 'housekeeping'
  | 'maintenance'
  | 'pool_garden'
  | 'concierge'
  | 'transport'
  | 'other';

export type RequestStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export type DeliveryPreference =
  | 'knock'
  | 'bell'
  | 'ring_bell'
  | 'leave_at_door'
  | 'call_on_arrival';

export interface NearbyPlace {
  name: string;
  category: string;
  distanceKm: string;
  note?: string;
}

export interface HouseGuideConfig {
  checkInTime: string;
  checkOutTime: string;
  poolHours: string;
  poolRules: string;
  poolGardenRules?: string;
  quietHours: string;
  gateSecurity: string;
  gateInstructions?: string;
  powerCuts: string;
  powerWaterNotes?: string;
  gasInfo: string;
  emergencyNumbers: string;
  emergencyPhone?: string;
  houseRules?: string[];
  localTips?: string[];
  nearbyPlaces: NearbyPlace[];
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  city: string;
  country?: string;
  timezone: string;
  currency: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  coverImageUrl?: string;
  coverImageId?: string;
  wifiName?: string;
  wifiPassword?: string;
  description?: string;
  contactPhone?: string;
  whatsappPhone?: string;
  checkInTime?: string;
  checkOutTime?: string;
  diningEnabled?: boolean;
  unitLabel?: string;
  status: 'active' | 'suspended';
  suspendedAt?: string;
  suspendedBy?: string;
  suspendMessage?: string;
  houseGuide?: HouseGuideConfig;
  createdAt: string;
  updatedAt?: string;
}

export interface Room {
  id: string;
  propertyId: string;
  name?: string;
  roomNumber: string;
  roomType: string;
  houseType?: string;
  floor?: string;
  status: 'available' | 'occupied' | 'maintenance';
  qrCodeId?: string;
  qrToken?: string;
  qrLabel?: string;
  amenities?: string[];
  houseRules?: string | string[];
  imageId?: string;
  imageUrl?: string;
  wifiName?: string;
  wifiPassword?: string;
  guestTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | '';
  currentGuestName?: string;
  guestCheckInDate?: string;
  guestCheckOutDate?: string;
  guestPhone?: string;
  notes?: string;
  activeStayId?: string;
  archived?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Stay {
  id: string;
  propertyId: string;
  roomId: string;
  guestTitle?: 'Mr' | 'Mrs' | 'Ms' | 'Dr' | '';
  guestName: string;
  guestPhone?: string;
  checkInAt: string;
  checkOutAt: string;
  status: 'active' | 'checked_out';
  checkedOutAt?: string;
  createdBy?: string;
}

export interface QRCodeRecord {
  id: string;
  propertyId: string;
  roomId: string;
  token: string;
  status: 'active' | 'revoked';
  houseName?: string;
  houseType?: string;
  imageId?: string;
  wifiName?: string;
  wifiPassword?: string;
  guestGreeting?: string;
  activeStayId?: string | null;
  guestCheckOutDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface RequestHistoryEntry {
  status: RequestStatus;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  note?: string;
}

export interface ServiceRequest {
  id: string;
  propertyId: string;
  roomId: string;
  roomNumber: string;
  stayId: string;
  guestSessionId?: string;
  guestName?: string;
  guestPhone?: string;
  category: RequestCategory;
  title: string;
  description?: string;
  status: RequestStatus;
  priority: RequestPriority;
  deliveryPreference?: DeliveryPreference;
  qrToken?: string;
  guestUid?: string;
  estimatedTime?: string;
  verification?: 'pending' | 'verified';
  verifiedBy?: string;
  verifiedAt?: string;
  reopenReason?: string;
  cancelReason?: string;
  refCode?: string;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    uid: string;
    name: string;
    department?: StaffDepartment;
  };
  archived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  history: RequestHistoryEntry[];
}

export interface MediaItem {
  id: string;
  propertyId?: string;
  ownerType: 'house' | 'property' | 'user';
  ownerId: string;
  dataUrl: string;
  mimeType?: string;
  width: number;
  height: number;
  uploadedBy: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  propertyId?: string;
  type:
    | 'check_in'
    | 'check_out'
    | 'suspend'
    | 'resume'
    | 'account_change'
    | 'house_update'
    | 'request_archived';
  actorName: string;
  actorEmail?: string;
  summary: string;
  createdAt: string;
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
  active: boolean;
  photoId?: string;
  notificationSettings?: UserNotificationSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffDeviceRecord {
  id: string;
  userId: string;
  propertyId: string;
  fcmToken: string;
  userAgent?: string;
  platform?: string;
  enabled: boolean;
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
  imageUrl?: string;
  available: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  id: string;
  name: string;
  propertyName: string;
  propertyType: string;
  rooms?: number;
  roomCount?: number;
  city: string;
  whatsapp?: string;
  whatsappPhone?: string;
  email?: string;
  message?: string;
  source: 'landing';
  status?: 'new' | 'contacted' | 'won' | 'lost';
  notes?: string;
  createdAt: string;
}

