import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../../context/AuthContext';
import { dbService, subscribeToStore, DEFAULT_HOUSE_AMENITIES } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import {
  RequestStatus,
  Room,
  DiningItem,
  UserNotificationSettings,
} from '../../types';
import { QRCodeView, renderPrintableQRCardCanvas } from '../common/QRCodeView';
import {
  Check,
  Clock,
  AlertTriangle,
  UserCheck,
  Building2,
  LogOut,
  Search,
  Phone,
  CheckCircle2,
  XCircle,
  Shield,
  Plus,
  QrCode,
  Printer,
  UserPlus,
  Trash2,
  Copy,
  Calendar,
  X,
  ExternalLink,
  User,
  UtensilsCrossed,
  Users,
  MessageSquare,
  Volume2,
  Camera,
  Download,
  RefreshCw,
  Bell,
  BellOff,
  Smartphone,
  Edit3,
  Moon,
  MoreHorizontal,
  Wifi,
} from 'lucide-react';

interface StaffDashboardProps {
  onSwitchToGuest?: () => void;
  onSelectRoomForGuest?: (propertySlug: string, roomId: string) => void;
  onSwitchToAdmin?: () => void;
}

type DashboardTab = 'requests' | 'rooms' | 'menu' | 'team';

const AVAILABLE_HOUSE_AMENITIES = [
  'Private Pool',
  'Full Kitchen',
  'Unit AC',
  'High-Speed Wi-Fi',
  'Private Garden',
  'Solar Power Backup',
  'Smart TV',
  'Washing Machine',
];

const HOUSE_TYPE_LABELS: Record<string, string> = {
  studio: 'Studio',
  '2bhk': '2 BHK',
  '3bhk': '3 BHK',
  '4bhk': '4 BHK',
};

