import React, { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../../context/AuthContext';
import { dbService, subscribeToStore, DEFAULT_HOUSE_AMENITIES } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { ServiceRequest, RequestStatus, Room, DiningItem, UserProfile, StaffDepartment, UserNotificationSettings } from '../../types';
import { QRCodeView, renderPrintableQRCardCanvas } from '../common/QRCodeView';
import { 
  Check, 
  Clock, 
  AlertTriangle, 
  Filter, 
  UserCheck, 
  RotateCcw, 
  Building2, 
  LogOut, 
  Search,
  Sparkles,
  Phone,
  CheckCircle2,
  XCircle,
  Shield,
  Plus,
  QrCode,
  Printer,
  UserPlus,
  DoorOpen,
  Trash2,
  Copy,
  Calendar,
  X,
  ExternalLink,
  BedDouble,
  User,
  UtensilsCrossed,
  Users,
  KeyRound,
  DollarSign,
  Tag,
  ShieldAlert,
  Eye,
  EyeOff,
  MessageSquare,
  Volume2,
  Radio,
  Camera,
  Upload,
  Download,
  RefreshCw,
  Bell,
  BellOff,
  Smartphone,
  Share,
  Edit3,
  Moon
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

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ 
  onSelectRoomForGuest,
  onSwitchToAdmin
}) => {
  const { user, signOut } = useAuth();
  
  // Role verification
  const isFounder = user?.role === 'founder';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'founder';
  const isStaffOnly = user?.role === 'staff';

  // Primary tab state (auto fallback if staff tries to open manager tabs)
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('requests');

  // Requests filtering state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);

  // Rooms filtering state
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomFilterStatus, setRoomFilterStatus] = useState<'all' | 'available' | 'occupied'>('all');

  // Modals state for Room Management
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Executive Pool Villa');
  const [newRoomQrLabel, setNewRoomQrLabel] = useState('');
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>(DEFAULT_HOUSE_AMENITIES);
  const [newCustomAmenity, setNewCustomAmenity] = useState('');

  // Edit House modal state
  const [editHouseRoom, setEditHouseRoom] = useState<Room | null>(null);
  const [editRoomNumber, setEditRoomNumber] = useState('');
  const [editRoomType, setEditRoomType] = useState('');
  const [editRoomQrLabel, setEditRoomQrLabel] = useState('');
  const [editRoomAmenities, setEditRoomAmenities] = useState<string[]>(DEFAULT_HOUSE_AMENITIES);
  const [editCustomAmenity, setEditCustomAmenity] = useState('');

  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null);
  const [checkInGuestName, setCheckInGuestName] = useState('');
  const [checkInCheckoutDate, setCheckInCheckoutDate] = useState('');
  const [checkInPhone, setCheckInPhone] = useState('');

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
  const [newDiningCategory, setNewDiningCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'dessert'>('breakfast');
  const [newDiningDescription, setNewDiningDescription] = useState('');
  const [newDiningPrice, setNewDiningPrice] = useState<string>('150');
  const [newDiningImage, setNewDiningImage] = useState('');

  // Subscribe to reactive store with stable snapshots
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

  const propertyScopedRequests = user?.propertyId
    ? allRequests.filter((r) => r.propertyId === user.propertyId)
    : allRequests.filter((r) => !currentProperty || r.propertyId === currentProperty.id);

  // Staff can process ONLY authorised requests assigned to them
  const requests = isStaffOnly
    ? propertyScopedRequests.filter((r) => r.assignedTo?.uid === user?.id)
    : propertyScopedRequests;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;
  const unassignedCount = requests.filter((r) => r.status === 'pending' && !r.assignedTo?.uid).length;

  // Capture Android PWA install prompt
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Deep link support for /staff?request={id} from push notifications
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

  // Update browser tab title to "(3) Hospitaly Staff" when open requests exist
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const activeTotal = pendingCount + inProgressCount;
    document.title = activeTotal > 0 ? `(${activeTotal}) Hospitaly Staff` : 'Hospitaly Staff';
    return () => {
      document.title = 'Hospitaly';
    };
  }, [pendingCount, inProgressCount]);

  // Play alert chime when a new pending request arrives while /staff is open
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

  const propertyStaff = currentProperty?.id
    ? allUsers.filter((u) => u.propertyId === currentProperty.id && u.active)
    : allUsers.filter((u) => u.active);

  const isDiningEnabled = currentProperty?.diningEnabled !== false;
  const unitLabel = currentProperty?.unitLabel || 'House';
  const unitLabelPlural = `${unitLabel}s`;

  // Enforce tier guard: staff can only view 'requests', menu hidden when dining disabled
  const activeTab: DashboardTab = !isManagerOrAdmin
    ? 'requests'
    : !isDiningEnabled && dashboardTab === 'menu'
    ? 'requests'
    : dashboardTab;

  // Request actions
  const handleStatusUpdate = (requestId: string, newStatus: RequestStatus) => {
    if (!user) return;
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
    if (!isManagerOrAdmin) {
      return;
    }
    dbService.updateRequestStatus(requestId, 'cancelled', user ? { uid: user.id, name: user.name } : undefined);
  };

  // Room actions
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim() || !newRoomType.trim()) return;
    const propId = user?.propertyId || currentProperty?.id || 'prop_rocks_lusaka';
    const cleanQrLabel = (newRoomQrLabel.trim() || newRoomNumber.trim()).toUpperCase().slice(0, 8);
    dbService.addRoomWithQR(propId, newRoomNumber.trim(), newRoomType.trim(), {
      amenities: newRoomAmenities.length > 0 ? newRoomAmenities : DEFAULT_HOUSE_AMENITIES,
      qrLabel: cleanQrLabel,
    });
    setNewRoomNumber('');
    setNewRoomType('Executive Pool Villa');
    setNewRoomQrLabel('');
    setNewRoomAmenities(DEFAULT_HOUSE_AMENITIES);
    setNewCustomAmenity('');
    setIsAddRoomOpen(false);
  };

  const handleOpenEditHouse = (room: Room) => {
    setEditHouseRoom(room);
    setEditRoomNumber(room.roomNumber);
    setEditRoomType(room.roomType);
    setEditRoomQrLabel((room.qrLabel || room.roomNumber).toUpperCase().slice(0, 8));
    setEditRoomAmenities(
      Array.isArray(room.amenities) && room.amenities.length > 0
        ? room.amenities.filter((a) => !/hot\s*tub/i.test(a))
        : DEFAULT_HOUSE_AMENITIES
    );
    setEditCustomAmenity('');
  };

  const handleSaveEditHouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editHouseRoom || !editRoomNumber.trim() || !editRoomType.trim()) return;
    const cleanQrLabel = (editRoomQrLabel.trim() || editRoomNumber.trim()).toUpperCase().slice(0, 8);
    dbService.updateRoomDetails(editHouseRoom.id, {
      roomNumber: editRoomNumber.trim(),
      roomType: editRoomType.trim(),
      qrLabel: cleanQrLabel,
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
      link.download = `${(currentProperty?.slug || 'rock-apartments')}-qr-cards-300dpi.zip`;
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
    if (!confirmRegenerateRoom) return;
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
    setCheckInGuestName(room.currentGuestName || '');
    setCheckInCheckoutDate(room.guestCheckOutDate || 'Tomorrow, 10:30 AM');
    setCheckInPhone(room.guestPhone || '');
  };

  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInRoom || !checkInGuestName.trim()) return;
    dbService.assignGuestToRoom(
      checkInRoom.id,
      checkInGuestName.trim(),
      checkInCheckoutDate.trim() || undefined,
      checkInPhone.trim() || undefined
    );
    setCheckInRoom(null);
    setCheckInGuestName('');
    setCheckInCheckoutDate('');
    setCheckInPhone('');
  };

  const handleCheckOut = (roomId: string, _roomNum: string) => {
    dbService.checkOutRoom(roomId);
  };

  const handleDeleteRoom = (roomId: string, _roomNum: string) => {
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
    if (!newDiningName.trim() || !newDiningPrice.trim()) return;
    const propId = currentProperty?.id || 'prop_zambezi_01';
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
    dbService.deleteDiningItem(id);
  };

  const handleToggleDiningAvailable = (item: DiningItem) => {
    dbService.updateDiningItem(item.id, { available: !item.available });
  };

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

  // Filtered rooms
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
      if (!item.name.toLowerCase().includes(q) && !item.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const occupiedRoomsCount = propertyRooms.filter((r) => r.status === 'occupied').length;
  const availableRoomsCount = propertyRooms.filter((r) => r.status === 'available').length;

  // Selected QR code for plaque modal
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
    <div className="min-h-screen bg-stone-100 text-stone-900 pb-20 selection:bg-amber-100 selection:text-emerald-950">
      {/* Top Navbar */}
      <header className="bg-white border-b border-stone-900/[0.08] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-diffused">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center font-bold text-base shadow-2xs">
            H
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded ${
                isFounder 
                  ? 'bg-purple-100 text-purple-900' 
                  : user?.role === 'manager'
                  ? 'bg-amber-100 text-amber-900 font-extrabold'
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                {isFounder ? 'Tier 1 • Founder Admin' : user?.role === 'manager' ? 'Tier 2 • General Manager' : 'Tier 3 • Staff Member'}
              </span>
              <span className="text-[10px] bg-stone-100/90 text-stone-600 px-2 py-0.5 rounded font-mono border border-stone-900/[0.05]">
                {currentProperty?.name || 'All Properties'}
              </span>
            </div>
            <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2 mt-0.5">
              <span>{user?.name}</span>
              <span className="capitalize text-stone-500 font-medium text-xs">
                &bull; {user?.department}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!userNotifSettings.enabled ? (
            <button
              onClick={handleEnablePushAlerts}
              disabled={isEnablingPush}
              className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-800 text-amber-300 rounded-xl text-xs font-bold active:scale-[0.96] transition-all flex items-center gap-1.5 shadow-2xs"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{isEnablingPush ? 'Enabling...' : 'Turn on request alerts'}</span>
            </button>
          ) : (
            <button
              onClick={() => setIsNotifModalOpen(true)}
              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-xl text-xs font-semibold active:scale-[0.96] transition-all flex items-center gap-1.5 border border-emerald-900/[0.12]"
              title="Manage push notifications, quiet hours & night duty"
            >
              <Bell className="w-3.5 h-3.5 text-emerald-700" />
              <span>Alerts On</span>
              {userNotifSettings.onDutyNight && (
                <span className="px-1.5 py-0.2 bg-emerald-900 text-amber-300 rounded text-[9px] uppercase font-mono">
                  Night Duty
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setIsNotifModalOpen(true)}
            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold active:scale-[0.96] transition-all flex items-center gap-1"
            title="Notification & Quiet Hours Settings"
          >
            <Moon className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">Alert Settings</span>
          </button>

          <button
            onClick={() => {
              notificationService.playStaffAlertChime();
              notificationService.triggerHaptic('dispatch');
            }}
            className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-xl text-xs font-semibold active:scale-[0.96] transition-all flex items-center gap-1 border border-amber-900/[0.1]"
            title="Test Reception Audio Alert Chime"
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-800" />
            <span>Chime Alert</span>
          </button>

          {isFounder && onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-1.5 bg-amber-400 text-stone-950 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-amber-300 rounded-xl text-xs font-bold active:scale-[0.96] transition-[background-color,transform] duration-140 shadow-xs"
            >
              Founder HQ
            </button>
          )}

          <button
            onClick={() => signOut()}
            title="Sign out of Staff Portal"
            className="px-3 py-1.5 bg-stone-900 text-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-800 rounded-xl text-xs font-semibold active:scale-[0.96] transition-[background-color,transform] duration-140 flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* One-time Dismissible PWA Home Screen Install Banner */}
      {showPwaBanner && (
        <div className="bg-stone-950 text-stone-100 border-b border-stone-800 px-6 py-3 no-print">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-white">
                  Add Hospitaly to your home screen to get request alerts
                </p>
                <p className="text-stone-400 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <strong className="text-amber-300">iPhone:</strong> Tap <Share className="w-3 h-3 inline text-amber-300" /> Share &rarr; <em>Add to Home Screen</em>
                  </span>
                  <span>&bull;</span>
                  <span>
                    <strong className="text-emerald-400">Android:</strong> Tap <em>Install</em> or browser menu &rarr; <em>Install app</em>
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              {deferredInstallPrompt && (
                <button
                  onClick={handleTriggerPwaInstall}
                  className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl transition-colors"
                >
                  Install App
                </button>
              )}
              <button
                onClick={handleDismissPwaBanner}
                className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Dismiss</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Navigation Tab Bar - Manager/Founder sees operational tabs, Staff sees assigned requests */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-900/[0.08] pb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tab 1: Live Requests */}
            <button
              onClick={() => setDashboardTab('requests')}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                activeTab === 'requests'
                  ? 'bg-brand-primary text-brand-secondary shadow-diffused'
                  : 'bg-white text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 border border-stone-900/[0.08]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{isStaffOnly ? 'My Assigned Requests' : 'Live Requests'}</span>
              {unassignedCount > 0 && (
                <span
                  className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse"
                  title={`${unassignedCount} unassigned request(s) waiting`}
                />
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'requests' ? 'bg-brand-secondary text-stone-950' : 'bg-stone-100 text-stone-600'
              }`}>
                {pendingCount + inProgressCount}
              </span>
            </button>

            {/* Tab 2: Houses, Check-In & QR Codes (Manager & Founder only) */}
            {isManagerOrAdmin && (
              <button
                onClick={() => setDashboardTab('rooms')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                  activeTab === 'rooms'
                    ? 'bg-brand-primary text-brand-secondary shadow-diffused'
                    : 'bg-white text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 border border-stone-900/[0.08]'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{unitLabelPlural}, Check-In & QR Codes</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'rooms' ? 'bg-brand-secondary text-stone-950' : 'bg-stone-100 text-stone-600'
                }`}>
                  {propertyRooms.length}
                </span>
              </button>
            )}

            {/* Tab 3: Menu & Pricing (Only shown when diningEnabled is true) */}
            {isManagerOrAdmin && isDiningEnabled && (
              <button
                onClick={() => setDashboardTab('menu')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                  activeTab === 'menu'
                    ? 'bg-brand-primary text-brand-secondary shadow-diffused'
                    : 'bg-white text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 border border-stone-900/[0.08]'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>Menu & Pricing</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'menu' ? 'bg-brand-secondary text-stone-950' : 'bg-stone-100 text-stone-600'
                }`}>
                  {propertyDining.length}
                </span>
              </button>
            )}

            {/* Tab 4: Team & Staff (Tier 2 GM & Founder only) */}
            {isManagerOrAdmin && (
              <button
                onClick={() => setDashboardTab('team')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                  activeTab === 'team'
                    ? 'bg-brand-primary text-brand-secondary shadow-diffused'
                    : 'bg-white text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 border border-stone-900/[0.08]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Team & Staff</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === 'team' ? 'bg-brand-secondary text-stone-950' : 'bg-stone-100 text-stone-600'
                }`}>
                  {propertyStaff.length}
                </span>
              </button>
            )}
          </div>

          {/* Contextual Action Button */}
          {activeTab === 'rooms' && isManagerOrAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadAllQRsZip}
                disabled={isDownloadingZip || propertyRooms.length === 0}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border border-stone-900/[0.12] rounded-xl text-xs font-semibold shadow-2xs active:scale-[0.96] transition-all select-none disabled:opacity-50"
                title="Download 300 DPI printable QR cards for all houses as a ZIP"
              >
                <Download className="w-4 h-4 text-emerald-900" />
                <span>{isDownloadingZip ? 'Bundling ZIP...' : 'Download all (ZIP)'}</span>
              </button>
              <button
                onClick={() => setIsAddRoomOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 text-brand-secondary rounded-xl text-xs font-semibold shadow-diffused active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
              >
                <Plus className="w-4 h-4" />
                <span>Add {unitLabel}</span>
              </button>
            </div>
          )}

          {activeTab === 'menu' && isManagerOrAdmin && isDiningEnabled && (
            <button
              onClick={() => setIsAddDiningOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 text-brand-secondary rounded-xl text-xs font-semibold shadow-diffused active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dining Item</span>
            </button>
          )}
        </div>

        {/* TAB 1: LIVE REQUESTS */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* KPI Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-900/[0.08] shadow-diffused flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Pending</span>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-900/[0.08] shadow-diffused flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">In Progress</span>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{inProgressCount}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-900/[0.08] shadow-diffused flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Completed</span>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-900/[0.08] shadow-diffused flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Cancelled</span>
                  <p className="text-2xl font-bold text-stone-600 mt-1">{cancelledCount}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center font-bold">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Filter Controls & Search */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search requests by room, title, guest name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                  <span className="text-stone-500 font-semibold uppercase text-[10px] tracking-wider pl-1">Dept:</span>
                  {['all', 'housekeeping', 'maintenance', 'concierge', 'dining', 'transport'].map((dept) => (
                    <button
                      key={dept}
                      onClick={() => setFilterDepartment(dept)}
                      className={`px-2.5 py-1.5 rounded-lg font-medium capitalize transition-all whitespace-nowrap ${
                        filterDepartment === dept
                          ? 'bg-emerald-900 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100 overflow-x-auto">
                {['all', 'pending', 'acknowledged', 'in_progress', 'completed', 'cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                      filterStatus === status
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Request Cards Feed */}
            <div className="space-y-3">
              {filteredRequests.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm">
                  No matching service requests found.
                </div>
              ) : (
                filteredRequests.map((req) => (
                  <div
                    id={`request-card-${req.id}`}
                    key={req.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      highlightedRequestId === req.id
                        ? 'border-amber-500 ring-2 ring-amber-400/50 bg-amber-50/20'
                        : 'border-stone-200/90 hover:border-stone-300'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 bg-emerald-100 text-emerald-950 rounded-md">
                          {unitLabel} {req.roomNumber}
                        </span>
                        <span className="text-xs font-semibold uppercase text-stone-600 tracking-wider bg-stone-100 px-2 py-0.5 rounded">
                          {req.category}
                        </span>
                        {req.priority === 'urgent' && (
                          <span className="text-xs font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded-md flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> Urgent
                          </span>
                        )}
                        {req.priority === 'high' && (
                          <span className="text-xs font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md">
                            High Priority
                          </span>
                        )}
                        <span className="text-[11px] text-stone-600">
                          REF: #{req.id.slice(-6).toUpperCase()}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-stone-900">{req.title}</h3>

                      {req.description && (
                        <p className="text-xs text-stone-700 bg-stone-50 p-2.5 rounded-xl border border-stone-100 font-normal">
                          "{req.description}"
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-[11px] text-stone-600 pt-1">
                        <span>Guest: <strong>{req.guestName || 'Anonymous'}</strong></span>
                        {req.guestPhone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-3 h-3 text-emerald-700" /> {req.guestPhone}
                          </span>
                        )}
                        <span>&bull;</span>
                        <span>Received: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {req.assignedTo && (
                          <>
                            <span>&bull;</span>
                            <span className="text-emerald-900 font-semibold">Attended by: {req.assignedTo.name}</span>
                          </>
                        )}
                      </div>

                      {/* Staff Assignment Selector for General Manager / Founder */}
                      {isManagerOrAdmin && (
                        <div className="flex items-center gap-2 pt-2 border-t border-stone-100 flex-wrap">
                          <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wide flex items-center gap-1 font-mono">
                            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Assign Staff:</span>
                          </span>
                          <select
                            value={req.assignedTo?.uid || ''}
                            onChange={(e) => {
                              const staffUid = e.target.value;
                              if (!staffUid) {
                                dbService.updateRequestStatus(req.id, req.status, undefined);
                              } else {
                                const selectedMember = propertyStaff.find((s) => s.id === staffUid);
                                if (selectedMember) {
                                  dbService.updateRequestStatus(req.id, req.status === 'pending' ? 'acknowledged' : req.status, {
                                    uid: selectedMember.id,
                                    name: selectedMember.name,
                                  });
                                  notificationService.notify({
                                    title: 'Staff Assigned',
                                    subtitle: `${selectedMember.name} assigned to Room ${req.roomNumber}`,
                                    roomNumber: req.roomNumber,
                                    category: req.category,
                                  });
                                }
                              }
                            }}
                            className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-stone-800 font-medium focus:ring-1 focus:ring-amber-500 cursor-pointer"
                          >
                            <option value="">-- Unassigned (Select Staff) --</option>
                            {propertyStaff.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.role === 'manager' ? 'GM' : s.department.toUpperCase()})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Workflow Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 flex-wrap">
                      {/* WhatsApp Staff Dispatch */}
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(
                          `*Hospitally Staff Dispatch*\n` +
                          `🏨 *Property:* ${currentProperty?.name || 'Hotel'}\n` +
                          `🚪 *Room:* ${req.roomNumber}\n` +
                          `👤 *Guest:* ${req.guestName || 'In-House Guest'}${req.guestPhone ? ` (${req.guestPhone})` : ''}\n` +
                          `🛎️ *Request:* ${req.title}\n` +
                          (req.description ? `📝 *Details:* ${req.description}\n` : '') +
                          `⚡ *Priority:* ${req.priority.toUpperCase()}\n` +
                          `📍 *Ref:* #${req.id.slice(-6).toUpperCase()}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Dispatch request details via WhatsApp"
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4 shrink-0" />
                        <span>WhatsApp Dispatch</span>
                      </a>

                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(req.id, 'acknowledged')}
                          className="px-3.5 py-2 bg-stone-900 text-white hover:bg-stone-800 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}

                      {req.status === 'acknowledged' && (
                        <button
                          onClick={() => handleStatusUpdate(req.id, 'in_progress')}
                          className="px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Start Service
                        </button>
                      )}

                      {req.status === 'in_progress' && (
                        <button
                          onClick={() => handleStatusUpdate(req.id, 'completed')}
                          className="px-3.5 py-2 bg-emerald-700 text-white hover:bg-emerald-800 rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark Fulfilled
                        </button>
                      )}

                      {req.status === 'completed' && (
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                        </span>
                      )}

                      {req.status === 'cancelled' && (
                        <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-xl border border-stone-200 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Cancelled
                        </span>
                      )}

                      {/* Manager Override Cancel Button */}
                      {isManagerOrAdmin && req.status !== 'completed' && req.status !== 'cancelled' && (
                        <button
                          onClick={() => handleManagerCancel(req.id)}
                          title="Manager override: cancel request"
                          className="px-2.5 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-medium transition-colors flex items-center gap-1"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}

                      <span className="text-[10px] uppercase font-mono px-2 py-1 bg-stone-100 text-stone-600 rounded">
                        {req.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ROOMS, CHECK-IN & QR CODES */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            {/* Rooms KPI Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Total Rooms</span>
                  <p className="text-2xl font-bold text-stone-900 mt-1">{propertyRooms.length}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold">
                  <BedDouble className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Occupied</span>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{occupiedRoomsCount}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Available</span>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{availableRoomsCount}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <DoorOpen className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Active QR Badges</span>
                  <p className="text-2xl font-bold text-amber-700 mt-1">{propertyRooms.length}</p>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                  <QrCode className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Room Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by room number, type, or guest name..."
                  value={roomSearchQuery}
                  onChange={(e) => setRoomSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-none focus:ring-1 focus:ring-emerald-900"
                />
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'available', 'occupied'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setRoomFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
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

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRooms.length === 0 ? (
                <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-stone-200 text-stone-500 text-sm">
                  No rooms match your filter.
                </div>
              ) : (
                filteredRooms.map((room) => {
                  const matchingQR = allQRCodes.find((q) => q.roomId === room.id && q.status === 'active') ||
                    allQRCodes.find((q) => q.roomId === room.id);
                  const isOccupied = room.status === 'occupied';
                  const roomAmenities = (room.amenities || DEFAULT_HOUSE_AMENITIES).filter(
                    (a) => !/hot\s*tub/i.test(a)
                  );

                  return (
                    <div
                      key={room.id}
                      className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xl font-serif font-bold text-stone-900">
                            {room.roomNumber}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isManagerOrAdmin && (
                              <button
                                onClick={() => handleOpenEditHouse(room)}
                                title={`Edit ${unitLabel} details & amenities`}
                                className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span
                              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                                isOccupied
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-stone-100 text-stone-600'
                              }`}
                            >
                              {room.status}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-stone-500 font-medium mb-2.5">
                          {room.roomType}
                        </p>

                        {/* Configured House Amenities */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {roomAmenities.map((amenity) => (
                            <span
                              key={amenity}
                              className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200/70"
                            >
                              {amenity}
                            </span>
                          ))}
                        </div>

                        {/* Guest Personalization Details */}
                        {isOccupied && room.currentGuestName ? (
                          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1 mb-4 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                              <User className="w-3.5 h-3.5 text-emerald-800" />
                              <span>{room.currentGuestName}</span>
                            </div>
                            {room.guestCheckOutDate && (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Checkout: {room.guestCheckOutDate}</span>
                              </div>
                            )}
                            {room.guestPhone && (
                              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-mono">
                                <Phone className="w-3.5 h-3.5" />
                                <span>{room.guestPhone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 bg-stone-50 border border-stone-100 rounded-xl mb-4 text-xs text-stone-500">
                            Ready for arriving guest check-in
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[11px] bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-100 font-mono text-stone-600 mb-4">
                          <span className="truncate">
                            QR Label: <strong>{(room.qrLabel || room.roomNumber).toUpperCase().slice(0, 8)}</strong> &bull; {matchingQR?.token || 'Minting...'}
                          </span>
                          {matchingQR?.token && (
                            <button
                              onClick={() => handleCopyToken(matchingQR.token)}
                              title="Copy QR token"
                              className="text-stone-400 hover:text-stone-700 ml-1 shrink-0"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-3 border-t border-stone-100 space-y-2">
                        <div className="flex items-center gap-2">
                          {isOccupied ? (
                            <>
                              <button
                                onClick={() => handleCheckOut(room.id, room.roomNumber)}
                                className="flex-1 py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl transition-colors"
                              >
                                Check Out
                              </button>
                              <button
                                onClick={() => handleOpenCheckInModal(room)}
                                className="py-1.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors"
                              >
                                Guest
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleOpenCheckInModal(room)}
                              className="flex-1 py-1.5 px-3 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              Check In Guest
                            </button>
                          )}

                          {isManagerOrAdmin && (
                            <button
                              onClick={() => handleDeleteRoom(room.id, room.roomNumber)}
                              title={`Delete ${unitLabel}`}
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* View Printable QR Plaque */}
                        <button
                          onClick={() => setQrPlaqueRoom(room)}
                          className="w-full py-2 px-3 bg-[#1B3B2B] text-amber-300 hover:bg-[#152e22] text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
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

        {/* TAB 3: MENU & PRICING (Tier 2 GM & Admin only) */}
        {activeTab === 'menu' && isManagerOrAdmin && (
          <div className="space-y-6">
            {/* Header / Filter bar */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
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

              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {(['all', 'breakfast', 'lunch', 'dinner', 'drinks', 'dessert'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDiningCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                      diningCategoryFilter === cat
                        ? 'bg-emerald-950 text-amber-300'
                        : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items High-Density Editorial Data Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-600">
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
                          No dining items found for this filter. Click "+ Add Dining Item" to add items to the menu.
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
                                <span className="font-bold text-stone-900 block leading-tight">{item.name}</span>
                                <span className="text-[11px] text-stone-500 line-clamp-1 max-w-sm mt-0.5">{item.description}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-700 capitalize">
                              {item.category}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">
                            {currentProperty?.currency || 'ZMW'} {item.price}
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleToggleDiningAvailable(item)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors inline-flex items-center gap-1.5 ${
                                item.available
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${item.available ? 'bg-emerald-600' : 'bg-stone-400'}`}></span>
                              <span>{item.available ? 'In Stock' : 'Sold Out'}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteDining(item.id, item.name)}
                              title="Delete menu item"
                              className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex"
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

        {/* TAB 4: TEAM & STAFF (Tier 2 GM & Founder only — Read-Only Roster for Managers) */}
        {activeTab === 'team' && isManagerOrAdmin && (
          <div className="space-y-6">
            <div className="bg-brand-primary text-stone-100 p-6 rounded-3xl shadow-sm border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                  Property Team Directory
                </span>
                <h2 className="text-xl font-serif font-bold text-white mt-1">
                  Authorised Property Staff
                </h2>
                <p className="text-xs text-stone-300 mt-1 max-w-xl">
                  During the pilot, account creation, role assignments, and password resets are centrally managed by Hospitally HQ. Contact the Founder if additional staff accounts or access changes are needed.
                </p>
              </div>
              {isFounder && onSwitchToAdmin && (
                <button
                  onClick={onSwitchToAdmin}
                  className="px-4 py-2.5 bg-brand-secondary hover:opacity-90 text-stone-950 rounded-xl text-xs font-bold shadow-md transition-opacity flex items-center gap-1.5 shrink-0"
                >
                  <Shield className="w-4 h-4" />
                  <span>Manage Accounts in Founder HQ</span>
                </button>
              )}
            </div>

            {/* Team & Staff Read-Only Roster */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-600">
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
                        <tr key={staff.id} className={`hover:bg-stone-50/70 transition-colors ${isCurrent ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-3 px-4">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-stone-900">{staff.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-bold bg-brand-primary text-brand-secondary px-1.5 py-0.5 rounded font-mono">
                                    You
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-stone-500 font-mono flex items-center gap-2 mt-0.5">
                                <span>{staff.email}</span>
                                {staff.phone && <span>&bull; {staff.phone}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                              staff.role === 'founder'
                                ? 'bg-purple-100 text-purple-900'
                                : isGM
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-stone-100 text-stone-700'
                            }`}>
                              {staff.role === 'founder' ? 'Founder' : isGM ? 'General Manager' : 'Staff'}
                            </span>
                          </td>
                          <td className="py-3 px-4 capitalize font-medium text-stone-700">
                            {staff.department}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
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

      {/* MODAL 1: ADD NEW HOUSE / ROOM */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] my-8 modal-content-animate">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Add New {unitLabel}</h2>
              </div>
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="p-1.5 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-full active:scale-[0.92] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    {unitLabel} Name or Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bobo, Chisenga, 105"
                    value={newRoomNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewRoomNumber(val);
                      if (!newRoomQrLabel || newRoomQrLabel === newRoomNumber.toUpperCase().slice(0, 8)) {
                        setNewRoomQrLabel(val.trim().toUpperCase().slice(0, 8));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
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
                    className="w-full px-3 py-2.5 text-sm font-mono font-bold uppercase rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  {unitLabel} Category / Type
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                >
                  <option value="Executive Pool Villa">Executive Pool Villa</option>
                  <option value="Garden Studio Apartment">Garden Studio Apartment</option>
                  <option value="Bedroom 3 (Executive Twin)">Bedroom 3 (Executive Twin)</option>
                  <option value="2-Bedroom Pool Residence">2-Bedroom Pool Residence</option>
                  <option value="3-Bedroom Presidential Residence">3-Bedroom Presidential Residence</option>
                  <option value="Deluxe River Suite">Deluxe River Suite</option>
                </select>
              </div>

              {/* House Amenities Picker */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  {unitLabel} Amenities (Shown on Guest Banner)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Array.from(new Set([...AVAILABLE_HOUSE_AMENITIES, ...newRoomAmenities])).map((amenity) => {
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          selected
                            ? 'bg-emerald-950 text-amber-300 border-emerald-950'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {selected ? `✓ ${amenity}` : `+ ${amenity}`}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom amenity (e.g. Private Patio)..."
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
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRoomOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-xl active:scale-[0.96] transition-[background-color,transform] duration-140"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-diffused active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] my-8 modal-content-animate">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Edit {unitLabel} & Amenities</h2>
              </div>
              <button
                onClick={() => setEditHouseRoom(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
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
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
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
                    className="w-full px-3 py-2.5 text-sm font-mono font-bold uppercase rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  {unitLabel} Category / Type
                </label>
                <input
                  type="text"
                  required
                  value={editRoomType}
                  onChange={(e) => setEditRoomType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1.5">
                  {unitLabel} Amenities (Guest Banner Pills)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Array.from(new Set([...AVAILABLE_HOUSE_AMENITIES, ...editRoomAmenities])).map((amenity) => {
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                          selected
                            ? 'bg-emerald-950 text-amber-300 border-emerald-950'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {selected ? `✓ ${amenity}` : `+ ${amenity}`}
                      </button>
                    );
                  })}
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
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditHouseRoom(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] modal-content-animate">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Check In Guest</h2>
                  <p className="text-xs text-stone-500 font-medium">Room {checkInRoom.roomNumber} &bull; {checkInRoom.roomType}</p>
                </div>
              </div>
              <button
                onClick={() => setCheckInRoom(null)}
                className="p-1.5 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-full active:scale-[0.92] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCheckInSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Guest Name & Honorific *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mr. Mwape Mulenga, Dr. Finch, Elena Rostova"
                  value={checkInGuestName}
                  onChange={(e) => setCheckInGuestName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Checkout Date & Time
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow, 10:30 AM or 28 Sep 2026, 11:00 AM"
                  value={checkInCheckoutDate}
                  onChange={(e) => setCheckInCheckoutDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 mb-2"
                />
                <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                  <span className="text-stone-400">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setCheckInCheckoutDate('Tomorrow, 10:30 AM')}
                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 rounded text-stone-700 font-medium"
                  >
                    Tomorrow 10:30 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckInCheckoutDate('In 2 Days, 10:30 AM')}
                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 rounded text-stone-700 font-medium"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckInCheckoutDate('In 3 Days, 11:00 AM')}
                    className="px-2 py-0.5 bg-stone-100 hover:bg-stone-200 rounded text-stone-700 font-medium"
                  >
                    In 3 Days
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Guest Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +260 97 123 4567"
                  value={checkInPhone}
                  onChange={(e) => setCheckInPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-900 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCheckInRoom(null)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Confirm Check-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE 85 × 120 MM QR CARD MODAL */}
      {qrPlaqueRoom && selectedPlaqueQR && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-modal border border-stone-900/[0.08] my-8 modal-content-animate">
            <div className="flex items-center justify-between mb-4 no-print">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Printable QR Card (85 &times; 120 mm)</h2>
                  <p className="text-[11px] text-stone-500">Single-page A6/plaque card &bull; 300 DPI print-ready</p>
                </div>
              </div>
              <button
                onClick={() => setQrPlaqueRoom(null)}
                className="p-1.5 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-full active:scale-[0.92] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Clean 85 × 120 mm Portrait Card */}
            <div
              id="printable-plaque-card"
              className="mx-auto bg-white text-stone-950 border border-stone-900 shadow-elevated relative overflow-hidden flex flex-col items-center justify-between text-center"
              style={{
                width: '320px',
                minHeight: '452px',
                padding: '0 24px 22px 24px',
              }}
            >
              {/* Thin top band in property primary color */}
              <div
                className="w-[calc(100%+48px)] -mx-6 h-2.5 shrink-0"
                style={{ backgroundColor: currentProperty?.primaryColor || '#1C2826' }}
              />

              {/* Top: ROCK APARTMENTS (small, letter-spaced) */}
              <div className="pt-5">
                <span className="text-[11px] font-bold tracking-[0.26em] uppercase text-stone-900 block">
                  {(currentProperty?.name || 'ROCK APARTMENTS').replace(/\s+LUSAKA$/i, '').toUpperCase()}
                </span>
              </div>

              {/* Centre: High-EC QR code with centered house name label */}
              <div className="my-2 flex items-center justify-center">
                <QRCodeView
                  value={selectedPlaqueQR.token}
                  size={216}
                  houseName={qrPlaqueRoom.roomNumber}
                  qrLabel={qrPlaqueRoom.qrLabel}
                  className="mx-auto"
                />
              </div>

              {/* Under QR: Big serif house name + 1-line instruction */}
              <div className="space-y-1.5">
                <h3 className="text-3xl font-serif font-bold text-stone-950 tracking-tight leading-none">
                  {qrPlaqueRoom.roomNumber}
                </h3>
                <p className="text-xs font-medium text-stone-700">
                  Scan for Wi-Fi, house guide &amp; requests
                </p>
              </div>

              {/* Bottom, small */}
              <div className="pt-3 border-t border-stone-200 w-full">
                <p className="text-[10px] text-stone-500 font-normal">
                  No app needed &middot; Works on any phone camera
                </p>
              </div>
            </div>

            {/* Regenerate QR Warning Confirmation */}
            {confirmRegenerateRoom?.id === qrPlaqueRoom.id && (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-2.5 no-print">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Invalidate current printed QR card?</p>
                    <p className="text-amber-800 mt-0.5">
                      Generating a new QR token for <strong>{qrPlaqueRoom.roomNumber}</strong> will immediately deactivate the old card. You will need to reprint and replace the card in the house.
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmRegenerateRoom(null)}
                    className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 font-semibold rounded-xl border border-stone-200"
                  >
                    Keep Current QR
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRegenerateQR}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                  >
                    Yes, Regenerate QR
                  </button>
                </div>
              </div>
            )}

            {/* Action Bar (Excluded from Print) */}
            <div className="mt-5 flex flex-col gap-3 pt-2 no-print">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleCopyToken(qrCanonicalUrl || selectedPlaqueQR.token)}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl active:scale-[0.96] transition-all flex items-center gap-1.5 select-none"
                  >
                    {copiedToken ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied Link!</span>
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
                      className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl active:scale-[0.96] transition-all flex items-center gap-1.5 select-none"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Test as Guest</span>
                    </button>
                  )}

                  {isManagerOrAdmin && (
                    <button
                      type="button"
                      onClick={() => setConfirmRegenerateRoom(qrPlaqueRoom)}
                      className="px-3 py-2 bg-stone-100 hover:bg-amber-50 hover:text-amber-900 text-stone-600 text-xs font-semibold rounded-xl active:scale-[0.96] transition-all flex items-center gap-1.5 select-none"
                      title="Generate a new token and invalidate the old card"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Regenerate QR</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isDownloadingPng}
                    onClick={() => handleDownloadSingleQRPng(qrPlaqueRoom, selectedPlaqueQR.token)}
                    className="px-3.5 py-2 bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold rounded-xl shadow-xs active:scale-[0.96] transition-all flex items-center gap-1.5 select-none disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isDownloadingPng ? 'Rendering...' : 'Download PNG'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-950 text-amber-300 hover:bg-emerald-900 text-xs font-bold rounded-xl shadow-diffused active:scale-[0.96] transition-all flex items-center gap-1.5 select-none"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Card</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: PUSH NOTIFICATIONS & QUIET HOURS SETTINGS */}
      {isNotifModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] modal-content-animate space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-stone-900">Request Alerts &amp; Quiet Hours</h2>
                  <p className="text-xs text-stone-500">Phone push notifications &amp; night shift controls</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {pushStatusMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-900">
                {pushStatusMessage}
              </div>
            )}

            {/* Toggle 1: Push Notifications On / Off */}
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
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <BellOff className="w-3.5 h-3.5" />
                  <span>Turn Off</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isEnablingPush}
                  onClick={handleEnablePushAlerts}
                  className="px-3.5 py-2 bg-emerald-900 hover:bg-emerald-800 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>{isEnablingPush ? 'Enabling...' : 'Turn On'}</span>
                </button>
              )}
            </div>

            {/* Quiet Hours Window */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-3">
              <div>
                <p className="text-sm font-bold text-stone-900">Quiet Hours (22:00 &ndash; 07:00)</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Non-urgent requests are silenced overnight unless you are marked on night duty. Urgent emergencies always ring through.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Quiet Start
                  </label>
                  <input
                    type="time"
                    value={userNotifSettings.quietHoursStart || '22:00'}
                    onChange={(e) => handleSaveNotifPreference({ quietHoursStart: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 uppercase mb-1">
                    Quiet End
                  </label>
                  <input
                    type="time"
                    value={userNotifSettings.quietHoursEnd || '07:00'}
                    onChange={(e) => handleSaveNotifPreference({ quietHoursEnd: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-200 rounded-xl"
                  />
                </div>
              </div>
            </div>

            {/* Night Duty Override Toggle */}
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-stone-900">On Duty Tonight</p>
                <p className="text-xs text-stone-500 mt-0.5">
                  Receive all guest requests overnight during quiet hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSaveNotifPreference({ onDutyNight: !userNotifSettings.onDutyNight })}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shrink-0 ${
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
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-semibold"
              >
                Send Test Alert
              </button>
              <button
                type="button"
                onClick={() => setIsNotifModalOpen(false)}
                className="px-5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD DINING ITEM (Tier 2) */}
      {isAddDiningOpen && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] modal-content-animate">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Add Dining Menu Item</h2>
              </div>
              <button
                onClick={() => setIsAddDiningOpen(false)}
                className="p-1.5 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-full active:scale-[0.92] transition-colors"
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
                  placeholder="e.g. Kariba Tigerfish Fillet, Victoria Mist Cocktail"
                  value={newDiningName}
                  onChange={(e) => setNewDiningName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
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
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
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
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Ingredients / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Freshly grilled with garlic herb butter and spiced village chips..."
                  value={newDiningDescription}
                  onChange={(e) => setNewDiningDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Dish / Menu Photo
                </label>
                
                {/* File Upload Button */}
                <div className="flex items-center gap-2 mb-2">
                  <label className="cursor-pointer px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-xl border border-stone-200 flex items-center gap-1.5 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-stone-600" />
                    <span>Upload Image or Photo</span>
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

                {/* Image Preview Thumbnail */}
                {newDiningImage && (
                  <div className="mb-2 relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 shadow-2xs">
                    <img src={newDiningImage} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Or Image URL */}
                <input
                  type="url"
                  placeholder="Or paste web image URL: https://..."
                  value={newDiningImage.startsWith('data:') ? '' : newDiningImage}
                  onChange={(e) => setNewDiningImage(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDiningOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-xl active:scale-[0.96] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-diffused active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
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
