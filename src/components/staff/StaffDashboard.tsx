import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../../context/AuthContext';
import { dbService, subscribeToStore, DEFAULT_HOUSE_AMENITIES } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import {
  formatPropertyDate,
  formatPropertyTime,
  formatRelativeAgo,
  computeCheckOutCountdown,
  CheckOutCountdown,
  useNow,
} from '../../lib/time';
import { compressImageFileToJpeg } from '../../lib/imageCompression';
import { DEFAULT_HOUSE_GUIDE } from '../../lib/seeds/rocksApartments';
import { FOUNDER_CONTACT_PHONE, FOUNDER_WHATSAPP_NUMBER } from '../../lib/config';
import {
  RequestStatus,
  Room,
  ServiceRequest,
  DeliveryPreference,
  HouseGuideConfig,
  UserProfile,
  StaffDepartment,
} from '../../types';
import { QRPlaqueModal, renderPrintableQRCardCanvas } from '../common/QRCodeView';
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
  Download,
  Calendar,
  X,
  User,
  Users,
  MessageSquare,
  Volume2,
  Smartphone,
  Edit3,
  Moon,
  MoreHorizontal,
  ChevronDown,
  ChevronUp,
  Archive,
  Image as ImageIcon,
  BookOpen,
  Bell,
  BellOff,
  RotateCcw,
  UserPlus,
} from 'lucide-react';

interface StaffDashboardProps {
  onSwitchToGuest?: () => void;
  onSelectRoomForGuest?: (propertySlug: string, roomId: string) => void;
  onSwitchToAdmin?: () => void;
}