function formatRelativeTime(isoDate: string): string {
  const ts = new Date(isoDate).getTime();
  if (Number.isNaN(ts)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays}d ago`;
}

function getIsoDatePlusDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onSelectRoomForGuest,
  onSwitchToAdmin,
}) => {
  const { user, signOut } = useAuth();

  // Role verification
  const isFounder = user?.role === 'founder';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'founder';
  const isStaffOnly = user?.role === 'staff';

  // Primary tab state
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('requests');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);

  // Requests filtering state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);

  // Houses filtering state
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomFilterStatus, setRoomFilterStatus] = useState<'all' | 'available' | 'occupied'>('all');

  // Modals state for House Management
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Executive Pool Villa');
  const [newHouseType, setNewHouseType] = useState<'studio' | '2bhk' | '3bhk' | '4bhk'>('2bhk');
  const [newRoomQrLabel, setNewRoomQrLabel] = useState('');
  const [newRoomWifiName, setNewRoomWifiName] = useState('');
  const [newRoomWifiPassword, setNewRoomWifiPassword] = useState('');
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>(DEFAULT_HOUSE_AMENITIES);
  const [newCustomAmenity, setNewCustomAmenity] = useState('');

  // Edit House modal state
  const [editHouseRoom, setEditHouseRoom] = useState<Room | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editHouseType, setEditHouseType] = useState<'studio' | '2bhk' | '3bhk' | '4bhk'>('2bhk');
  const [editRoomQrLabel, setEditRoomQrLabel] = useState('');
  const [editRoomWifiName, setEditRoomWifiName] = useState('');
  const [editRoomWifiPassword, setEditRoomWifiPassword] = useState('');
  const [editRoomAmenities, setEditRoomAmenities] = useState<string[]>(DEFAULT_HOUSE_AMENITIES);
  const [editCustomAmenity, setEditCustomAmenity] = useState('');

  // Check-In modal state
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null);
  const [checkInGuestTitle, setCheckInGuestTitle] = useState<'' | 'Mr' | 'Mrs' | 'Ms' | 'Dr'>('');
  const [checkInGuestName, setCheckInGuestName] = useState('');
  const [checkInCheckoutDate, setCheckInCheckoutDate] = useState(getIsoDatePlusDays(1));
  const [checkInPhone, setCheckInPhone] = useState('');

  // QR Card modal state
  const [qrPlaqueRoom, setQrPlaqueRoom] = useState<Room | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [confirmRegenerateRoom, setConfirmRegenerateRoom] = useState<Room | null>(null);

  // PWA & Push Notification state
  const [showPwaBanner, setShowPwaBanner] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      if (isStandalone) return false;
      return localStorage.getItem('hospitally_pwa_banner_dismissed_v1') !== 'true';
    } catch {
      return true;
    }
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushStatusMessage, setPushStatusMessage] = useState<string | null>(null);
  const prevPendingIdsRef = useRef<Set<string> | null>(null);

  // Modals & state for Menu & Pricing
  const [isAddDiningOpen, setIsAddDiningOpen] = useState(false);
  const [diningCategoryFilter, setDiningCategoryFilter] = useState<string>('all');
  const [diningSearchQuery, setDiningSearchQuery] = useState('');
  const [newDiningName, setNewDiningName] = useState('');
  const [newDiningCategory, setNewDiningCategory] = useState<
    'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'dessert'
  >('breakfast');
  const [newDiningDescription, setNewDiningDescription] = useState('');
  const [newDiningPrice, setNewDiningPrice] = useState<string>('150');
  const [newDiningImage, setNewDiningImage] = useState('');

  // Subscribe to reactive store
  const allRequests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  const properties = useSyncExternalStore(
    subscribeToStore,
    dbService.getProperties,
    dbService.getProperties
  );

  const allRooms = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRooms,
    dbService.getAllRooms
  );

  const allQRCodes = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllQRCodes,
    dbService.getAllQRCodes
  );

  const allDining = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllDining,
    dbService.getAllDining
  );

  const allUsers = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllUsers,
    dbService.getAllUsers
  );

  const currentProperty = properties.find((p) => p.id === user?.propertyId) || properties[0];
  const isPropertySuspended = currentProperty?.status === 'suspended';

  const propertyScopedRequests = user?.propertyId
    ? allRequests.filter((r) => r.propertyId === user.propertyId)
    : allRequests.filter((r) => !currentProperty || r.propertyId === currentProperty.id);

  const requests = isStaffOnly
    ? propertyScopedRequests.filter((r) => r.assignedTo?.uid === user?.id)
    : propertyScopedRequests;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter(
    (r) => r.status === 'in_progress' || r.status === 'acknowledged'
  ).length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;
  const unassignedCount = requests.filter(
    (r) => r.status === 'pending' && !r.assignedTo?.uid
  ).length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkUrlRequest = () => {
      const params = new URLSearchParams(window.location.search);
      const reqId = params.get('request');
      if (reqId) {
        setDashboardTab('requests');
        setFilterStatus('all');
        setHighlightedRequestId(reqId);
        setTimeout(() => {
          const el = document.getElementById(`request-card-${reqId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 250);
      }
    };
    checkUrlRequest();
    window.addEventListener('popstate', checkUrlRequest);
    return () => window.removeEventListener('popstate', checkUrlRequest);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeTotal = pendingCount + inProgressCount;
    document.title = activeTotal > 0 ? `(${activeTotal}) Hospitaly Staff` : 'Hospitaly Staff';
    return () => {
      document.title = 'Hospitaly';
    };
  }, [pendingCount, inProgressCount]);

  useEffect(() => {
    const currentPendingIds = new Set(
      requests.filter((r) => r.status === 'pending').map((r) => r.id)
    );
    if (prevPendingIdsRef.current !== null) {
      let hasNewPending = false;
      currentPendingIds.forEach((id) => {
        if (!prevPendingIdsRef.current!.has(id)) {
          hasNewPending = true;
        }
      });
      if (hasNewPending) {
        notificationService.playStaffAlertChime();
        notificationService.triggerHaptic('dispatch');
      }
    }
    prevPendingIdsRef.current = currentPendingIds;
  }, [requests]);

  if (!user || (user.role !== 'founder' && user.role !== 'manager' && user.role !== 'staff')) {
    return null;
  }

  const propertyRooms = user.propertyId
    ? allRooms.filter((r) => r.propertyId === user.propertyId)
    : allRooms.filter((r) => !currentProperty || r.propertyId === currentProperty.id);

  const propertyDining = currentProperty?.id
    ? allDining.filter((d) => d.propertyId === currentProperty.id)
    : allDining;

  const seenStaffEmails = new Set<string>();
  const propertyStaff = (
    currentProperty?.id
      ? allUsers.filter((u) => u.propertyId === currentProperty.id && u.active !== false)
      : allUsers.filter((u) => u.active !== false)
  ).filter((u) => {
    const emailLower = (u.email || '').toLowerCase();
    if (emailLower === 'founder.test@example.com') return false;
    if (u.id === 'user_manager_rocks' && u.active === false) return false;
    if (emailLower) {
      if (seenStaffEmails.has(emailLower)) return false;
      seenStaffEmails.add(emailLower);
    }
    return true;
  });

  const isDiningEnabled = currentProperty?.diningEnabled !== false;
  const unitLabel = currentProperty?.unitLabel || 'House';
  const unitLabelPlural = `${unitLabel}s`;

  const activeTab: DashboardTab = !isManagerOrAdmin
    ? 'requests'
    : !isDiningEnabled && dashboardTab === 'menu'
    ? 'requests'
    : dashboardTab;

  // Request actions
  const handleStatusUpdate = (requestId: string, newStatus: RequestStatus) => {
    if (!user || isPropertySuspended) return;
    const targetReq = requests.find((r) => r.id === requestId);
    if (!targetReq) return;
    if (isStaffOnly && targetReq.assignedTo?.uid !== user.id) {
      return;
    }
    dbService.updateRequestStatus(requestId, newStatus, {
      uid: user.id,
      name: user.name,
    });
  };

  const handleManagerCancel = (requestId: string) => {
    if (!isManagerOrAdmin || isPropertySuspended) {
      return;
    }
    dbService.updateRequestStatus(
      requestId,
      'cancelled',
      user ? { uid: user.id, name: user.name } : undefined
    );
  };

  // House actions
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim() || !newRoomType.trim() || isPropertySuspended) return;
    const propId = user?.propertyId || currentProperty?.id || 'prop_rocks_lusaka';
    const cleanQrLabel = (newRoomQrLabel.trim() || newRoomNumber.trim()).toUpperCase().slice(0, 8);
    dbService.addRoomWithQR(propId, newRoomNumber.trim(), newRoomType.trim(), {
      amenities: newRoomAmenities.length > 0 ? newRoomAmenities : DEFAULT_HOUSE_AMENITIES,
      qrLabel: cleanQrLabel,
      houseType: newHouseType,
      wifiName: newRoomWifiName.trim() || undefined,
      wifiPassword: newRoomWifiPassword.trim() || undefined,
    });
    setNewRoomNumber('');
    setNewRoomType('Executive Pool Villa');
    setNewHouseType('2bhk');
    setNewRoomQrLabel('');
    setNewRoomWifiName('');
    setNewRoomWifiPassword('');
    setNewRoomAmenities(DEFAULT_HOUSE_AMENITIES);
    setNewCustomAmenity('');
    setIsAddRoomOpen(false);
  };

  const handleOpenEditHouse = (room: Room) => {
    setEditHouseRoom(room);
    setEditRoomNumber(room.roomNumber);
    setEditRoomType(room.roomType);
    setEditHouseType((room.houseType as 'studio' | '2bhk' | '3bhk' | '4bhk') || '2bhk');
    setEditRoomQrLabel((room.qrLabel || room.roomNumber).toUpperCase().slice(0, 8));
    setEditRoomWifiName(room.wifiName || '');
    setEditRoomWifiPassword(room.wifiPassword || '');
    setEditRoomAmenities(
      Array.isArray(room.amenities) && room.amenities.length > 0
        ? room.amenities.filter((a) => !/hot\s*tub/i.test(a))
        : DEFAULT_HOUSE_AMENITIES
    );
    setEditCustomAmenity('');
  };

  const handleSaveEditHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHouseRoom || !editRoomNumber.trim() || !editRoomType.trim() || isPropertySuspended) {
      return;
    }
    const cleanQrLabel = (editRoomQrLabel.trim() || editRoomNumber.trim())
      .toUpperCase()
      .slice(0, 8);
    dbService.updateRoomDetails(editHouseRoom.id, {
      roomNumber: editRoomNumber.trim(),
      roomType: editRoomType.trim(),
      houseType: editHouseType,
      qrLabel: cleanQrLabel,
      wifiName: editRoomWifiName.trim() || undefined,
      wifiPassword: editRoomWifiPassword.trim() || undefined,
      amenities: editRoomAmenities.length > 0 ? editRoomAmenities : DEFAULT_HOUSE_AMENITIES,
    });
    setEditHouseRoom(null);
  };

  const handleDownloadSingleQRPng = async (room: Room, token: string) => {
    setIsDownloadingPng(true);
    try {
      const { dataUrl } = await renderPrintableQRCardCanvas({
        token,
        houseName: room.roomNumber,
        qrLabel: room.qrLabel,
        propertyName: currentProperty?.name || 'ROCK APARTMENTS',
        primaryColor: currentProperty?.primaryColor || '#1C2826',
      });
      const link = document.createElement('a');
      const safeHouse = room.roomNumber.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
      link.download = `QR-${safeHouse}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to generate 300 DPI QR PNG:', err);
    } finally {
      setIsDownloadingPng(false);
    }
  };

  const handleDownloadAllQRsZip = async () => {
    if (propertyRooms.length === 0) return;
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      for (const room of propertyRooms) {
        const qr = allQRCodes.find((q) => q.roomId === room.id && q.status === 'active');
        if (!qr) continue;
        const { dataUrl } = await renderPrintableQRCardCanvas({
          token: qr.token,
          houseName: room.roomNumber,
          qrLabel: room.qrLabel,
          propertyName: currentProperty?.name || 'ROCK APARTMENTS',
          primaryColor: currentProperty?.primaryColor || '#1C2826',
        });
        const base64Data = dataUrl.split(',')[1];
        const safeHouse = room.roomNumber.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
        zip.file(`QR-${safeHouse}.png`, base64Data, { base64: true });
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${currentProperty?.slug || 'rock-apartments'}-qr-cards-300dpi.zip`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Failed to generate QR ZIP archive:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleConfirmRegenerateQR = () => {
    if (!confirmRegenerateRoom || isPropertySuspended) return;
    dbService.regenerateRoomQRToken(confirmRegenerateRoom.id);
    setConfirmRegenerateRoom(null);
  };

  // PWA & Push Notification Handlers
  const handleDismissPwaBanner = () => {
    setShowPwaBanner(false);
    try {
      localStorage.setItem('hospitally_pwa_banner_dismissed_v1', 'true');
    } catch {}
  };

  const handleTriggerPwaInstall = async () => {
    if (deferredInstallPrompt) {
      try {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
      } catch {}
      setDeferredInstallPrompt(null);
    }
    handleDismissPwaBanner();
  };

  const userNotifSettings: UserNotificationSettings = user.notificationSettings || {
    enabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    onDutyNight: false,
  };

  const handleEnablePushAlerts = async () => {
    if (!user) return;
    setIsEnablingPush(true);
    setPushStatusMessage(null);
    try {
      const result = await notificationService.registerStaffPushDevice(user.id);
      if (!result.granted) {
        setPushStatusMessage(result.error || 'Notifications blocked by browser.');
        return;
      }
      if (result.token) {
        await dbService.saveStaffDeviceToken(
          user.id,
          user.propertyId || currentProperty?.id || 'prop_rocks_lusaka',
          result.token
        );
      }
      dbService.updateUserNotificationSettings(user.id, {
        ...userNotifSettings,
        enabled: true,
      });
      notificationService.playStaffAlertChime();
      setPushStatusMessage('Request alerts enabled on this device.');
    } catch (err) {
      console.warn('Enable push alerts error:', err);
      setPushStatusMessage('Could not enable push alerts.');
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleDisablePushAlerts = async () => {
    if (!user) return;
    await dbService.removeStaffDeviceToken(user.id);
    dbService.updateUserNotificationSettings(user.id, {
      ...userNotifSettings,
      enabled: false,
    });
    setPushStatusMessage('Request alerts turned off for this device.');
  };

  const handleSaveNotifPreference = (patch: Partial<UserNotificationSettings>) => {
    if (!user) return;
    dbService.updateUserNotificationSettings(user.id, {
      ...userNotifSettings,
      ...patch,
    });
  };

  const handleOpenCheckInModal = (room: Room) => {
    setCheckInRoom(room);
    setCheckInGuestTitle(room.guestTitle || '');
    setCheckInGuestName(room.currentGuestName || '');
    const existingDate = room.guestCheckOutDate || '';
    const isIso = /^\d{4}-\d{2}-\d{2}/.test(existingDate);
    setCheckInCheckoutDate(isIso ? existingDate.slice(0, 10) : getIsoDatePlusDays(1));
    setCheckInPhone(room.guestPhone || '');
  };

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInRoom || !checkInGuestName.trim() || isPropertySuspended) return;
    dbService.assignGuestToRoom(
      checkInRoom.id,
      checkInGuestName.trim(),
      checkInCheckoutDate.trim() || getIsoDatePlusDays(1),
      checkInPhone.trim() || undefined,
      checkInGuestTitle || undefined
    );
    setCheckInRoom(null);
    setCheckInGuestTitle('');
    setCheckInGuestName('');
    setCheckInCheckoutDate(getIsoDatePlusDays(1));
    setCheckInPhone('');
  };

  const handleCheckOut = (roomId: string, _roomNum: string) => {
    if (isPropertySuspended) return;
    dbService.checkOutRoom(roomId);
  };

  const handleDeleteRoom = (roomId: string, _roomNum: string) => {
    if (isPropertySuspended) return;
    dbService.deleteRoom(roomId);
  };

  // Dining actions
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Please choose an image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setNewDiningImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateDining = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDiningName.trim() || !newDiningPrice.trim() || isPropertySuspended) return;
    const propId = currentProperty?.id || 'prop_rocks_lusaka';
    dbService.addDiningItem(propId, {
      name: newDiningName.trim(),
      category: newDiningCategory,
      description: newDiningDescription.trim(),
      price: parseFloat(newDiningPrice) || 120,
      imageUrl: newDiningImage.trim() || undefined,
      available: true,
    });
    setNewDiningName('');
    setNewDiningDescription('');
    setNewDiningPrice('150');
    setNewDiningImage('');
    setIsAddDiningOpen(false);
  };

  const handleDeleteDining = (id: string, _name: string) => {
    if (isPropertySuspended) return;
    dbService.deleteDiningItem(id);
  };

  const handleToggleDiningAvailable = (item: DiningItem) => {
    if (isPropertySuspended) return;
    dbService.updateDiningItem(item.id, { available: !item.available });
  };

  // Available department filter options (exclude dining when diningEnabled === false)
  const departmentFilterOptions = [
    'all',
    'housekeeping',
    'maintenance',
    'concierge',
    'transport',
    ...(isDiningEnabled ? ['dining'] : []),
  ];

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterDepartment !== 'all' && r.category !== filterDepartment) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchRoom = r.roomNumber.toLowerCase().includes(q);
      const matchGuest = (r.guestName || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchRoom && !matchGuest && !matchDesc) return false;
    }
    return true;
  });

  // Filtered houses
  const filteredRooms = propertyRooms.filter((r) => {
    if (roomFilterStatus !== 'all' && r.status !== roomFilterStatus) return false;
    if (roomSearchQuery) {
      const q = roomSearchQuery.toLowerCase();
      const matchNum = r.roomNumber.toLowerCase().includes(q);
      const matchType = r.roomType.toLowerCase().includes(q);
      const matchGuest = (r.currentGuestName || '').toLowerCase().includes(q);
      if (!matchNum && !matchType && !matchGuest) return false;
    }
    return true;
  });

  // Filtered dining
  const filteredDining = propertyDining.filter((item) => {
    if (diningCategoryFilter !== 'all' && item.category !== diningCategoryFilter) return false;
    if (diningSearchQuery) {
      const q = diningSearchQuery.toLowerCase();
      if (
        !item.name.toLowerCase().includes(q) &&
        !item.description.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const occupiedRoomsCount = propertyRooms.filter((r) => r.status === 'occupied').length;
  const availableRoomsCount = propertyRooms.filter((r) => r.status === 'available').length;

  const selectedPlaqueQR = qrPlaqueRoom
    ? allQRCodes.find((q) => q.roomId === qrPlaqueRoom.id && q.status === 'active') ||
      allQRCodes.find((q) => q.roomId === qrPlaqueRoom.id)
    : null;

  const qrCanonicalUrl = selectedPlaqueQR
    ? `https://hospitaly.vercel.app/r/${selectedPlaqueQR.token}`
    : '';

  const handleCopyToken = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-20 overflow-x-hidden selection:bg-amber-100 selection:text-emerald-950">
      {/* Suspended Property Banner */}
      {isPropertySuspended && (
        <div className="bg-red-900 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 text-center">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-300" />
          <span>Account suspended — contact Hospitaly (Read-only mode)</span>
        </div>
      )}

      {/* Compact 56px Sticky Header */}
      <header className="bg-white border-b border-stone-900/[0.08] h-14 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 text-amber-300 flex items-center justify-center font-bold text-sm shrink-0">
            H
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-stone-900 truncate">
              {currentProperty?.name || 'Rock Apartments'}
            </h1>
            {isFounder && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-medium whitespace-nowrap">
                Viewing as founder
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!userNotifSettings.enabled ? (
            <button
              onClick={handleEnablePushAlerts}
              disabled={isEnablingPush}
              title="Turn on request alerts"
              className="px-2.5 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-amber-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isEnablingPush ? 'Enabling...' : 'Alerts Off'}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setIsNotifModalOpen(true)}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-emerald-900/[0.12] cursor-pointer"
              title="Request alerts active"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Alerts On</span>
            </button>
          )}

          {/* Overflow ⋯ menu for secondary actions */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsHeaderMenuOpen((v) => !v)}
              aria-label="Open staff menu"
              className="w-9 h-9 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {isHeaderMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsHeaderMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-stone-200 shadow-xl py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-stone-100">
                    <div className="font-bold text-stone-900 truncate">{user.name}</div>
                    <div className="text-stone-500 capitalize">
                      {user.role === 'manager' ? 'General Manager' : user.department || user.role}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      setIsNotifModalOpen(true);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Moon className="w-4 h-4 text-stone-500" />
                    Alert & quiet hours settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      notificationService.playStaffAlertChime();
                      notificationService.triggerHaptic('dispatch');
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-amber-700" />
                    Test alert chime
                  </button>
                  {isFounder && onSwitchToAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsHeaderMenuOpen(false);
                        onSwitchToAdmin();
                      }}
                      className="w-full px-3.5 py-2.5 text-left text-amber-900 font-semibold hover:bg-amber-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Shield className="w-4 h-4 text-amber-600" />
                      Founder HQ
                    </button>
                  )}
                  <div className="my-1 border-t border-stone-100" />
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      signOut();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-rose-700 hover:bg-rose-50 flex items-center gap-2.5 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Compact 1-Line Dismissible PWA Banner */}
      {showPwaBanner && (
        <div className="bg-stone-950 text-stone-100 border-b border-stone-800 px-4 py-2 no-print">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">
                Add Hospitaly to your home screen for instant alerts
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {deferredInstallPrompt && (
                <button
                  onClick={handleTriggerPwaInstall}
                  className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Install
                </button>
              )}
              <button
                onClick={handleDismissPwaBanner}
                aria-label="Dismiss install banner"
                className="p-1 text-stone-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-3.5">
        {/* Single Horizontal Scrollable Tab Bar */}
        <div className="flex items-center justify-between gap-2 border-b border-stone-900/[0.08] pb-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap">
            <button
              onClick={() => setDashboardTab('requests')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer shrink-0 ${
                activeTab === 'requests'
                  ? 'bg-brand-primary text-brand-secondary shadow-2xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-900/[0.08]'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Requests</span>
              {unassignedCount > 0 && (
                <span
                  className="w-2 h-2 rounded-full bg-red-500"
                  title={`${unassignedCount} unassigned request(s)`}
                />
              )}
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'requests'
                    ? 'bg-brand-secondary text-stone-950'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                {pendingCount + inProgressCount}
              </span>
            </button>

            {isManagerOrAdmin && (
              <button
                onClick={() => setDashboardTab('rooms')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'rooms'
                    ? 'bg-brand-primary text-brand-secondary shadow-2xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-900/[0.08]'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{unitLabelPlural}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'rooms'
                      ? 'bg-brand-secondary text-stone-950'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {propertyRooms.length}
                </span>
              </button>
            )}

            {isManagerOrAdmin && isDiningEnabled && (
              <button
                onClick={() => setDashboardTab('menu')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'menu'
                    ? 'bg-brand-primary text-brand-secondary shadow-2xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-900/[0.08]'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Menu</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'menu'
                      ? 'bg-brand-secondary text-stone-950'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {propertyDining.length}
                </span>
              </button>
            )}

            {isManagerOrAdmin && (
              <button
                onClick={() => setDashboardTab('team')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer shrink-0 ${
                  activeTab === 'team'
                    ? 'bg-brand-primary text-brand-secondary shadow-2xs'
                    : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-900/[0.08]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'team'
                      ? 'bg-brand-secondary text-stone-950'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {propertyStaff.length}
                </span>
              </button>
            )}
          </div>

          {activeTab === 'rooms' && isManagerOrAdmin && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleDownloadAllQRsZip}
                disabled={isDownloadingZip || propertyRooms.length === 0}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-900/[0.12] rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                title="Download 300 DPI printable QR cards for all houses as a ZIP"
              >
                <Download className="w-3.5 h-3.5 text-emerald-900" />
                <span className="hidden sm:inline">
                  {isDownloadingZip ? 'Bundling...' : 'All QRs (ZIP)'}
                </span>
              </button>
              <button
                onClick={() => setIsAddRoomOpen(true)}
                disabled={isPropertySuspended}
                className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary text-brand-secondary rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add {unitLabel}</span>
              </button>
            </div>
          )}

          {activeTab === 'menu' && isManagerOrAdmin && isDiningEnabled && (
            <button
              onClick={() => setIsAddDiningOpen(true)}
              disabled={isPropertySuspended}
              className="flex items-center gap-1 px-3 py-1.5 bg-brand-primary text-brand-secondary rounded-xl text-xs font-semibold shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          )}
        </div>

        {/* TAB 1: LIVE REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {/* Compact 1-Line Stat Chips Bar */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Pending <strong className="text-stone-950">{pendingCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                In progress <strong className="text-stone-950">{inProgressCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Done <strong className="text-stone-950">{completedCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-stone-400" />
                Cancelled <strong className="text-stone-950">{cancelledCount}</strong>
              </span>
            </div>

            {/* Compact Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search house, request, or guest..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                </div>

                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  aria-label="Filter by department"
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-800 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-900 shrink-0"
                >
                  {departmentFilterOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept === 'all'
                        ? 'All depts'
                        : dept.charAt(0).toUpperCase() + dept.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap">
                {['all', 'pending', 'acknowledged', 'in_progress', 'completed', 'cancelled'].map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer shrink-0 ${
                        filterStatus === status
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Request Cards Feed */}
            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
                  No matching service requests found.
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const cleanHouseName = req.roomNumber.replace(/^house\s+/i, '').trim();
                  return (
                    <div
                      id={`request-card-${req.id}`}
                      key={req.id}
                      className={`bg-white rounded-2xl border p-4 shadow-2xs transition-all space-y-3 ${
                        highlightedRequestId === req.id
                          ? 'border-amber-500 ring-2 ring-amber-400/50 bg-amber-50/20'
                          : 'border-stone-200/90 hover:border-stone-300'
                      }`}
                    >
                      {/* Row 1: House pill, category, priority, relative time */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-950 rounded-md">
                            {cleanHouseName}
                          </span>
                          <span className="text-xs font-semibold capitalize text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                            {req.category}
                          </span>
                          {req.priority === 'urgent' && (
                            <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-md flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Urgent
                            </span>
                          )}
                          {req.priority === 'high' && (
                            <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                              High
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-stone-500">
                          {formatRelativeTime(req.createdAt)}
                        </span>
                      </div>

                      {/* Row 2: Request title & optional description */}
                      <div>
                        <h3 className="text-base font-bold text-stone-900 leading-snug">
                          {req.title}
                        </h3>
                        {req.description && (
                          <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100 mt-1.5">
                            &ldquo;{req.description}&rdquo;
                          </p>
                        )}
                      </div>

                      {/* Row 3: Guest name · phone on 1 line in sans font */}
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-600 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-stone-800 truncate">
                            {req.guestName || 'Guest'}
                          </span>
                          {req.guestPhone && (
                            <>
                              <span>&middot;</span>
                              <span className="whitespace-nowrap">{req.guestPhone}</span>
                            </>
                          )}
                        </div>
                        {req.assignedTo && (
                          <span className="text-emerald-900 font-semibold">
                            Assigned: {req.assignedTo.name}
                          </span>
                        )}
                      </div>

                      {/* Row 4: Full-width Assign Staff selector */}
                      {isManagerOrAdmin && (
                        <div className="pt-2 border-t border-stone-100">
                          <select
                            aria-label="Assign staff member"
                            disabled={isPropertySuspended}
                            value={req.assignedTo?.uid || ''}
                            onChange={(e) => {
                              const staffUid = e.target.value;
                              if (!staffUid) {
                                dbService.updateRequestStatus(req.id, req.status, undefined);
                              } else {
                                const selectedMember = propertyStaff.find(
                                  (s) => s.id === staffUid
                                );
                                if (selectedMember) {
                                  dbService.updateRequestStatus(
                                    req.id,
                                    req.status === 'pending' ? 'acknowledged' : req.status,
                                    {
                                      uid: selectedMember.id,
                                      name: selectedMember.name,
                                    }
                                  );
                                  notificationService.notify({
                                    title: 'Staff Assigned',
                                    subtitle: `${selectedMember.name} assigned to ${cleanHouseName}`,
                                    roomNumber: cleanHouseName,
                                    category: req.category,
                                  });
                                }
                              }
                            }}
                            className="w-full text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-medium focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="">Assign staff member...</option>
                            {propertyStaff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} (
                                {s.role === 'manager'
                                  ? 'General Manager'
                                  : s.department
                                  ? s.department.charAt(0).toUpperCase() + s.department.slice(1)
                                  : 'Staff'}
                                )
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Row 5: Action buttons in one equal-width row */}
                      <div className="flex items-center gap-2 pt-1">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `*Hospitally Staff Dispatch*\n` +
                              `Property: ${currentProperty?.name || 'Rock Apartments'}\n` +
                              `House: ${cleanHouseName}\n` +
                              `Guest: ${req.guestName || 'Guest'}${req.guestPhone ? ` (${req.guestPhone})` : ''}\n` +
                              `Request: ${req.title}\n` +
                              (req.description ? `Details: ${req.description}\n` : '') +
                              `Priority: ${req.priority.toUpperCase()}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                          <span>WhatsApp</span>
                        </a>

                        {req.status === 'pending' && (
                          <button
                            disabled={isPropertySuspended}
                            onClick={() => handleStatusUpdate(req.id, 'acknowledged')}
                            className="flex-1 py-2 px-2.5 bg-stone-900 text-white hover:bg-stone-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}

                        {req.status === 'acknowledged' && (
                          <button
                            disabled={isPropertySuspended}
                            onClick={() => handleStatusUpdate(req.id, 'in_progress')}
                            className="flex-1 py-2 px-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Start</span>
                          </button>
                        )}

                        {req.status === 'in_progress' && (
                          <button
                            disabled={isPropertySuspended}
                            onClick={() => handleStatusUpdate(req.id, 'completed')}
                            className="flex-1 py-2 px-2.5 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        )}

                        {req.status === 'completed' && (
                          <span className="flex-1 py-2 px-2.5 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                          </span>
                        )}

                        {req.status === 'cancelled' && (
                          <span className="flex-1 py-2 px-2.5 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Cancelled
                          </span>
                        )}

                        {isManagerOrAdmin &&
                          req.status !== 'completed' &&
                          req.status !== 'cancelled' && (
                            <button
                              disabled={isPropertySuspended}
                              onClick={() => handleManagerCancel(req.id)}
                              title="Cancel request"
                              className="py-2 px-3 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HOUSES, CHECK-IN & QR CODES */}
        {activeTab === 'rooms' && (
          <div className="space-y-3.5">
            {/* Compact Houses Stat Chips */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                {unitLabelPlural} <strong className="text-stone-950">{propertyRooms.length}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Occupied <strong className="text-stone-950">{occupiedRoomsCount}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Available <strong className="text-stone-950">{availableRoomsCount}</strong>
              </span>
            </div>

            {/* House Filters & Search */}
            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by house name, type, or guest..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'available', 'occupied'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setRoomFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      roomFilterStatus === status
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Houses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
                  No houses match your filter.
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const isOccupied = room.status === 'occupied';
                  const roomAmenities = (room.amenities || DEFAULT_HOUSE_AMENITIES).filter(
                    (a) => !/hot\s*tub/i.test(a)
                  );
                  const houseTypeBadge = room.houseType
                    ? HOUSE_TYPE_LABELS[room.houseType]
                    : null;
                  const formattedGuest = [room.guestTitle, room.currentGuestName]
                    .filter(Boolean)
                    .join(' ')
                    .trim();

                  return (
                    <div
                      key={room.id}
                      className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs hover:border-stone-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xl font-serif font-bold text-stone-900 truncate">
                              {room.roomNumber}
                            </span>
                            {houseTypeBadge && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 shrink-0">
                                {houseTypeBadge}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => handleOpenEditHouse(room)}
                                title={`Edit ${unitLabel} details`}
                                className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span
                              className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                isOccupied
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {room.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-stone-500 font-medium mb-2.5">{room.roomType}</p>

                        {/* Configured House Amenities */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {roomAmenities.map((amenity) => (
                            <span
                              key={amenity}
                              className="text-xs font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/70"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>

                        {/* Guest Personalization Details */}
                        {isOccupied && formattedGuest ? (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1 mb-3 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                              <User className="w-3.5 h-3.5 text-emerald-800" />
                              <span>{formattedGuest}</span>
                            </div>
                            {room.guestCheckOutDate && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Check-out: {room.guestCheckOutDate}</span>
                              </div>
                            )}
                            {room.guestPhone && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-800 whitespace-nowrap">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{room.guestPhone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl mb-3 text-xs text-stone-500">
                            Ready for arriving guest check-in
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-stone-100 space-y-2">
                        <div className="flex items-center gap-2">
                          {isOccupied ? (
                            <>
                              <button
                                disabled={isPropertySuspended}
                                onClick={() => handleCheckOut(room.id, room.roomNumber)}
                                className="flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Check Out
                              </button>
                              <button
                                disabled={isPropertySuspended}
                                onClick={() => handleOpenCheckInModal(room)}
                                className="py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                Edit Guest
                              </button>
                            </>
                          ) : (
                            <button
                              disabled={isPropertySuspended}
                              onClick={() => handleOpenCheckInModal(room)}
                              className="flex-1 py-2 px-3 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Check In Guest
                            </button>
                          )}

                          {isManagerOrAdmin && (
                            <button
                              disabled={isPropertySuspended}
                              onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                              title={`Delete ${unitLabel}`}
                              className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => setQrPlaqueRoom(room)}
                          className="w-full py-2 px-3 bg-[#1B3B2B] text-amber-300 hover:bg-[#152e22] text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" />
                          <span>Print / Download QR Card</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MENU & PRICING */}
        {activeTab === 'menu' && isManagerOrAdmin && (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search dining menu dishes, drinks..."
                  value={diningSearchQuery}
                  onChange={(e) => setDiningSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                {(['all', 'breakfast', 'lunch', 'dinner', 'drinks', 'dessert'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setDiningCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors cursor-pointer ${
                        diningCategoryFilter === cat
                          ? 'bg-emerald-950 text-amber-300'
                          : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold uppercase tracking-wider text-stone-600">
                      <th className="py-3 px-4">Item & Description</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Price</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {filteredDining.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-stone-500">
                          No dining items found for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredDining.map((item) => (
                        <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.name}
                                  className="w-11 h-11 rounded-lg object-cover border border-stone-200 shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 shrink-0">
                                  <UtensilsCrossed className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-stone-900 block leading-tight">
                                  {item.name}
                                </span>
                                <span className="text-xs text-stone-500 line-clamp-1 max-w-sm mt-0.5">
                                  {item.description}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-stone-700 capitalize">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-stone-900">
                            {currentProperty?.currency || 'ZMW'} {item.price}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleDiningAvailable(item)}
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                                item.available
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  item.available ? 'bg-emerald-600' : 'bg-stone-400'
                                }`}
                              />
                              <span>{item.available ? 'In Stock' : 'Sold Out'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteDining(item.id, item.name)}
                              title="Delete menu item"
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: TEAM & STAFF */}
        {activeTab === 'team' && isManagerOrAdmin && (
          <div className="space-y-4">
            <div className="bg-brand-primary text-stone-100 p-5 rounded-2xl shadow-2xs border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">
                  Authorised Property Staff
                </h2>
                <p className="text-xs text-stone-300 mt-0.5 max-w-xl">
                  Account creation, role assignments, and password resets are managed in Hospitally
                  HQ.
                </p>
              </div>
              {isFounder && onSwitchToAdmin && (
                <button
                  onClick={onSwitchToAdmin}
                  className="px-3.5 py-2 bg-brand-secondary hover:opacity-90 text-stone-950 rounded-xl text-xs font-bold transition-opacity flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>Manage in Founder HQ</span>
                </button>
              )}
            </div>

            {/* Mobile Stacked Cards (< 768px) — zero horizontal scroll */}
            <div className="md:hidden space-y-2.5">
              {propertyStaff.map((staff) => {
                const isCurrent = user?.id === staff.id;
                const isGM = staff.role === 'manager';
                return (
                  <div
                    key={staff.id}
                    className={`bg-white rounded-2xl border p-4 space-y-2 ${
                      isCurrent ? 'border-amber-300 bg-amber-50/20' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-stone-900">{staff.name}</span>
                          {isCurrent && (
                            <span className="text-xs font-semibold bg-brand-primary text-brand-secondary px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-600 capitalize mt-0.5">
                          {staff.role === 'founder'
                            ? 'Founder'
                            : isGM
                            ? 'General Manager'
                            : `Staff · ${staff.department || 'Reception'}`}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        Active
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 space-y-1">
                      <div className="break-all">{staff.email}</div>
                      {staff.phone && (
                        <div className="whitespace-nowrap font-medium text-stone-700">
                          {staff.phone}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold uppercase tracking-wider text-stone-600">
                      <th className="py-3 px-4">Team Member</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {propertyStaff.map((staff) => {
                      const isCurrent = user?.id === staff.id;
                      const isGM = staff.role === 'manager';
                      return (
                        <tr
                          key={staff.id}
                          className={`hover:bg-stone-50/70 transition-colors ${
                            isCurrent ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-stone-900">{staff.name}</span>
                                {isCurrent && (
                                  <span className="text-xs font-bold bg-brand-primary text-brand-secondary px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-stone-500 flex items-center gap-2 mt-0.5">
                                <span>{staff.email}</span>
                                {staff.phone && (
                                  <span className="whitespace-nowrap">&bull; {staff.phone}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                staff.role === 'founder'
                                  ? 'bg-purple-100 text-purple-900'
                                  : isGM
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-stone-100 text-stone-700'
                              }`}
                            >
                              {staff.role === 'founder'
                                ? 'Founder'
                                : isGM
                                ? 'General Manager'
                                : 'Staff'}
                            </span>
                          </td>
                          <td className="py-3 px-4 capitalize font-medium text-stone-700">
                            {staff.department}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              Active
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD NEW HOUSE */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Add New {unitLabel}</h2>
              </div>
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    {unitLabel} Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bobo, Chisenga"
                    value={newRoomNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewRoomNumber(val);
                      if (
                        !newRoomQrLabel ||
                        newRoomQrLabel === newRoomNumber.toUpperCase().slice(0, 8)
                      ) {
                        setNewRoomQrLabel(val.trim().toUpperCase().slice(0, 8));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    QR Label (≤8)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    placeholder="BOBO"
                    value={newRoomQrLabel}
                    onChange={(e) => setNewRoomQrLabel(e.target.value.toUpperCase().slice(0, 8))}
                    className="w-full px-3 py-2.5 text-sm font-mono font-bold uppercase rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Size / Layout
                  </label>
                  <select
                    value={newHouseType}
                    onChange={(e) =>
                      setNewHouseType(e.target.value as 'studio' | '2bhk' | '3bhk' | '4bhk')
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                  >
                    <option value="studio">Studio</option>
                    <option value="2bhk">2 BHK</option>
                    <option value="3bhk">3 BHK</option>
                    <option value="4bhk">4 BHK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomType}
                    onChange={(e) => setNewRoomType(e.target.value)}
                    placeholder="Executive Pool Villa"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    House Wi-Fi Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newRoomWifiName}
                    onChange={(e) => setNewRoomWifiName(e.target.value)}
                    placeholder={currentProperty?.wifiName || 'Rocks_Guest_5G'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    House Wi-Fi Password
                  </label>
                  <input
                    type="text"
                    value={newRoomWifiPassword}
                    onChange={(e) => setNewRoomWifiPassword(e.target.value)}
                    placeholder={currentProperty?.wifiPassword || 'Rocks Lusaka2026'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  {unitLabel} Amenities
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Array.from(new Set([...AVAILABLE_HOUSE_AMENITIES, ...newRoomAmenities])).map(
                    (amenity) => {
                      const selected = newRoomAmenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => {
                            setNewRoomAmenities((prev) =>
                              prev.includes(amenity)
                                ? prev.filter((a) => a !== amenity)
                                : [...prev, amenity]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                            selected
                              ? 'bg-emerald-950 text-amber-300 border-emerald-950'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {selected ? `✓ ${amenity}` : `+ ${amenity}`}
                        </button>
                      );
                    }
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom amenity..."
                    value={newCustomAmenity}
                    onChange={(e) => setNewCustomAmenity(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newCustomAmenity.trim();
                      if (val && !/hot\s*tub/i.test(val) && !newRoomAmenities.includes(val)) {
                        setNewRoomAmenities((prev) => [...prev, val]);
                      }
                      setNewCustomAmenity('');
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Create {unitLabel} & Generate QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1B: EDIT HOUSE DETAILS & AMENITIES */}
      {editHouseRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Edit {unitLabel}</h2>
              </div>
              <button
                onClick={() => setEditHouseRoom(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditHouse} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    {unitLabel} Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    QR Label (≤8)
                  </label>
                  <input
                    type="text"
                    maxLength={8}
                    value={editRoomQrLabel}
                    onChange={(e) => setEditRoomQrLabel(e.target.value.toUpperCase().slice(0, 8))}
                    className="w-full px-3 py-2.5 text-sm font-mono font-bold uppercase rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Size / Layout
                  </label>
                  <select
                    value={editHouseType}
                    onChange={(e) =>
                      setEditHouseType(e.target.value as 'studio' | '2bhk' | '3bhk' | '4bhk')
                    }
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                  >
                    <option value="studio">Studio</option>
                    <option value="2bhk">2 BHK</option>
                    <option value="3bhk">3 BHK</option>
                    <option value="4bhk">4 BHK</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Subtitle / Description
                  </label>
                  <input
                    type="text"
                    required
                    value={editRoomType}
                    onChange={(e) => setEditRoomType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    House Wi-Fi Name
                  </label>
                  <input
                    type="text"
                    value={editRoomWifiName}
                    onChange={(e) => setEditRoomWifiName(e.target.value)}
                    placeholder={currentProperty?.wifiName || 'Rocks_Guest_5G'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    House Wi-Fi Password
                  </label>
                  <input
                    type="text"
                    value={editRoomWifiPassword}
                    onChange={(e) => setEditRoomWifiPassword(e.target.value)}
                    placeholder={currentProperty?.wifiPassword || 'Rocks Lusaka2026'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  {unitLabel} Amenities
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Array.from(new Set([...AVAILABLE_HOUSE_AMENITIES, ...editRoomAmenities])).map(
                    (amenity) => {
                      const selected = editRoomAmenities.includes(amenity);
                      return (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() => {
                            setEditRoomAmenities((prev) =>
                              prev.includes(amenity)
                                ? prev.filter((a) => a !== amenity)
                                : [...prev, amenity]
                            );
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                            selected
                              ? 'bg-emerald-950 text-amber-300 border-emerald-950'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {selected ? `✓ ${amenity}` : `+ ${amenity}`}
                        </button>
                      );
                    }
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom amenity..."
                    value={editCustomAmenity}
                    onChange={(e) => setEditCustomAmenity(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = editCustomAmenity.trim();
                      if (val && !/hot\s*tub/i.test(val) && !editRoomAmenities.includes(val)) {
                        setEditRoomAmenities((prev) => [...prev, val]);
                      }
                      setEditCustomAmenity('');
                    }}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditHouseRoom(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECK IN GUEST */}
      {checkInRoom && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Check In Guest</h2>
                  <p className="text-xs text-stone-500 font-medium">
                    {checkInRoom.roomNumber} &bull; {checkInRoom.roomType}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCheckInRoom(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Title
                  </label>
                  <select
                    value={checkInGuestTitle}
                    onChange={(e) =>
                      setCheckInGuestTitle(e.target.value as '' | 'Mr' | 'Mrs' | 'Ms' | 'Dr')
                    }
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                  >
                    <option value="">None</option>
                    <option value="Mr">Mr</option>
                    <option value="Mrs">Mrs</option>
                    <option value="Ms">Ms</option>
                    <option value="Dr">Dr</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Guest Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mwape, Mulenga"
                    value={checkInGuestName}
                    onChange={(e) => setCheckInGuestName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Check-Out Date *
                </label>
                <input
                  type="date"
                  required
                  value={checkInCheckoutDate}
                  onChange={(e) => setCheckInCheckoutDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 mb-2"
                />
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-stone-400">Quick select:</span>
                  <button
                    type="button"
                    onClick={() => setCheckInCheckoutDate(getIsoDatePlusDays(1))}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium cursor-pointer"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckInCheckoutDate(getIsoDatePlusDays(2))}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium cursor-pointer"
                  >
                    +2 Nights
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckInCheckoutDate(getIsoDatePlusDays(3))}
                    className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-stone-700 font-medium cursor-pointer"
                  >
                    +3 Nights
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Guest Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+260 97 123 4567"
                  value={checkInPhone}
                  onChange={(e) => setCheckInPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckInRoom(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE 85 × 120 MM QR CARD MODAL (Full-screen mobile sheet on small viewports) */}
      {qrPlaqueRoom && selectedPlaqueQR && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex flex-col justify-end sm:justify-center sm:items-center sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl max-h-[96vh] flex flex-col justify-between overflow-hidden shadow-modal border border-stone-900/[0.08]">
            {/* Sheet Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-stone-100 shrink-0 no-print">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shrink-0">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-stone-900 truncate">
                    {qrPlaqueRoom.roomNumber} &middot; QR Card
                  </h2>
                  <p className="text-xs text-stone-500 truncate">85 &times; 120 mm &bull; 300 DPI</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setConfirmRegenerateRoom(null);
                  setQrPlaqueRoom(null);
                }}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Preview Body — fits inside 390px viewport with zero horizontal clipping */}
            <div className="p-4 overflow-y-auto flex-1 flex flex-col items-center justify-center">
              <div
                id="printable-plaque-card"
                className="w-full max-w-[290px] sm:max-w-[310px] mx-auto bg-white text-stone-950 border border-stone-900 shadow-elevated rounded-xl relative overflow-hidden flex flex-col items-center justify-between text-center px-5 pb-4"
              >
                {/* Thin top band in property primary color */}
                <div
                  className="w-[calc(100%+40px)] -mx-5 h-2 shrink-0"
                  style={{ backgroundColor: currentProperty?.primaryColor || '#1C2826' }}
                />

                {/* Top: ROCK APARTMENTS */}
                <div className="pt-4">
                  <span className="text-xs font-bold tracking-[0.22em] uppercase text-stone-900 block">
                    {(currentProperty?.name || 'ROCK APARTMENTS')
                      .replace(/\s+LUSAKA$/i, '')
                      .toUpperCase()}
                  </span>
                </div>

                {/* Centre: High-EC QR code with centered house name label */}
                <div className="my-2.5 flex items-center justify-center w-full">
                  <QRCodeView
                    value={selectedPlaqueQR.token}
                    size={196}
                    houseName={qrPlaqueRoom.roomNumber}
                    qrLabel={qrPlaqueRoom.qrLabel}
                    className="mx-auto"
                  />
                </div>

                {/* Under QR: Big serif house name + 1-line instruction */}
                <div className="space-y-1">
                  <h3 className="text-2xl sm:text-3xl font-serif font-bold text-stone-950 tracking-tight leading-none">
                    {qrPlaqueRoom.roomNumber}
                  </h3>
                  <p className="text-xs font-medium text-stone-700">
                    Scan for Wi-Fi, house guide &amp; requests
                  </p>
                </div>

                {/* Bottom note */}
                <div className="pt-2.5 mt-2.5 border-t border-stone-200 w-full">
                  <p className="text-xs text-stone-500 font-normal">
                    No app needed &middot; Works on any phone camera
                  </p>
                </div>
              </div>

              {/* Regenerate QR Warning Confirmation */}
              {confirmRegenerateRoom?.id === qrPlaqueRoom.id && (
                <div className="mt-3 w-full p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2.5 no-print">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">
                        Old printed cards for {qrPlaqueRoom.roomNumber} will stop working
                      </p>
                      <p className="text-amber-800 mt-0.5">
                        You will need to download and print the new QR card for this house.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmRegenerateRoom(null)}
                      className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-semibold rounded-xl border border-stone-200 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRegenerateQR}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer"
                    >
                      Regenerate QR
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Bottom Action Bar (Excluded from Print) */}
            <div className="p-4 border-t border-stone-100 bg-stone-50/80 space-y-2.5 shrink-0 no-print">
              <div className="flex items-center justify-between gap-1.5">
                <button
                  onClick={() => handleCopyToken(qrCanonicalUrl || selectedPlaqueQR.token)}
                  className="flex-1 py-2 px-2.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>

                {onSelectRoomForGuest && (
                  <button
                    onClick={() => {
                      onSelectRoomForGuest(currentProperty.slug, qrPlaqueRoom.id);
                      setQrPlaqueRoom(null);
                    }}
                    className="flex-1 py-2 px-2.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test as guest</span>
                  </button>
                )}

                {isManagerOrAdmin && (
                  <button
                    type="button"
                    disabled={isPropertySuspended}
                    onClick={() => setConfirmRegenerateRoom(qrPlaqueRoom)}
                    className="py-2 px-2.5 bg-white hover:bg-amber-50 border border-stone-200 text-stone-600 hover:text-amber-900 text-xs font-semibold rounded-xl flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    title="Regenerate QR"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isDownloadingPng}
                  onClick={() => handleDownloadSingleQRPng(qrPlaqueRoom, selectedPlaqueQR.token)}
                  className="flex-1 py-2.5 px-3.5 bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloadingPng ? 'Rendering...' : 'Download PNG'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 px-3.5 bg-emerald-950 text-amber-300 hover:bg-emerald-900 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PUSH NOTIFICATIONS & QUIET HOURS SETTINGS */}
      {isNotifModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">
                    Request Alerts &amp; Quiet Hours
                  </h2>
                  <p className="text-xs text-stone-500">
                    Phone push notifications &amp; night shift controls
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pushStatusMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
                {pushStatusMessage}
              </div>
            )}

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-stone-900">Push Request Alerts</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Receive instant alerts on your phone even when the app is closed.
                </p>
              </div>
              {userNotifSettings.enabled ? (
                <button
                  type="button"
                  onClick={handleDisablePushAlerts}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Turn Off</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isEnablingPush}
                  onClick={handleEnablePushAlerts}
                  className="px-3.5 py-2 bg-emerald-900 hover:bg-emerald-800 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isEnablingPush ? 'Enabling...' : 'Turn On'}</span>
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div>
                <p className="text-sm font-bold text-stone-900">Quiet Hours (22:00 &ndash; 07:00)</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Non-urgent requests are silenced overnight unless you are marked on night duty.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Quiet Start
                  </label>
                  <input
                    type="time"
                    value={userNotifSettings.quietHoursStart || '22:00'}
                    onChange={(e) =>
                      handleSaveNotifPreference({ quietHoursStart: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-600 uppercase mb-1">
                    Quiet End
                  </label>
                  <input
                    type="time"
                    value={userNotifSettings.quietHoursEnd || '07:00'}
                    onChange={(e) => handleSaveNotifPreference({ quietHoursEnd: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-stone-900">On Duty Tonight</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Receive all guest requests overnight during quiet hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleSaveNotifPreference({ onDutyNight: !userNotifSettings.onDutyNight })
                }
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                  userNotifSettings.onDutyNight
                    ? 'bg-emerald-950 text-amber-300'
                    : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                }`}
              >
                {userNotifSettings.onDutyNight ? 'On Duty (Active)' : 'Off Duty'}
              </button>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  notificationService.notify({
                    title: `New request · ${propertyRooms[0]?.roomNumber || 'Bobo'}`,
                    subtitle: 'Extra Pool Towels',
                    roomNumber: propertyRooms[0]?.roomNumber || 'Bobo',
                    category: 'housekeeping',
                  });
                }}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Send Test Alert
              </button>
              <button
                type="button"
                onClick={() => setIsNotifModalOpen(false)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD DINING ITEM */}
      {isAddDiningOpen && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Add Dining Menu Item</h2>
              </div>
              <button
                onClick={() => setIsAddDiningOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDining} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Dish / Beverage Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kariba Tigerfish Fillet"
                  value={newDiningName}
                  onChange={(e) => setNewDiningName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Category
                  </label>
                  <select
                    value={newDiningCategory}
                    onChange={(e) => setNewDiningCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="drinks">Drinks</option>
                    <option value="dessert">Dessert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Price ({currentProperty?.currency || 'ZMW'}) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="150"
                    value={newDiningPrice}
                    onChange={(e) => setNewDiningPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Ingredients / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Freshly grilled with garlic herb butter..."
                  value={newDiningDescription}
                  onChange={(e) => setNewDiningDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Dish / Menu Photo
                </label>

                <div className="flex items-center gap-2 mb-2">
                  <label className="cursor-pointer px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl border border-stone-200 flex items-center gap-1.5 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-stone-600" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                  {newDiningImage && (
                    <button
                      type="button"
                      onClick={() => setNewDiningImage('')}
                      className="text-xs text-rose-600 hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
                  )}
                </div>

                {newDiningImage && (
                  <div className="mb-2 relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200">
                    <img
                      src={newDiningImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <input
                  type="url"
                  placeholder="Or paste web image URL: https://..."
                  value={newDiningImage.startsWith('data:') ? '' : newDiningImage}
                  onChange={(e) => setNewDiningImage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDiningOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Publish to Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