type DashboardTab = 'requests' | 'rooms' | 'team';

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

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onSelectRoomForGuest,
  onSwitchToAdmin,
}) => {
  const { user, signOut, provisionAccount } = useAuth();
  const now = useNow(30_000);

  const isFounder = user?.role === 'founder';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'founder';
  const isStaffOnly = user?.role === 'staff';

  const canViewCheckOuts =
    user?.role === 'founder' ||
    user?.role === 'manager' ||
    user?.department === 'housekeeping' ||
    user?.department === 'reception';

  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('requests');
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockSentinelRef = useRef<any>(null);

  // Sound alert activation state (stored per device)
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('hospitally_sound_alerts_enabled');
    return stored !== null ? stored === 'true' : true;
  });

  // Visible error toast banner state (never silent on write failures)
  const [writeErrorToast, setWriteErrorToast] = useState<string | null>(null);

  // Requests filtering state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);

  // Cancel Request Modal
  const [cancelPromptReqId, setCancelPromptReqId] = useState<string | null>(null);
  const [cancelReasonText, setCancelReasonText] = useState('');

  // Reopen Request Modal (GM verification)
  const [reopenModalReqId, setReopenModalReqId] = useState<string | null>(null);
  const [reopenReasonText, setReopenReasonText] = useState('');

  // Houses filtering state
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomFilterStatus, setRoomFilterStatus] = useState<'all' | 'available' | 'occupied'>('all');

  // Modals state for House Management
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Garden Apartment');
  const [newHouseType, setNewHouseType] = useState('Garden Apartment');
  const [newRoomQrLabel, setNewRoomQrLabel] = useState('');
  const [newRoomWifiName, setNewRoomWifiName] = useState('');
  const [newRoomWifiPassword, setNewRoomWifiPassword] = useState('');
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>(DEFAULT_HOUSE_AMENITIES);

  // Founder in property desk: Create Account modal state
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'manager' | 'staff'>('staff');
  const [newStaffDept, setNewStaffDept] = useState<StaffDepartment>('housekeeping');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffPassword, setNewStaffPassword] = useState('');
  const [isProvisioningStaff, setIsProvisioningStaff] = useState(false);
  const [staffProvisionError, setStaffProvisionError] = useState<string | null>(null);

  // Edit House modal state
  const [editHouseRoom, setEditHouseRoom] = useState<Room | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editHouseType, setEditHouseType] = useState('');
  const [editRoomQrLabel, setEditRoomQrLabel] = useState('');
  const [editRoomWifiName, setEditRoomWifiName] = useState('');
  const [editRoomWifiPassword, setEditRoomWifiPassword] = useState('');
  const [editRoomAmenities, setEditRoomAmenities] = useState<string[]>(DEFAULT_HOUSE_AMENITIES);
  const [editRoomRules, setEditRoomRules] = useState<string[]>([]);
  const [editRoomPhotoUploading, setEditRoomPhotoUploading] = useState(false);
  const [editRoomPhotoError, setEditRoomPhotoError] = useState<string | null>(null);

  // Edit House Guide modal state (GM only)
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [guideData, setGuideData] = useState<HouseGuideConfig>(DEFAULT_HOUSE_GUIDE);
  const [guideEmergencyPhone, setGuideEmergencyPhone] = useState('');
  const [guideCheckInTime, setGuideCheckInTime] = useState('');
  const [guideCheckOutTime, setGuideCheckOutTime] = useState('');

  // Check-In modal state (default title is empty, options: None, Mr, Mrs, Ms, Dr)
  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null);
  const [checkInGuestTitle, setCheckInGuestTitle] = useState<'' | 'Mr' | 'Mrs' | 'Ms' | 'Dr'>('');
  const [checkInGuestName, setCheckInGuestName] = useState('');
  const [checkInCheckoutDate, setCheckInCheckoutDate] = useState('');
  const [checkInCheckoutTime, setCheckInCheckoutTime] = useState('11:00');
  const [checkInPhone, setCheckInPhone] = useState('');

  // Check-Out confirm modal state
  const [checkOutConfirmRoom, setCheckOutConfirmRoom] = useState<Room | null>(null);

  // Check-Out strip collapsed "Tomorrow" state
  const [tomorrowOpen, setTomorrowOpen] = useState(false);
  const overdueChimedStaysRef = useRef<Set<string>>(new Set());

  // QR Card modal state
  const [qrPlaqueRoom, setQrPlaqueRoom] = useState<Room | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [confirmRegenerateRoom, setConfirmRegenerateRoom] = useState<Room | null>(null);

  // PWA Banner state
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

  const prevPendingIdsRef = useRef<Set<string> | null>(null);

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

  const allUsers = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllUsers,
    dbService.getAllUsers
  );

  const allStays = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllStays,
    dbService.getAllStays
  );

  useSyncExternalStore(subscribeToStore, dbService.getAllMedia, dbService.getAllMedia);

  const currentProperty = properties.find((p) => p.id === user?.propertyId) || properties[0];
  const isPropertySuspended = currentProperty?.status === 'suspended';
  const timezone = currentProperty?.timezone || 'Africa/Lusaka';

  // Screen Wake Lock toggle
  const toggleScreenWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        if (!wakeLockActive) {
          wakeLockSentinelRef.current = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        } else if (wakeLockSentinelRef.current) {
          await wakeLockSentinelRef.current.release();
          wakeLockSentinelRef.current = null;
          setWakeLockActive(false);
        }
      } else {
        alert('Screen Wake Lock is not supported on this browser.');
      }
    } catch (err) {
      console.warn('Wake Lock error:', err);
    }
  };

  // Only active non-archived houses
  const propertyRooms = (
    user?.propertyId
      ? allRooms.filter((r) => r.propertyId === user.propertyId)
      : allRooms.filter((r) => !currentProperty || r.propertyId === currentProperty.id)
  ).filter((r) => !r.archived);

  // Property scoped requests
  const propertyScopedRequests = user?.propertyId
    ? allRequests.filter((r) => r.propertyId === user.propertyId)
    : allRequests.filter((r) => !currentProperty || r.propertyId === currentProperty.id);

  // Staff visibility rules:
  // - Staff sees only assigned to them OR unassigned
  // - GM & Founder see all
  const visibleRequests = isStaffOnly
    ? propertyScopedRequests.filter(
        (r) => !r.archived && (r.assignedTo?.uid === user?.id || !r.assignedTo?.uid)
      )
    : propertyScopedRequests;

  const pendingCount = visibleRequests.filter((r) => !r.archived && r.status === 'pending').length;
  const inProgressCount = visibleRequests.filter(
    (r) => !r.archived && (r.status === 'in_progress' || r.status === 'acknowledged')
  ).length;
  const completedCount = visibleRequests.filter((r) => !r.archived && r.status === 'completed').length;
  const toVerifyCount = isManagerOrAdmin
    ? visibleRequests.filter(
        (r) => !r.archived && r.status === 'completed' && r.verification === 'pending'
      ).length
    : 0;
  const cancelledCount = visibleRequests.filter((r) => !r.archived && r.status === 'cancelled').length;
  const archivedCount = isManagerOrAdmin
    ? propertyScopedRequests.filter((r) => r.archived === true).length
    : 0;
  const unassignedCount = visibleRequests.filter(
    (r) => !r.archived && r.status === 'pending' && !r.assignedTo?.uid
  ).length;

  // Listen for write failure events and show visible error toast banner (never silent)
  useEffect(() => {
    const handler = (e: any) => {
      const errorMsg =
        e.detail?.error ||
        'Operation failed. Please check your connection or contact reception.';
      setWriteErrorToast(errorMsg);
      setTimeout(() => setWriteErrorToast(null), 6000);
    };
    window.addEventListener('hospitally-write-error', handler);
    return () => window.removeEventListener('hospitally-write-error', handler);
  }, []);

  // Tab Title alert count: (2) Hospitaly Staff
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeTotal = pendingCount + inProgressCount;
    document.title = activeTotal > 0 ? `(${activeTotal}) Hospitaly Staff` : 'Hospitaly Staff';
    return () => {
      document.title = 'Hospitaly';
    };
  }, [pendingCount, inProgressCount]);

  // Audio & vibration alert on new incoming pending request (repeats once after 10s if still unconfirmed)
  useEffect(() => {
    const currentPendingIds = new Set(
      visibleRequests.filter((r) => !r.archived && r.status === 'pending').map((r) => r.id)
    );
    if (prevPendingIdsRef.current !== null) {
      const newlyPendingIds: string[] = [];
      currentPendingIds.forEach((id) => {
        if (!prevPendingIdsRef.current!.has(id)) {
          newlyPendingIds.push(id);
        }
      });
      if (newlyPendingIds.length > 0 && soundAlertsEnabled) {
        notificationService.playStaffAlertChime();
        notificationService.triggerHaptic('staff_alert');

        // Repeat once after 10s if still unconfirmed
        newlyPendingIds.forEach((reqId) => {
          setTimeout(() => {
            const req = dbService.getAllRequests().find((r: ServiceRequest) => r.id === reqId);
            if (req && req.status === 'pending' && !req.archived) {
              notificationService.playStaffAlertChime();
              notificationService.triggerHaptic('staff_alert');
            }
          }, 10_000);
        });
      }
    }
    prevPendingIdsRef.current = currentPendingIds;
  }, [visibleRequests, soundAlertsEnabled]);

  // Filter staff: active members only, exclude founder from assignment dropdowns
  const assignableStaff = allUsers.filter(
    (u) =>
      u.active !== false &&
      u.role !== 'founder' &&
      (!currentProperty || !u.propertyId || u.propertyId === currentProperty.id)
  );

  // Team list strictly excludes founder (founder lives in HQ accounts only)
  const teamListMembers = allUsers.filter(
    (u) =>
      u.active !== false &&
      u.role !== 'founder' &&
      (!currentProperty || !u.propertyId || u.propertyId === currentProperty.id)
  );

  // Compute live check-outs today & tomorrow for the strip
  const occupiedRoomsWithStays = propertyRooms
    .filter((r) => r.status === 'occupied' && r.activeStayId)
    .map((r) => {
      const stay = allStays.find((s) => s.id === r.activeStayId);
      const checkOutIso = stay?.checkOutAt || r.guestCheckOutDate || '';
      const countdown = computeCheckOutCountdown(checkOutIso, now, timezone);
      return {
        room: r,
        stay,
        checkOutIso,
        countdown,
      };
    });

  const checkOutsToday = occupiedRoomsWithStays
    .filter((item): item is typeof item & { countdown: CheckOutCountdown } => Boolean(item.countdown?.isToday))
    .sort((a, b) => new Date(a.checkOutIso).getTime() - new Date(b.checkOutIso).getTime());

  const checkOutsTomorrow = occupiedRoomsWithStays
    .filter((item): item is typeof item & { countdown: CheckOutCountdown } => Boolean(item.countdown?.isTomorrow))
    .sort((a, b) => new Date(a.checkOutIso).getTime() - new Date(b.checkOutIso).getTime());

  // Overdue chime trigger (chimes once per overdue stay)
  useEffect(() => {
    checkOutsToday.forEach((item) => {
      if (
        item.countdown?.state === 'red' &&
        item.stay?.id &&
        !overdueChimedStaysRef.current.has(item.stay.id)
      ) {
        overdueChimedStaysRef.current.add(item.stay.id);
        notificationService.playStaffAlertChime();
      }
    });
  }, [checkOutsToday]);

  if (!user || (user.role !== 'founder' && user.role !== 'manager' && user.role !== 'staff')) {
    return null;
  }

  // --- ACTIONS ---

  const handleConfirmRequest = (requestId: string) => {
    if (isPropertySuspended) return;
    dbService.confirmRequest(requestId);
  };

  const handleStartRequest = (requestId: string) => {
    if (isPropertySuspended) return;
    dbService.updateRequestStatus(requestId, 'in_progress', {
      uid: user.id,
      name: user.name,
    });
  };

  const handleDoneRequest = (requestId: string) => {
    if (isPropertySuspended) return;
    dbService.updateRequestStatus(requestId, 'completed', {
      uid: user.id,
      name: user.name,
    });
  };

  const handleAssignRequest = (requestId: string, staffUid: string) => {
    if (isPropertySuspended) return;
    const staffMember = assignableStaff.find((s) => s.id === staffUid);
    dbService.assignRequest(
      requestId,
      staffMember
        ? { uid: staffMember.id, name: staffMember.name, department: staffMember.department }
        : undefined
    );
  };

  const handleArchiveRequest = (requestId: string) => {
    if (!isManagerOrAdmin || isPropertySuspended) return;
    dbService.archiveRequest(requestId, { uid: user.id, name: user.name, email: user.email });
  };

  const handleOpenCancelPrompt = (requestId: string) => {
    setCancelPromptReqId(requestId);
    setCancelReasonText('');
  };

  const handleConfirmCancelPrompt = () => {
    if (!cancelPromptReqId || isPropertySuspended) return;
    dbService.updateRequestStatus(
      cancelPromptReqId,
      'cancelled',
      { uid: user.id, name: user.name },
      cancelReasonText.trim() || undefined
    );
    setCancelPromptReqId(null);
  };

  const handleVerifyRequest = (requestId: string) => {
    if (!isManagerOrAdmin || isPropertySuspended) return;
    dbService.verifyRequest(requestId, 'verify', { uid: user.id, name: user.name, role: user.role });
  };

  const handleOpenReopenPrompt = (requestId: string) => {
    setReopenModalReqId(requestId);
    setReopenReasonText('');
  };

  const handleConfirmReopenPrompt = () => {
    if (!reopenModalReqId || isPropertySuspended || !reopenReasonText.trim()) return;
    dbService.verifyRequest(
      reopenModalReqId,
      'reopen',
      { uid: user.id, name: user.name, role: user.role },
      reopenReasonText.trim()
    );
    setReopenModalReqId(null);
    setReopenReasonText('');
  };

  const handleAddHouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFounder || !newRoomNumber.trim() || isPropertySuspended) return;
    dbService.addRoomWithQR(
      currentProperty?.id || 'prop_rocks_lusaka',
      newRoomNumber.trim(),
      newHouseType.trim() || 'Garden Apartment',
      {
        wifiName: newRoomWifiName.trim() || undefined,
        wifiPassword: newRoomWifiPassword.trim() || undefined,
        amenities: newRoomAmenities,
      }
    );
    setIsAddRoomOpen(false);
    setNewRoomNumber('');
    setNewHouseType('Garden Apartment');
    setNewRoomWifiName('');
    setNewRoomWifiPassword('');
  };

  const handleCreateStaffAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStaffProvisionError(null);
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPassword.trim()) {
      setStaffProvisionError('Name, email, and password are required.');
      return;
    }
    if (newStaffPassword.trim().length < 6) {
      setStaffProvisionError('Password must be at least 6 characters.');
      return;
    }
    setIsProvisioningStaff(true);
    try {
      await provisionAccount({
        name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        tempPassword: newStaffPassword.trim(),
        role: newStaffRole,
        department: newStaffRole === 'staff' ? newStaffDept : 'management',
        propertyId: currentProperty?.id || 'prop_rocks_lusaka',
        phone: newStaffPhone.trim() || undefined,
      });
      setIsCreateStaffModalOpen(false);
      setNewStaffName('');
      setNewStaffEmail('');
      setNewStaffPassword('');
      setNewStaffPhone('');
    } catch (err: any) {
      setStaffProvisionError(err?.message || 'Failed to create staff account.');
    } finally {
      setIsProvisioningStaff(false);
    }
  };

  const handleToggleSoundAlerts = async () => {
    if (!soundAlertsEnabled) {
      notificationService.unlockAudio();
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          await Notification.requestPermission();
        } catch {
          // ignore
        }
      }
      try {
        if ('wakeLock' in navigator && !wakeLockActive) {
          wakeLockSentinelRef.current = await (navigator as any).wakeLock.request('screen');
          setWakeLockActive(true);
        }
      } catch {
        // ignore
      }
      setSoundAlertsEnabled(true);
      localStorage.setItem('hospitally_sound_alerts_enabled', 'true');
      notificationService.playStaffAlertChime();
    } else {
      setSoundAlertsEnabled(false);
      localStorage.setItem('hospitally_sound_alerts_enabled', 'false');
    }
  };

  const handleTestAlert = () => {
    notificationService.playStaffAlertChime();
    notificationService.triggerHaptic('staff_alert');
    setWriteErrorToast('Test alert triggered: chime and haptic feedback played.');
    setTimeout(() => setWriteErrorToast(null), 3000);
  };

  // --- CHECK-IN / CHECK-OUT FLOWS ---

  const handleOpenCheckInModal = (room: Room) => {
    setCheckInRoom(room);
    setCheckInGuestTitle((room.guestTitle as any) || '');
    setCheckInGuestName(room.currentGuestName || '');
    setCheckInPhone(room.guestPhone || '');

    // Default checkout date: tomorrow 11:00 Lusaka time
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
    const yyyy = tomorrow.getFullYear();
    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const dd = String(tomorrow.getDate()).padStart(2, '0');
    setCheckInCheckoutDate(`${yyyy}-${mm}-${dd}`);
    setCheckInCheckoutTime('11:00');
  };

  const handleApplyPresetCheckout = (daysFromNow: number) => {
    const target = new Date(now + daysFromNow * 24 * 60 * 60 * 1000);
    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    setCheckInCheckoutDate(`${yyyy}-${mm}-${dd}`);
    setCheckInCheckoutTime('11:00');
  };

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInRoom || !checkInGuestName.trim() || isPropertySuspended) return;

    const fullCheckOutIso = `${checkInCheckoutDate.trim()}T${checkInCheckoutTime.trim()}:00`;
    dbService.assignGuestToRoom(
      checkInRoom.id,
      checkInGuestName.trim(),
      fullCheckOutIso,
      checkInPhone.trim() || undefined,
      checkInGuestTitle || undefined
    );

    setCheckInRoom(null);
  };

  const handleConfirmCheckOut = () => {
    if (!checkOutConfirmRoom || isPropertySuspended) return;
    dbService.checkOutRoom(checkOutConfirmRoom.id);
    setCheckOutConfirmRoom(null);
  };

  // --- HOUSE EDITING & PHOTO UPLOAD ---

  const handleOpenEditHouse = (room: Room) => {
    setEditHouseRoom(room);
    setEditRoomNumber(room.name || room.roomNumber);
    setEditRoomType(room.roomType || 'Garden Apartment');
    setEditHouseType(room.houseType || 'Garden Apartment');
    setEditRoomQrLabel((room.qrLabel || room.name || room.roomNumber).toUpperCase().slice(0, 8));
    setEditRoomWifiName(room.wifiName || '');
    setEditRoomWifiPassword(room.wifiPassword || '');
    setEditRoomAmenities(
      Array.isArray(room.amenities) && room.amenities.length > 0
        ? room.amenities.filter((a) => !/hot\s*tub/i.test(a))
        : DEFAULT_HOUSE_AMENITIES
    );
    setEditRoomRules(
      Array.isArray(room.houseRules)
        ? room.houseRules
        : typeof room.houseRules === 'string'
        ? room.houseRules.split('\n').filter(Boolean)
        : []
    );
    setEditRoomPhotoError(null);
  };

  const handlePhotoUploadForHouse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editHouseRoom) return;

    setEditRoomPhotoUploading(true);
    setEditRoomPhotoError(null);
    try {
      const { dataUrl, width, height } = await compressImageFileToJpeg(file);
      const mediaItem = await dbService.saveMedia({
        propertyId: currentProperty?.id || 'prop_rocks_lusaka',
        ownerType: 'house',
        ownerId: editHouseRoom.id,
        dataUrl,
        width,
        height,
        uploadedBy: user.id,
      });

      dbService.updateRoomDetails(editHouseRoom.id, {
        imageId: mediaItem.id,
      });

      setEditHouseRoom((prev) => (prev ? { ...prev, imageId: mediaItem.id } : null));
    } catch (err: any) {
      setEditRoomPhotoError(err.message || 'Failed to upload photo.');
    } finally {
      setEditRoomPhotoUploading(false);
    }
  };

  const handleRemoveHousePhoto = () => {
    if (!editHouseRoom) return;
    dbService.updateRoomDetails(editHouseRoom.id, {
      imageId: undefined,
    });
    setEditHouseRoom((prev) => (prev ? { ...prev, imageId: undefined } : null));
  };

  const handleSaveEditHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHouseRoom || !editRoomNumber.trim() || isPropertySuspended) return;

    dbService.updateRoomDetails(editHouseRoom.id, {
      name: editRoomNumber.trim(),
      roomNumber: editRoomNumber.trim(),
      houseType: editHouseType.trim(),
      roomType: editHouseType.trim() || editRoomType.trim(),
      qrLabel: editRoomQrLabel.trim().toUpperCase().slice(0, 8),
      wifiName: editRoomWifiName.trim() || undefined,
      wifiPassword: editRoomWifiPassword.trim() || undefined,
      amenities: editRoomAmenities,
      houseRules: editRoomRules,
    });
    setEditHouseRoom(null);
  };

  // --- HOUSE GUIDE EDITING (GM) ---

  const handleOpenGuideModal = () => {
    const guide = {
      ...DEFAULT_HOUSE_GUIDE,
      ...(currentProperty?.houseGuide || {}),
    };
    setGuideData(guide);
    setGuideEmergencyPhone(guide.emergencyPhone || currentProperty?.contactPhone || '');
    setGuideCheckInTime(currentProperty?.checkInTime || '14:00');
    setGuideCheckOutTime(currentProperty?.checkOutTime || '11:00');
    setIsGuideModalOpen(true);
  };

  const handleSaveGuide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProperty || isPropertySuspended) return;

    dbService.updatePropertySettings(
      currentProperty.id,
      {
        checkInTime: guideCheckInTime.trim() || '14:00',
        checkOutTime: guideCheckOutTime.trim() || '11:00',
        houseGuide: {
          ...guideData,
          emergencyPhone: guideEmergencyPhone.trim() || undefined,
        },
      },
      { name: user.name, email: user.email }
    );
    setIsGuideModalOpen(false);
  };

  // --- QR EXPORT ---

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
          houseName: room.name || room.roomNumber,
          qrLabel: room.qrLabel,
          propertyName: currentProperty?.name || 'Rock Apartments',
          primaryColor: currentProperty?.primaryColor || '#1C3A31',
        });
        const base64Data = dataUrl.split(',')[1];
        const safeHouse = (room.name || room.roomNumber).trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
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
      console.error('Failed to generate QR ZIP:', err);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  // --- FILTERED REQUESTS ---

  const filteredRequests = visibleRequests.filter((r) => {
    if (filterStatus === 'archived') {
      if (!r.archived) return false;
    } else if (filterStatus === 'to_verify') {
      if (r.archived || r.status !== 'completed' || r.verification !== 'pending') return false;
    } else {
      if (r.archived) return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    }

    if (filterDepartment !== 'all' && r.category !== filterDepartment) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchRoom = (r.roomNumber || '').toLowerCase().includes(q);
      const matchGuest = (r.guestName || '').toLowerCase().includes(q);
      const matchDesc = (r.description || '').toLowerCase().includes(q);
      if (!matchTitle && !matchRoom && !matchGuest && !matchDesc) return false;
    }
    return true;
  });

  // --- RENDER CHECK-OUT STRIP COMPONENT ---

  const renderCheckOutStrip = () => {
    if (!canViewCheckOuts) return null;
    return (
      <div
        data-testid="live-checkout-strip"
        className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Check-outs today
            </span>
            <span
              data-testid="checkout-today-count"
              className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-800 text-xs font-bold"
            >
              {checkOutsToday.length}
            </span>
          </div>

          {checkOutsTomorrow.length > 0 && (
            <button
              type="button"
              data-testid="toggle-tomorrow-checkouts"
              onClick={() => setTomorrowOpen((v) => !v)}
              className="text-xs text-stone-600 font-semibold hover:text-stone-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Tomorrow ({checkOutsTomorrow.length})</span>
              {tomorrowOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {checkOutsToday.length === 0 ? (
          <p className="text-xs text-stone-500">No check-outs scheduled for today.</p>
        ) : (
          <div className="space-y-2">
            {checkOutsToday.map(({ room, stay, countdown }) => {
              const guestDisplay = [room.guestTitle, room.currentGuestName]
                .filter(Boolean)
                .join(' ')
                .trim() || 'Guest';

              let countdownBadgeClass = 'bg-stone-100 text-stone-700 border-stone-200';
              if (countdown.state === 'amber') {
                countdownBadgeClass = 'bg-amber-100 text-amber-900 border-amber-300 font-bold';
              } else if (countdown.state === 'orange') {
                countdownBadgeClass = 'bg-orange-100 text-orange-950 border-orange-300 font-bold';
              } else if (countdown.state === 'red') {
                countdownBadgeClass = 'bg-red-600 text-white border-red-700 font-bold animate-pulse';
              }

              return (
                <div
                  key={room.id}
                  data-testid={`checkout-today-item-${room.id}`}
                  className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl bg-stone-50 border border-stone-200/70"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-900 truncate">
                        {room.name || room.roomNumber}
                      </span>
                      <span
                        data-testid={`checkout-countdown-${room.id}`}
                        className={`text-xs px-2 py-0.5 rounded-full border ${countdownBadgeClass}`}
                      >
                        {countdown.text}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 truncate mt-0.5">
                      {guestDisplay}
                      {room.guestPhone && ` · ${room.guestPhone}`}
                    </p>
                  </div>

                  <button
                    type="button"
                    data-testid={`checkout-btn-${room.id}`}
                    disabled={isPropertySuspended}
                    onClick={() => setCheckOutConfirmRoom(room)}
                    className="min-h-11 px-3.5 py-1.5 rounded-xl bg-[#1C3A31] text-white text-xs font-semibold hover:bg-emerald-950 active:scale-95 disabled:opacity-50 transition-all cursor-pointer shrink-0"
                  >
                    Check out
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Collapsible Tomorrow Accordion */}
        {tomorrowOpen && checkOutsTomorrow.length > 0 && (
          <div data-testid="tomorrow-checkouts-list" className="pt-2 border-t border-stone-100 space-y-2">
            <span className="text-xs font-semibold text-stone-500 block">Tomorrow</span>
            {checkOutsTomorrow.map(({ room, countdown }) => {
              const guestDisplay = [room.guestTitle, room.currentGuestName]
                .filter(Boolean)
                .join(' ')
                .trim() || 'Guest';

              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-stone-200/60 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-stone-900 block truncate">
                      {room.name || room.roomNumber} &middot; {guestDisplay}
                    </span>
                    <span className="text-stone-500">{countdown.text}</span>
                  </div>
                  <span className="text-stone-400 font-medium shrink-0">Scheduled</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      data-testid="staff-dashboard"
      className="min-h-screen bg-stone-100 text-stone-900 pb-20 overflow-x-hidden selection:bg-amber-100 selection:text-emerald-950"
    >
      {/* Suspended Property Banner (Spec §3 & §5) */}
      {isPropertySuspended && (
        <div
          data-testid="staff-suspended-banner"
          className="bg-amber-100 border-b border-amber-300 text-amber-950 px-4 py-2.5 text-xs font-medium flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-800" />
            <span className="truncate">
              Hospitaly is paused for {currentProperty?.name || 'Rock Apartments'}. You can view
              past requests.
            </span>
          </div>
          <a
            href={`https://wa.me/${FOUNDER_WHATSAPP_NUMBER}?text=Hello%20Hospitaly%2C%20please%20resume%20our%20property%20account.`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-[#1C3A31] underline shrink-0"
          >
            Contact Hospitaly to resume
          </a>
        </div>
      )}

      {/* Floating Write Error Toast (never silent on action failures) */}
      {writeErrorToast && (
        <div
          data-testid="write-error-toast"
          className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 p-3 bg-red-700 text-white text-xs font-semibold rounded-2xl shadow-xl flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
            <span className="truncate">{writeErrorToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setWriteErrorToast(null)}
            className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/20 cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      {/* 56px Mobile Header */}
      <header className="bg-white border-b border-stone-900/[0.08] h-14 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#1C3A31] text-amber-300 flex items-center justify-center font-serif font-bold text-sm shrink-0">
            RA
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

        {/* Header Right Actions: Sound Alerts Bell + ⋯ Menu */}
        <div className="flex items-center gap-2">
          {/* Sound Alerts Bell Button (Q3.2: 1-tap audio unlock, notification request & wake lock) */}
          <button
            type="button"
            data-testid="toggle-sound-alerts-btn"
            onClick={handleToggleSoundAlerts}
            title={soundAlertsEnabled ? 'Sound alerts on' : 'Turn on sound alerts'}
            aria-label={soundAlertsEnabled ? 'Sound alerts on' : 'Turn on sound alerts'}
            className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
              soundAlertsEnabled
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
            }`}
          >
            {soundAlertsEnabled ? (
              <Bell className="w-5 h-5 text-emerald-700" />
            ) : (
              <BellOff className="w-5 h-5 text-stone-400" />
            )}
          </button>

          {/* ⋯ Menu */}
          <div className="relative">
            <button
              type="button"
              data-testid="staff-menu-btn"
              onClick={() => setIsHeaderMenuOpen((v) => !v)}
              aria-label="Staff options menu"
              className="w-11 h-11 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 flex items-center justify-center text-stone-700 cursor-pointer"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>

            {isHeaderMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsHeaderMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-stone-200 shadow-2xl py-2 z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-stone-100">
                    <div className="font-bold text-stone-900 truncate">{user.name}</div>
                    <div className="text-stone-500 capitalize">
                      {user.role === 'manager'
                        ? 'General Manager'
                        : user.role === 'founder'
                        ? 'Platform Founder'
                        : `Staff · ${user.department || 'Housekeeping'}`}
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="toggle-wake-lock"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      toggleScreenWakeLock();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-stone-700 hover:bg-stone-50 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-stone-500" />
                      <span>Keep screen on</span>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        wakeLockActive ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {wakeLockActive ? 'On' : 'Off'}
                    </span>
                  </button>

                  <button
                    type="button"
                    data-testid="test-alert-btn"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      handleTestAlert();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-stone-700 hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-amber-700" />
                    <span>Test alert</span>
                  </button>

                {isFounder && onSwitchToAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsHeaderMenuOpen(false);
                      onSwitchToAdmin();
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-purple-900 font-semibold hover:bg-purple-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Shield className="w-4 h-4 text-purple-700" />
                    <span>Founder HQ</span>
                  </button>
                )}

                <div className="my-1 border-t border-stone-100" />

                <button
                  type="button"
                  onClick={() => {
                    setIsHeaderMenuOpen(false);
                    signOut();
                  }}
                  className="w-full px-3.5 py-2.5 text-left text-rose-700 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>

      {/* Main Container */}
      <main className="p-3.5 sm:p-6 max-w-6xl mx-auto space-y-4">
        {/* Navigation Tabs in 1 row: Requests · Houses · Team */}
        <div className="flex items-center gap-2 border-b border-stone-900/[0.08] pb-2.5">
          <button
            type="button"
            data-testid="tab-requests"
            onClick={() => setDashboardTab('requests')}
            className={`min-h-11 flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
              dashboardTab === 'requests'
                ? 'bg-[#1C3A31] text-[#E0B973] shadow-xs'
                : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Requests</span>
            {unassignedCount > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                dashboardTab === 'requests'
                  ? 'bg-[#E0B973] text-stone-950'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {pendingCount + inProgressCount}
            </span>
          </button>

          {isManagerOrAdmin && (
            <button
              type="button"
              data-testid="tab-rooms"
              onClick={() => setDashboardTab('rooms')}
              className={`min-h-11 flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                dashboardTab === 'rooms'
                  ? 'bg-[#1C3A31] text-[#E0B973] shadow-xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Houses</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  dashboardTab === 'rooms'
                    ? 'bg-[#E0B973] text-stone-950'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {propertyRooms.length}
              </span>
            </button>
          )}

          {isManagerOrAdmin && (
            <button
              type="button"
              data-testid="tab-team"
              onClick={() => setDashboardTab('team')}
              className={`min-h-11 flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
                dashboardTab === 'team'
                  ? 'bg-[#1C3A31] text-[#E0B973] shadow-xs'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                  dashboardTab === 'team'
                    ? 'bg-[#E0B973] text-stone-950'
                    : 'bg-stone-100 text-stone-700'
                }`}
              >
                {teamListMembers.length}
              </span>
            </button>
          )}
        </div>

        {/* =========================================================================
            TAB 1: REQUESTS BOARD
           ========================================================================= */}
        {dashboardTab === 'requests' && (
          <div className="space-y-4">
            {/* Live Check-Outs Today Strip */}
            {renderCheckOutStrip()}

            {/* Status Chips Row */}
            <div data-testid="status-chips-row" className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              <button
                type="button"
                data-testid="chip-all"
                onClick={() => setFilterStatus('all')}
                className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  filterStatus === 'all'
                    ? 'bg-[#1C3A31] text-white border-[#1C3A31]'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}
              >
                All ({visibleRequests.filter((r) => !r.archived).length})
              </button>
              <button
                type="button"
                data-testid="chip-pending"
                onClick={() => setFilterStatus('pending')}
                className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  filterStatus === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                data-testid="chip-acknowledged"
                onClick={() => setFilterStatus('acknowledged')}
                className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  filterStatus === 'acknowledged'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}
              >
                Confirmed ({visibleRequests.filter((r) => !r.archived && r.status === 'acknowledged').length})
              </button>
              <button
                type="button"
                data-testid="chip-in_progress"
                onClick={() => setFilterStatus('in_progress')}
                className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  filterStatus === 'in_progress'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}
              >
                In progress ({visibleRequests.filter((r) => !r.archived && r.status === 'in_progress').length})
              </button>
              <button
                type="button"
                data-testid="chip-completed"
                onClick={() => setFilterStatus('completed')}
                className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  filterStatus === 'completed'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}
              >
                Done ({completedCount})
              </button>

              {/* GM-only "To verify" chip (Q2.2) */}
              {isManagerOrAdmin && (
                <button
                  type="button"
                  data-testid="chip-to_verify"
                  onClick={() => setFilterStatus('to_verify')}
                  className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                    filterStatus === 'to_verify'
                      ? 'bg-amber-700 text-white border-amber-700'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  To verify ({toVerifyCount})
                </button>
              )}

              <button
                type="button"
                data-testid="chip-cancelled"
                onClick={() => setFilterStatus('cancelled')}
                className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                  filterStatus === 'cancelled'
                    ? 'bg-stone-700 text-white border-stone-700'
                    : 'bg-white border-stone-200 text-stone-700'
                }`}
              >
                Cancelled ({cancelledCount})
              </button>

              {/* Archived chip (GM & Founder only) */}
              {isManagerOrAdmin && (
                <button
                  type="button"
                  data-testid="chip-archived"
                  onClick={() => setFilterStatus('archived')}
                  className={`min-h-11 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer border ${
                    filterStatus === 'archived'
                      ? 'bg-stone-900 text-amber-300 border-stone-900'
                      : 'bg-white border-stone-200 text-stone-700'
                  }`}
                >
                  <Archive className="w-3.5 h-3.5 inline mr-1" />
                  Archived ({archivedCount})
                </button>
              )}
            </div>

            {/* Filter Bar: Search + Department */}
            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search house, request, or guest..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full min-h-11 pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#1C3A31]"
                />
              </div>

              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                aria-label="Filter by department"
                className="min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-800 font-medium focus:outline-none shrink-0"
              >
                <option value="all">All departments</option>
                <option value="housekeeping">Housekeeping</option>
                <option value="maintenance">Maintenance</option>
                <option value="pool_garden">Pool &amp; garden</option>
                <option value="transport">Transport</option>
                <option value="concierge">Reception</option>
              </select>
            </div>

            {/* Request Cards Feed */}
            <div data-testid="requests-feed" className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 text-stone-500 text-xs">
                  No requests matching this filter.
                </div>
              ) : (
                filteredRequests.map((req) => {
                  const reqTimeMs = new Date(req.createdAt).getTime();
                  const waitMinutes = Math.floor((now - reqTimeMs) / (60 * 1000));
                  const isUnassignedLong =
                    !req.archived && req.status === 'pending' && !req.assignedTo?.uid && waitMinutes >= 5;

                  const plainWhatsAppText =
                    `House: ${req.roomNumber}\n` +
                    `Guest: ${req.guestName || 'Guest'}${req.guestPhone ? ` (${req.guestPhone})` : ''}\n` +
                    `Request: ${req.title}\n` +
                    (req.description ? `Details: ${req.description}\n` : '') +
                    `Ref: ${req.refCode || req.id.slice(-4).toUpperCase()}`;

                  return (
                    <div
                      key={req.id}
                      data-testid={`staff-request-card-${req.id}`}
                      className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-2xs space-y-3"
                    >
                      {/* Top Row: House chip, category, live waiting timer or relative ago */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold px-2.5 py-1 bg-[#1C3A31] text-[#E0B973] rounded-md">
                            {req.roomNumber}
                          </span>
                          <span className="text-xs font-semibold capitalize text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md">
                            {req.category.replace('_', ' ')}
                          </span>
                          {req.priority === 'urgent' && (
                            <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-md">
                              Urgent
                            </span>
                          )}
                          {isUnassignedLong && (
                            <span
                              data-testid={`waiting-timer-${req.id}`}
                              className="text-xs font-bold px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md"
                            >
                              Waiting {waitMinutes} min
                            </span>
                          )}
                        </div>

                        <span className="text-xs text-stone-500">
                          {formatRelativeAgo(req.createdAt, now)}
                        </span>
                      </div>

                      {/* Request Title & Note */}
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

                      {/* Guest Details (staff-only visibility) */}
                      <div className="flex items-center justify-between gap-2 text-xs text-stone-600 flex-wrap">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-semibold text-stone-800 truncate">
                            {req.guestName || 'Guest'}
                          </span>
                          {req.guestPhone && (
                            <>
                              <span>&middot;</span>
                              <span className="whitespace-nowrap font-medium text-stone-700">
                                {req.guestPhone}
                              </span>
                            </>
                          )}
                        </div>

                        {req.deliveryPreference && (
                          <span className="text-stone-500">
                            Pref:{' '}
                            {req.deliveryPreference === 'leave_at_door'
                              ? 'Leave at door'
                              : 'Knock'}
                          </span>
                        )}
                      </div>

                      {/* Assignee Dropdown (GM/Admin, strictly excludes founder) */}
                      {isManagerOrAdmin && !req.archived && (
                        <div className="pt-2 border-t border-stone-100">
                          <select
                            data-testid={`assign-select-${req.id}`}
                            disabled={isPropertySuspended}
                            value={req.assignedTo?.uid || ''}
                            onChange={(e) => handleAssignRequest(req.id, e.target.value)}
                            aria-label="Assign staff member"
                            className="w-full min-h-11 text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-medium cursor-pointer"
                          >
                            <option value="">Assign staff member...</option>
                            {assignableStaff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.department || s.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(plainWhatsAppText)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-11 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>

                        {/* Confirm button (does not auto-assign clicker) */}
                        {req.status === 'pending' && !req.archived && (
                          <button
                            type="button"
                            data-testid={`confirm-request-btn-${req.id}`}
                            disabled={isPropertySuspended}
                            onClick={() => handleConfirmRequest(req.id)}
                            className="min-h-11 flex-1 py-2 px-3 bg-[#1C3A31] text-white hover:bg-emerald-950 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                          >
                            Confirm
                          </button>
                        )}

                        {req.status === 'acknowledged' && !req.archived && (
                          <button
                            type="button"
                            data-testid={`start-request-btn-${req.id}`}
                            disabled={isPropertySuspended}
                            onClick={() => handleStartRequest(req.id)}
                            className="min-h-11 flex-1 py-2 px-3 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Start</span>
                          </button>
                        )}

                        {req.status === 'in_progress' && !req.archived && (
                          <button
                            type="button"
                            data-testid={`done-request-btn-${req.id}`}
                            disabled={isPropertySuspended}
                            onClick={() => handleDoneRequest(req.id)}
                            className="min-h-11 flex-1 py-2 px-3 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Done</span>
                          </button>
                        )}

                        {req.status === 'completed' && !req.archived && (
                          <>
                            {req.verification === 'verified' ? (
                              <span
                                data-testid={`verified-badge-${req.id}`}
                                className="min-h-11 flex-1 py-2 px-3 text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Verified by {req.verifiedBy || 'GM'}
                              </span>
                            ) : (
                              <span
                                data-testid={`to-verify-badge-${req.id}`}
                                className="min-h-11 flex-1 py-2 px-3 text-xs font-bold text-amber-900 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-center gap-1"
                              >
                                <Clock className="w-3.5 h-3.5" /> Done (To verify)
                              </span>
                            )}

                            {isManagerOrAdmin && req.verification !== 'verified' && (
                              <>
                                <button
                                  type="button"
                                  data-testid={`verify-request-btn-${req.id}`}
                                  disabled={isPropertySuspended}
                                  onClick={() => handleVerifyRequest(req.id)}
                                  className="min-h-11 py-2 px-3 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Verified</span>
                                </button>
                                <button
                                  type="button"
                                  data-testid={`reopen-request-btn-${req.id}`}
                                  disabled={isPropertySuspended}
                                  onClick={() => handleOpenReopenPrompt(req.id)}
                                  className="min-h-11 py-2 px-3 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reopen</span>
                                </button>
                              </>
                            )}
                          </>
                        )}

                        {req.status === 'cancelled' && !req.archived && (
                          <span className="min-h-11 flex-1 py-2 px-3 text-xs font-bold text-stone-600 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Cancelled
                          </span>
                        )}

                        {/* Cancel button with reason sheet */}
                        {isManagerOrAdmin &&
                          !req.archived &&
                          req.status !== 'completed' &&
                          req.status !== 'cancelled' && (
                            <button
                              type="button"
                              data-testid={`cancel-req-btn-${req.id}`}
                              disabled={isPropertySuspended}
                              onClick={() => handleOpenCancelPrompt(req.id)}
                              className="min-h-11 py-2 px-3 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                          )}

                        {/* Archive button (GM / Founder only, strictly after verified or cancelled) */}
                        {isManagerOrAdmin &&
                          !req.archived &&
                          (req.status === 'cancelled' ||
                            (req.status === 'completed' && req.verification === 'verified')) && (
                            <button
                              type="button"
                              data-testid={`archive-req-btn-${req.id}`}
                              disabled={isPropertySuspended}
                              onClick={() => handleArchiveRequest(req.id)}
                              className="min-h-11 py-2 px-3 text-xs text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl font-semibold disabled:opacity-50 cursor-pointer flex items-center gap-1"
                            >
                              <Archive className="w-3.5 h-3.5" />
                              <span>Archive</span>
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

        {/* =========================================================================
            TAB 2: HOUSES, CHECK-IN & QR CODES
           ========================================================================= */}
        {dashboardTab === 'rooms' && isManagerOrAdmin && (
          <div className="space-y-4">
            {/* Live Check-Outs Today Strip */}
            {renderCheckOutStrip()}

            {/* Header row 1: Houses {count} · Occupied {count} · Available {count} */}
            <div data-testid="houses-count-row" className="flex items-center gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                Houses <strong className="text-stone-950">{propertyRooms.length}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Occupied{' '}
                <strong className="text-stone-950">
                  {propertyRooms.filter((r) => r.status === 'occupied').length}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-stone-200 text-xs font-medium text-stone-700">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Available{' '}
                <strong className="text-stone-950">
                  {propertyRooms.filter((r) => r.status === 'available').length}
                </strong>
              </span>
            </div>

            {/* Header row 2: Download all QR (ZIP) + Add house + Edit House Guide */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                data-testid="download-all-qrs-zip"
                onClick={handleDownloadAllQRsZip}
                disabled={isDownloadingZip || propertyRooms.length === 0}
                className="min-h-11 flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-800" />
                <span>{isDownloadingZip ? 'Bundling...' : 'Download all QR (ZIP)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="edit-house-guide-btn"
                  disabled={isPropertySuspended}
                  onClick={handleOpenGuideModal}
                  className="min-h-11 flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Edit house guide</span>
                </button>

                {isFounder && (
                  <button
                    type="button"
                    data-testid="add-house-btn"
                    disabled={isPropertySuspended}
                    onClick={() => setIsAddRoomOpen(true)}
                    className="min-h-11 flex items-center gap-1.5 px-3.5 py-2 bg-[#1C3A31] text-[#E0B973] rounded-xl text-xs font-semibold disabled:opacity-50 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add house</span>
                  </button>
                )}
              </div>
            </div>

            {/* Houses Grid */}
            <div data-testid="houses-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propertyRooms.map((room) => {
                const isOccupied = room.status === 'occupied';
                const formattedGuest = [room.guestTitle, room.currentGuestName]
                  .filter(Boolean)
                  .join(' ')
                  .trim();
                const photoSrc = dbService.resolveRoomPhotoUrl(room, currentProperty);

                return (
                  <div
                    key={room.id}
                    data-testid={`house-card-${room.id}`}
                    className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      {/* House Photo Thumbnail */}
                      <div className="h-40 bg-stone-100 relative overflow-hidden">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={room.name || room.roomNumber}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                        )}
                        <span
                          className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full capitalize ${
                            isOccupied
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-900/80 text-white backdrop-blur-xs'
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>

                      <div className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-serif font-bold text-stone-900">
                              {room.name || room.roomNumber}
                            </h3>
                            <p className="text-xs text-stone-500 font-medium">
                              {room.houseType || room.roomType || 'Apartment'}
                            </p>
                          </div>

                          <button
                            type="button"
                            data-testid={`edit-house-btn-${room.id}`}
                            onClick={() => handleOpenEditHouse(room)}
                            title="Edit house details & photo"
                            className="p-2 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Occupied Guest Details (visible only to authorized departments) */}
                        {canViewCheckOuts ? (
                          isOccupied && formattedGuest ? (
                            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1 text-xs">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                                <User className="w-3.5 h-3.5 text-emerald-800" />
                                <span>{formattedGuest}</span>
                              </div>
                              {room.guestCheckOutDate && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>
                                    Check-out:{' '}
                                    {formatPropertyDate(room.guestCheckOutDate, timezone)}
                                  </span>
                                </div>
                              )}
                              {room.guestPhone && (
                                <div className="flex items-center gap-1.5 text-xs text-emerald-900 whitespace-nowrap">
                                  <Phone className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>{room.guestPhone}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs text-stone-500">
                              Available for check-in
                            </div>
                          )
                        ) : (
                          <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl text-xs text-stone-600 font-medium">
                            {isOccupied ? 'Occupied' : 'Available'}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="p-4 pt-0 space-y-2">
                      {canViewCheckOuts && (
                        <div className="flex items-center gap-2">
                          {isOccupied ? (
                            <>
                              <button
                                type="button"
                                data-testid={`card-checkout-btn-${room.id}`}
                                disabled={isPropertySuspended}
                                onClick={() => setCheckOutConfirmRoom(room)}
                                className="min-h-11 flex-1 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                              >
                                Check out
                              </button>
                              <button
                                type="button"
                                disabled={isPropertySuspended}
                                onClick={() => handleOpenCheckInModal(room)}
                                className="min-h-11 py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl disabled:opacity-50 cursor-pointer"
                              >
                                Edit guest
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              data-testid={`card-checkin-btn-${room.id}`}
                              disabled={isPropertySuspended}
                              onClick={() => handleOpenCheckInModal(room)}
                              className="min-h-11 flex-1 py-2 px-3 bg-[#1C3A31] hover:bg-emerald-950 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                            >
                              Check in
                            </button>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        data-testid={`open-qr-plaque-${room.id}`}
                        onClick={() => setQrPlaqueRoom(room)}
                        className="min-h-11 w-full py-2 px-3 bg-[#F5F1E8] text-[#1C3A31] hover:bg-stone-200/80 text-xs font-semibold rounded-xl border border-stone-900/[0.08] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>QR card</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: TEAM TAB
           ========================================================================= */}
        {dashboardTab === 'team' && isManagerOrAdmin && (
          <div data-testid="team-tab" className="space-y-4">
            <div className="bg-[#1C3A31] text-stone-100 p-5 rounded-2xl shadow-2xs border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-serif font-bold text-white">Property team</h2>
                <p className="text-xs text-stone-300 mt-0.5">
                  Staff accounts and roles are managed by the founder in Hospitaly HQ.
                </p>
              </div>

              {/* Founder "Create account" vs GM "Request new account" WhatsApp button (Q2.5) */}
              {isFounder ? (
                <button
                  type="button"
                  data-testid="create-account-btn"
                  onClick={() => setIsCreateStaffModalOpen(true)}
                  className="min-h-11 px-3.5 py-2 bg-[#E0B973] hover:bg-[#d4ad65] text-stone-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Create account</span>
                </button>
              ) : (
                <a
                  href={`https://wa.me/${FOUNDER_WHATSAPP_NUMBER}?text=${encodeURIComponent(
                    `Hello Founder, I would like to request a new staff account for ${
                      currentProperty?.name || 'Rock Apartments'
                    }.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-11 px-3.5 py-2 bg-[#E0B973] text-stone-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <span>Request new account</span>
                </a>
              )}
            </div>

            {/* Mobile Stacked Cards (< 768px) with whitespace-nowrap phones */}
            <div className="space-y-2.5">
              {teamListMembers.map((staff) => {
                const isCurrent = user?.id === staff.id;
                return (
                  <div
                    key={staff.id}
                    data-testid={`team-card-${staff.id}`}
                    className={`bg-white rounded-2xl border p-4 space-y-2 ${
                      isCurrent ? 'border-amber-300 bg-amber-50/20' : 'border-stone-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-stone-900">{staff.name}</span>
                          {isCurrent && (
                            <span className="text-xs font-semibold bg-[#1C3A31] text-[#E0B973] px-2 py-0.5 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 capitalize mt-0.5">
                          {staff.role === 'founder'
                            ? 'Founder'
                            : staff.role === 'manager'
                            ? 'General Manager'
                            : `Staff · ${staff.department || 'Housekeeping'}`}
                        </p>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        Active
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-100 text-xs text-stone-600 space-y-1">
                      <p className="break-all">{staff.email}</p>
                      {staff.phone && (
                        <p className="whitespace-nowrap font-medium text-stone-700">
                          {staff.phone}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: CHECK-IN SHEET (Full height on mobile, keyboard-safe)
         ========================================================================= */}
      {checkInRoom && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="checkin-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center p-0 sm:p-4 overflow-y-auto"
        >
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92dvh]">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs uppercase font-bold text-stone-500 block">
                  Guest check-in
                </span>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  {checkInRoom.name || checkInRoom.roomNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckInRoom(null)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCheckInSubmit}
              className="p-4 space-y-4 overflow-y-auto flex-1 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Title and Name */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-xs font-bold text-stone-600 block mb-1">Title</label>
                    <select
                      data-testid="checkin-title-select"
                      value={checkInGuestTitle}
                      onChange={(e) => setCheckInGuestTitle(e.target.value as any)}
                      className="w-full min-h-11 px-2.5 py-2 text-xs rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="">None</option>
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="text-xs font-bold text-stone-600 block mb-1">Full name *</label>
                    <input
                      type="text"
                      data-testid="checkin-name-input"
                      required
                      placeholder="e.g. Jane Mwamba"
                      value={checkInGuestName}
                      onChange={(e) => setCheckInGuestName(e.target.value)}
                      className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">
                    Phone / WhatsApp (optional)
                  </label>
                  <input
                    type="tel"
                    data-testid="checkin-phone-input"
                    placeholder="e.g. +260 97 700 1122"
                    value={checkInPhone}
                    onChange={(e) => setCheckInPhone(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>

                {/* Check-Out Presets */}
                <div>
                  <span className="text-xs font-bold text-stone-600 block mb-1.5">
                    Check-out presets
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      data-testid="preset-tomorrow"
                      onClick={() => handleApplyPresetCheckout(1)}
                      className="min-h-11 py-1.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                    >
                      Tomorrow 11:00
                    </button>
                    <button
                      type="button"
                      data-testid="preset-plus2"
                      onClick={() => handleApplyPresetCheckout(2)}
                      className="min-h-11 py-1.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                    >
                      +2 days
                    </button>
                    <button
                      type="button"
                      data-testid="preset-plus3"
                      onClick={() => handleApplyPresetCheckout(3)}
                      className="min-h-11 py-1.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold cursor-pointer"
                    >
                      +3 days
                    </button>
                  </div>
                </div>

                {/* Custom Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-stone-600 block mb-1">Date</label>
                    <input
                      type="date"
                      required
                      data-testid="checkin-date-input"
                      value={checkInCheckoutDate}
                      onChange={(e) => setCheckInCheckoutDate(e.target.value)}
                      className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-600 block mb-1">Time</label>
                    <input
                      type="time"
                      required
                      data-testid="checkin-time-input"
                      value={checkInCheckoutTime}
                      onChange={(e) => setCheckInCheckoutTime(e.target.value)}
                      className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky footer button */}
              <div className="pt-3 border-t border-stone-100 shrink-0">
                <button
                  type="submit"
                  data-testid="confirm-checkin-submit"
                  className="w-full min-h-11 py-3 bg-[#1C3A31] text-[#E0B973] rounded-xl font-bold text-sm shadow-sm active:scale-[0.99] cursor-pointer"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CHECK-OUT CONFIRM SHEET
         ========================================================================= */}
      {checkOutConfirmRoom && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="checkout-confirm-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white max-w-sm w-full rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-stone-900">Confirm check-out</h3>
              <button
                type="button"
                onClick={() => setCheckOutConfirmRoom(null)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Check out{' '}
              <strong className="text-stone-900">
                {checkOutConfirmRoom.guestTitle ? `${checkOutConfirmRoom.guestTitle} ` : ''}
                {checkOutConfirmRoom.currentGuestName || 'Guest'}
              </strong>{' '}
              from{' '}
              <strong className="text-stone-900">
                {checkOutConfirmRoom.name || checkOutConfirmRoom.roomNumber}
              </strong>
              ? This will close their stay and set the house to available.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckOutConfirmRoom(null)}
                className="min-h-11 flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Keep stay
              </button>
              <button
                type="button"
                data-testid="confirm-checkout-btn"
                onClick={handleConfirmCheckOut}
                className="min-h-11 flex-1 py-2.5 rounded-xl bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Check-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT HOUSE & PHOTO UPLOAD
         ========================================================================= */}
      {editHouseRoom && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="edit-house-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white max-w-md w-full rounded-3xl p-5 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif font-bold text-stone-900">
                Edit {editHouseRoom.name || editHouseRoom.roomNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditHouseRoom(null)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditHouse} className="space-y-3.5">
              {/* Photo Upload Section */}
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">House photo</label>
                {editHouseRoom.imageId ? (
                  <div className="flex items-center justify-between gap-3 p-2 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-xs text-stone-700 font-medium truncate">
                      Custom photo uploaded
                    </span>
                    <button
                      type="button"
                      data-testid="remove-house-photo-btn"
                      onClick={handleRemoveHousePhoto}
                      className="text-xs text-rose-700 font-semibold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      data-testid="house-photo-file-input"
                      onChange={handlePhotoUploadForHouse}
                      disabled={editRoomPhotoUploading}
                      className="w-full text-xs text-stone-600 file:mr-2 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#1C3A31] file:text-white"
                    />
                    {editRoomPhotoUploading && (
                      <p className="text-xs text-stone-500 mt-1">Compressing &amp; uploading...</p>
                    )}
                    {editRoomPhotoError && (
                      <p className="text-xs text-rose-700 mt-1">{editRoomPhotoError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Name and House Type */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">House name *</label>
                  <input
                    type="text"
                    required
                    value={editRoomNumber}
                    onChange={(e) => setEditRoomNumber(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">House type</label>
                  <input
                    type="text"
                    data-testid="edit-house-type-input"
                    placeholder="e.g. Garden Studio Apartment"
                    value={editHouseType}
                    onChange={(e) => setEditHouseType(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              {/* Wi-Fi credentials */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Wi-Fi name</label>
                  <input
                    type="text"
                    data-testid="edit-wifi-name-input"
                    value={editRoomWifiName}
                    onChange={(e) => setEditRoomWifiName(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Wi-Fi password</label>
                  <input
                    type="text"
                    data-testid="edit-wifi-password-input"
                    value={editRoomWifiPassword}
                    onChange={(e) => setEditRoomWifiPassword(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditHouseRoom(null)}
                  className="min-h-11 flex-1 py-2.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="save-house-edit-btn"
                  className="min-h-11 flex-1 py-2.5 rounded-xl bg-[#1C3A31] text-[#E0B973] text-xs font-bold cursor-pointer"
                >
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT HOUSE GUIDE (GM only)
         ========================================================================= */}
      {isGuideModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="edit-guide-modal"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-white max-w-lg w-full rounded-3xl p-5 shadow-2xl space-y-4 my-8 max-h-[90dvh] flex flex-col">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 shrink-0">
              <h3 className="text-base font-serif font-bold text-stone-900">Edit House Guide</h3>
              <button
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuide} className="space-y-3.5 overflow-y-auto flex-1 p-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Check-in time</label>
                  <input
                    type="text"
                    value={guideCheckInTime}
                    onChange={(e) => setGuideCheckInTime(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Check-out time</label>
                  <input
                    type="text"
                    value={guideCheckOutTime}
                    onChange={(e) => setGuideCheckOutTime(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Emergency phone</label>
                <input
                  type="text"
                  value={guideEmergencyPhone}
                  onChange={(e) => setGuideEmergencyPhone(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Gate &amp; security</label>
                <textarea
                  rows={2}
                  value={guideData.gateInstructions || ''}
                  onChange={(e) =>
                    setGuideData((prev) => ({ ...prev, gateInstructions: e.target.value }))
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Power &amp; water</label>
                <textarea
                  rows={2}
                  value={guideData.powerWaterNotes || ''}
                  onChange={(e) =>
                    setGuideData((prev) => ({ ...prev, powerWaterNotes: e.target.value }))
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Pool &amp; garden</label>
                <textarea
                  rows={2}
                  value={guideData.poolGardenRules || ''}
                  onChange={(e) =>
                    setGuideData((prev) => ({ ...prev, poolGardenRules: e.target.value }))
                  }
                  className="w-full p-2.5 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div className="pt-2 border-t border-stone-100 shrink-0">
                <button
                  type="submit"
                  data-testid="save-guide-btn"
                  className="w-full min-h-11 py-3 bg-[#1C3A31] text-[#E0B973] rounded-xl font-bold text-sm cursor-pointer"
                >
                  Save House Guide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CANCEL REQUEST PROMPT WITH REASON
         ========================================================================= */}
      {cancelPromptReqId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white max-w-sm w-full rounded-3xl p-5 shadow-2xl space-y-3">
            <h3 className="text-base font-serif font-bold text-stone-900">Cancel request?</h3>
            <p className="text-xs text-stone-600">
              Please enter an optional cancellation reason for the record.
            </p>
            <input
              type="text"
              placeholder="e.g. Guest called reception to cancel"
              value={cancelReasonText}
              onChange={(e) => setCancelReasonText(e.target.value)}
              className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelPromptReqId(null)}
                className="min-h-11 flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Keep request
              </button>
              <button
                type="button"
                data-testid="confirm-staff-cancel-btn"
                onClick={handleConfirmCancelPrompt}
                className="min-h-11 flex-1 py-2 rounded-xl bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Cancel request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REOPEN REQUEST PROMPT (GM VERIFICATION, Q2.2)
         ========================================================================= */}
      {reopenModalReqId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white max-w-sm w-full rounded-3xl p-5 shadow-2xl space-y-3">
            <h3 className="text-base font-serif font-bold text-stone-900">Reopen request</h3>
            <p className="text-xs text-stone-600">
              Please enter the reason for reopening this request (required):
            </p>
            <input
              type="text"
              data-testid="reopen-reason-input"
              required
              placeholder="e.g. Guest reported issue still unresolved"
              value={reopenReasonText}
              onChange={(e) => setReopenReasonText(e.target.value)}
              className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
            />
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReopenModalReqId(null);
                  setReopenReasonText('');
                }}
                className="min-h-11 flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-reopen-btn"
                disabled={!reopenReasonText.trim()}
                onClick={handleConfirmReopenPrompt}
                className="min-h-11 flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
              >
                Reopen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD HOUSE (FOUNDER ONLY, Q2.4)
         ========================================================================= */}
      {isAddRoomOpen && isFounder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-stone-500 block">
                  Add House
                </span>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  {currentProperty?.name || 'Rock Apartments'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoomOpen(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddHouseSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">House name / number *</label>
                <input
                  type="text"
                  required
                  data-testid="add-house-name-input"
                  placeholder="e.g. Kasama House"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">House type *</label>
                <input
                  type="text"
                  required
                  data-testid="add-house-type-input"
                  placeholder="e.g. 2-Bedroom Pool Villa"
                  value={newHouseType}
                  onChange={(e) => setNewHouseType(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Wi-Fi Network Name</label>
                  <input
                    type="text"
                    data-testid="add-house-wifi-name-input"
                    placeholder="e.g. RockGuest"
                    value={newRoomWifiName}
                    onChange={(e) => setNewRoomWifiName(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Wi-Fi Password</label>
                  <input
                    type="text"
                    data-testid="add-house-wifi-password-input"
                    placeholder="e.g. Welcome2026"
                    value={newRoomWifiPassword}
                    onChange={(e) => setNewRoomWifiPassword(e.target.value)}
                    className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="min-h-11 flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-add-house-btn"
                  className="min-h-11 flex-1 py-2 rounded-xl bg-[#1C3A31] text-[#E0B973] text-xs font-bold cursor-pointer"
                >
                  Create House &amp; QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FOUNDER CREATE ACCOUNT IN PROPERTY DESK (Q2.5)
         ========================================================================= */}
      {isCreateStaffModalOpen && isFounder && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div className="bg-white max-w-md w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold text-stone-500 block">
                  Create Account
                </span>
                <h3 className="text-base font-serif font-bold text-stone-900">
                  {currentProperty?.name || 'Rock Apartments'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateStaffModalOpen(false)}
                className="w-11 h-11 rounded-full flex items-center justify-center text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaffAccountSubmit} className="p-4 space-y-3.5 overflow-y-auto flex-1">
              {staffProvisionError && (
                <div className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
                  {staffProvisionError}
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Full name *</label>
                <input
                  type="text"
                  required
                  data-testid="create-staff-name-input"
                  placeholder="e.g. John Phiri"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Email address *</label>
                <input
                  type="email"
                  required
                  data-testid="create-staff-email-input"
                  placeholder="staff@example.com"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Role</label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full min-h-11 px-2.5 py-2 text-xs rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">General Manager</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-600 block mb-1">Department</label>
                  <select
                    value={newStaffDept}
                    onChange={(e) => setNewStaffDept(e.target.value as any)}
                    className="w-full min-h-11 px-2.5 py-2 text-xs rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="housekeeping">Housekeeping</option>
                    <option value="reception">Reception</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="concierge">Concierge</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  data-testid="create-staff-password-input"
                  placeholder="At least 6 characters"
                  value={newStaffPassword}
                  onChange={(e) => setNewStaffPassword(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-600 block mb-1">Phone / WhatsApp (optional)</label>
                <input
                  type="tel"
                  placeholder="+260 97 000 0000"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-full min-h-11 px-3 py-2 text-xs rounded-xl border border-stone-300"
                />
              </div>

              <div className="pt-2 border-t border-stone-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateStaffModalOpen(false)}
                  className="min-h-11 flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioningStaff}
                  data-testid="submit-create-staff-btn"
                  className="min-h-11 flex-1 py-2 rounded-xl bg-[#1C3A31] text-[#E0B973] text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {isProvisioningStaff ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR PLAQUE MODAL */}
      {qrPlaqueRoom && (
        <QRPlaqueModal
          roomId={qrPlaqueRoom.id}
          roomNumber={qrPlaqueRoom.name || qrPlaqueRoom.roomNumber}
          token={
            allQRCodes.find((q) => q.roomId === qrPlaqueRoom.id && q.status === 'active')?.token ||
            allQRCodes.find((q) => q.roomId === qrPlaqueRoom.id)?.token ||
            ''
          }
          propertyName={currentProperty?.name || 'Rock Apartments'}
          primaryColor={currentProperty?.primaryColor || '#1C3A31'}
          onClose={() => setQrPlaqueRoom(null)}
          onRegenerate={() => dbService.regenerateRoomQRToken(qrPlaqueRoom.id)}
        />
      )}
    </div>
  );
};
