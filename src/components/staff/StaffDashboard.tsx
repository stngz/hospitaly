import React, { useState, useSyncExternalStore } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService, subscribeToStore } from '../../lib/store';
import { notificationService } from '../../lib/notifications';
import { ServiceRequest, RequestStatus, Room, DiningItem, UserProfile, StaffDepartment } from '../../types';
import { QRCodeView } from '../common/QRCodeView';
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
  Upload
} from 'lucide-react';

interface StaffDashboardProps {
  onSwitchToGuest?: () => void;
  onSelectRoomForGuest?: (propertySlug: string, roomId: string) => void;
  onSwitchToAdmin?: () => void;
}

type DashboardTab = 'requests' | 'rooms' | 'menu' | 'team';

export const StaffDashboard: React.FC<StaffDashboardProps> = ({ 
  onSwitchToGuest,
  onSelectRoomForGuest,
  onSwitchToAdmin
}) => {
  const { user, signOut, availableStaff, signInAs } = useAuth();
  
  // Tier verification
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  // Primary tab state (auto fallback if staff tries to open manager tabs)
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('requests');

  // Requests filtering state
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Rooms filtering state
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [roomFilterStatus, setRoomFilterStatus] = useState<'all' | 'available' | 'occupied'>('all');

  // Modals state for Room Management
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomType, setNewRoomType] = useState('Deluxe River Suite');

  const [checkInRoom, setCheckInRoom] = useState<Room | null>(null);
  const [checkInGuestName, setCheckInGuestName] = useState('');
  const [checkInCheckoutDate, setCheckInCheckoutDate] = useState('');
  const [checkInPhone, setCheckInPhone] = useState('');

  const [qrPlaqueRoom, setQrPlaqueRoom] = useState<Room | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Modals & state for Menu & Pricing (Tier 2)
  const [isAddDiningOpen, setIsAddDiningOpen] = useState(false);
  const [diningCategoryFilter, setDiningCategoryFilter] = useState<string>('all');
  const [diningSearchQuery, setDiningSearchQuery] = useState('');
  const [newDiningName, setNewDiningName] = useState('');
  const [newDiningCategory, setNewDiningCategory] = useState<'breakfast' | 'lunch' | 'dinner' | 'drinks' | 'dessert'>('breakfast');
  const [newDiningDescription, setNewDiningDescription] = useState('');
  const [newDiningPrice, setNewDiningPrice] = useState<string>('150');
  const [newDiningImage, setNewDiningImage] = useState('');

  // Modals & state for Team & Staff (Tier 2)
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [newStaffDepartment, setNewStaffDepartment] = useState<StaffDepartment>('housekeeping');
  const [newStaffRole, setNewStaffRole] = useState<'staff' | 'manager'>('staff');
  const [newStaffPin, setNewStaffPin] = useState('1234');

  // PIN Fast Switcher Modal
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [revealedPins, setRevealedPins] = useState<Record<string, boolean>>({});

  const togglePinReveal = (staffId: string) => {
    setRevealedPins((prev) => ({
      ...prev,
      [staffId]: !prev[staffId],
    }));
  };

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

  const requests = user?.propertyId
    ? allRequests.filter((r) => r.propertyId === user.propertyId)
    : allRequests;

  const propertyRooms = user?.propertyId
    ? allRooms.filter((r) => r.propertyId === user.propertyId)
    : allRooms;

  const propertyDining = currentProperty?.id
    ? allDining.filter((d) => d.propertyId === currentProperty.id)
    : allDining;

  const propertyStaff = currentProperty?.id
    ? allUsers.filter((u) => u.propertyId === currentProperty.id)
    : allUsers;

  // Enforce tier guard: if staff tries to view manager tabs, fallback to requests
  const activeTab: DashboardTab = (!isManagerOrAdmin && (dashboardTab === 'menu' || dashboardTab === 'team'))
    ? 'requests'
    : dashboardTab;

  // Request actions
  const handleStatusUpdate = (requestId: string, newStatus: RequestStatus) => {
    if (!user) return;
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
    const propId = user?.propertyId || currentProperty?.id || 'prop_zambezi_01';
    dbService.addRoomWithQR(propId, newRoomNumber.trim(), newRoomType.trim());
    setNewRoomNumber('');
    setNewRoomType('Deluxe River Suite');
    setIsAddRoomOpen(false);
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

  // Staff actions
  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffEmail.trim() || !newStaffPin.trim()) return;
    const propId = currentProperty?.id || 'prop_zambezi_01';
    dbService.createStaffMember(propId, {
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      phone: newStaffPhone.trim(),
      department: newStaffDepartment,
      role: newStaffRole,
      pinCode: newStaffPin.trim(),
    });
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffPhone('');
    setNewStaffPin('1234');
    setIsAddStaffOpen(false);
  };

  const handleDeleteStaff = (userId: string, _name: string) => {
    if (user?.id === userId) {
      return;
    }
    dbService.deleteStaffMember(userId);
  };

  // Fast PIN Login Switcher
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);
    const cleanPin = pinInput.trim();
    if (!cleanPin) return;

    // Search for staff matching this PIN
    const match = allUsers.find((u) => u.pinCode === cleanPin);
    if (match) {
      signInAs(match);
      setIsPinModalOpen(false);
      setPinInput('');
    } else {
      setPinError('Invalid 4-digit PIN. Please try again or check the team list.');
    }
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

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const inProgressCount = requests.filter((r) => r.status === 'in_progress').length;
  const completedCount = requests.filter((r) => r.status === 'completed').length;
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;

  const occupiedRoomsCount = propertyRooms.filter((r) => r.status === 'occupied').length;
  const availableRoomsCount = propertyRooms.filter((r) => r.status === 'available').length;

  // Selected QR code for plaque modal
  const selectedPlaqueQR = qrPlaqueRoom
    ? allQRCodes.find((q) => q.roomId === qrPlaqueRoom.id)
    : null;

  const qrDataUrl = selectedPlaqueQR
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?token=${selectedPlaqueQR.token}`
    : '';

  const qrImageUrl = selectedPlaqueQR
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrDataUrl || selectedPlaqueQR.token)}`
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
                user?.role === 'admin' 
                  ? 'bg-purple-100 text-purple-900' 
                  : user?.role === 'manager'
                  ? 'bg-amber-100 text-amber-900 font-extrabold'
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                {user?.role === 'admin' ? 'Tier 1 • Founder Admin' : user?.role === 'manager' ? 'Tier 2 • General Manager' : 'Tier 3 • Staff Member'}
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
              {user?.pinCode && (
                <span className="text-[10px] font-mono text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-900/[0.06]">
                  PIN: {user.pinCode}
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Staff Switcher for interactive testing */}
          <div className="flex items-center gap-1 text-xs bg-stone-100/90 p-1.5 rounded-xl border border-stone-900/[0.07]">
            <span className="text-stone-500 font-medium px-1">Switch:</span>
            {availableStaff.map((staff) => (
              <button
                key={staff.id}
                onClick={() => signInAs(staff)}
                title={`Sign in as ${staff.name} (${staff.role} - PIN: ${staff.pinCode || '1234'})`}
                className={`px-2 py-1 rounded-lg text-xs font-semibold active:scale-[0.96] transition-[background-color,color,transform] duration-140 ${
                  user?.id === staff.id
                    ? 'bg-emerald-950 text-amber-300 shadow-2xs'
                    : 'text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200'
                }`}
              >
                {staff.name.split(' ')[0]} ({staff.role === 'manager' ? 'GM' : staff.department.slice(0, 5)})
              </button>
            ))}
          </div>

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

          <button
            onClick={() => setIsPinModalOpen(true)}
            className="px-2.5 py-1.5 bg-stone-200/80 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-semibold active:scale-[0.96] transition-[background-color,transform] duration-140 flex items-center gap-1 border border-stone-900/[0.06]"
            title="Fast PIN Sign-in"
          >
            <KeyRound className="w-3.5 h-3.5 text-stone-600" />
            <span>Enter PIN</span>
          </button>

          {onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="px-3 py-1.5 bg-amber-400 text-stone-950 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-amber-300 rounded-xl text-xs font-bold active:scale-[0.96] transition-[background-color,transform] duration-140 shadow-xs"
            >
              Tier 1 HQ
            </button>
          )}

          {onSwitchToGuest && (
            <button
              onClick={onSwitchToGuest}
              className="px-3 py-1.5 bg-stone-800 text-stone-100 rounded-xl text-xs font-semibold [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-900 active:scale-[0.96] transition-[background-color,transform] duration-140"
            >
              Guest View
            </button>
          )}

          <button
            onClick={() => dbService.resetDemoData()}
            title="Reset to fresh demo state"
            className="p-2 text-stone-500 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-800 rounded-xl [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 active:scale-[0.92] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Navigation Tab Bar - Tier 2 (Manager/Admin) sees 4 tabs, Tier 3 (Staff) sees 2 */}
        <div className="flex items-center justify-between gap-4 border-b border-stone-900/[0.08] pb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tab 1: Live Requests */}
            <button
              onClick={() => setDashboardTab('requests')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                activeTab === 'requests'
                  ? 'bg-brand-primary text-brand-secondary shadow-diffused'
                  : 'bg-white text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 border border-stone-900/[0.08]'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Live Requests</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'requests' ? 'bg-brand-secondary text-stone-950' : 'bg-stone-100 text-stone-600'
              }`}>
                {pendingCount + inProgressCount}
              </span>
            </button>

            {/* Tab 2: Rooms, Check-In & QR Codes */}
            <button
              onClick={() => setDashboardTab('rooms')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-160 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
                activeTab === 'rooms'
                  ? 'bg-brand-primary text-brand-secondary shadow-diffused'
                  : 'bg-white text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-900 border border-stone-900/[0.08]'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Rooms, Check-In & QR Codes</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                activeTab === 'rooms' ? 'bg-brand-secondary text-stone-950' : 'bg-stone-100 text-stone-600'
              }`}>
                {propertyRooms.length}
              </span>
            </button>

            {/* Tab 3: Menu & Pricing (Tier 2 GM & Admin only) */}
            {isManagerOrAdmin && (
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

            {/* Tab 4: Team & Staff (Tier 2 GM & Admin only) */}
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
          {activeTab === 'rooms' && (
            <button
              onClick={() => setIsAddRoomOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 text-brand-secondary rounded-xl text-xs font-semibold shadow-diffused active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Room</span>
            </button>
          )}

          {activeTab === 'menu' && isManagerOrAdmin && (
            <button
              onClick={() => setIsAddDiningOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 text-brand-secondary rounded-xl text-xs font-semibold shadow-diffused active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
            >
              <Plus className="w-4 h-4" />
              <span>Add Dining Item</span>
            </button>
          )}

          {activeTab === 'team' && isManagerOrAdmin && (
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-primary [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 text-brand-secondary rounded-xl text-xs font-semibold shadow-diffused active:scale-[0.96] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff Member</span>
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
                    key={req.id}
                    className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold px-2.5 py-0.5 bg-emerald-100 text-emerald-950 rounded-md">
                          Room {req.roomNumber}
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

                      {/* Staff Assignment Selector for Reception / Manager */}
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
                              const selectedMember = availableStaff.find((s) => s.id === staffUid);
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
                          {availableStaff
                            .filter((s) => !currentProperty || s.propertyId === currentProperty.id || s.role === 'admin')
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.role === 'manager' ? 'GM' : s.department.toUpperCase()})
                              </option>
                            ))}
                        </select>
                      </div>
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
                  const matchingQR = allQRCodes.find((q) => q.roomId === room.id);
                  const isOccupied = room.status === 'occupied';

                  return (
                    <div
                      key={room.id}
                      className="bg-white rounded-2xl border border-stone-200/90 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-serif font-bold text-stone-900">
                            Room {room.roomNumber}
                          </span>
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

                        <p className="text-xs text-stone-500 font-medium mb-3">
                          {room.roomType}
                        </p>

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
                            Token: {matchingQR?.token || 'Minting...'}
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
                                Edit
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
                              title="Delete Room"
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
                          <span>View Printable QR Plaque</span>
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

        {/* TAB 4: TEAM & STAFF (Tier 2 GM & Admin only) */}
        {activeTab === 'team' && isManagerOrAdmin && (
          <div className="space-y-6">
            <div className="bg-brand-primary text-stone-100 p-6 rounded-3xl shadow-sm border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-brand-secondary">
                  Staff Access Governance
                </span>
                <h2 className="text-xl font-serif font-bold text-white mt-1">
                  Team Members & 4-Digit Security PINs
                </h2>
                <p className="text-xs text-stone-300 mt-1 max-w-xl">
                  Receptionists, Housekeepers, Kitchen and Maintenance crew log in via fast 4-digit PINs without typing passwords on shared operational tablets.
                </p>
              </div>

              <button
                onClick={() => setIsAddStaffOpen(true)}
                className="px-4 py-2.5 bg-brand-secondary hover:opacity-90 text-stone-950 rounded-xl text-xs font-bold shadow-md transition-opacity flex items-center gap-1.5 shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Team Member</span>
              </button>
            </div>

            {/* Team & Staff High-Density Editorial Data Table */}
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-50 border-b border-stone-200 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                      <th className="py-3 px-4">Team Member</th>
                      <th className="py-3 px-4">Tier & Role</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Security PIN</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs">
                    {propertyStaff.map((staff) => {
                      const isCurrent = user?.id === staff.id;
                      const isGM = staff.role === 'manager';
                      const isRevealed = revealedPins[staff.id];
                      return (
                        <tr key={staff.id} className={`hover:bg-stone-50/70 transition-colors ${isCurrent ? 'bg-amber-50/30' : ''}`}>
                          <td className="py-3 px-4">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-stone-900">{staff.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] font-bold bg-brand-primary text-brand-secondary px-1.5 py-0.2 rounded font-mono">
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
                              isGM ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'
                            }`}>
                              {isGM ? 'Tier 2 • GM' : 'Tier 3 • Staff'}
                            </span>
                          </td>
                          <td className="py-3 px-4 capitalize font-medium text-stone-700">
                            {staff.department}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <div className="flex items-center gap-2">
                              <span className="bg-stone-100 px-2.5 py-1 rounded text-stone-800 tracking-widest font-mono">
                                {isRevealed ? (staff.pinCode || '1234') : '••••'}
                              </span>
                              <button
                                onClick={() => togglePinReveal(staff.id)}
                                title={isRevealed ? "Mask PIN" : "Reveal PIN"}
                                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => signInAs(staff)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                                  isCurrent
                                    ? 'bg-brand-primary text-brand-secondary'
                                    : 'bg-stone-100 hover:bg-stone-200 text-stone-800'
                                }`}
                              >
                                {isCurrent ? 'Active User' : 'Switch'}
                              </button>
                              {!isCurrent && (
                                <button
                                  onClick={() => handleDeleteStaff(staff.id, staff.name)}
                                  title="Remove staff member"
                                  className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
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

      {/* MODAL 1: ADD NEW ROOM */}
      {isAddRoomOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] modal-content-animate">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <Plus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Add New Room / Suite</h2>
              </div>
              <button
                onClick={() => setIsAddRoomOpen(false)}
                className="p-1.5 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-full active:scale-[0.92] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Room Number or Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 105, 304, Chalet 08, Villa 3"
                  value={newRoomNumber}
                  onChange={(e) => setNewRoomNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Room Type / Category
                </label>
                <select
                  value={newRoomType}
                  onChange={(e) => setNewRoomType(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                >
                  <option value="Deluxe River Suite">Deluxe River Suite</option>
                  <option value="Executive Gorge Chalet">Executive Gorge Chalet</option>
                  <option value="Presidential Safari Villa">Presidential Safari Villa</option>
                  <option value="Luxury Safari Tent">Luxury Safari Tent</option>
                  <option value="Lagoon View Suite">Lagoon View Suite</option>
                  <option value="Garden Studio Apartment">Garden Studio Apartment</option>
                </select>
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
                  Create Room & Generate QR
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

      {/* MODAL 3: PRINTABLE QR PLAQUE MODAL */}
      {qrPlaqueRoom && selectedPlaqueQR && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-modal border border-stone-900/[0.08] my-8 modal-content-animate">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <QrCode className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Printable In-Room QR Plaque</h2>
              </div>
              <button
                onClick={() => setQrPlaqueRoom(null)}
                className="p-1.5 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-full active:scale-[0.92] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Plaque visual preview */}
            <div 
              id="printable-plaque-card"
              className="bg-radial from-[#1E4331] to-[#122A1E] text-stone-100 rounded-3xl p-6 text-center shadow-elevated border-4 border-[#C29B38]/60 relative overflow-hidden"
            >
              <div className="mb-3">
                <span className="text-[10px] font-bold tracking-widest uppercase text-amber-300/90 block">
                  {currentProperty.name}
                </span>
                <span className="text-[11px] font-light text-stone-300 block">
                  {currentProperty.city}, {currentProperty.country}
                </span>
              </div>

              <div className="my-3 inline-block p-3 bg-white rounded-2xl shadow-xl border-2 border-amber-300/30">
                <QRCodeView
                  value={qrDataUrl || selectedPlaqueQR.token}
                  size={192}
                  className="mx-auto"
                />
              </div>

              <div className="mt-2">
                <span className="text-[11px] font-bold tracking-widest uppercase text-amber-300 block">
                  ROOM NUMBER
                </span>
                <h3 className="text-2xl font-serif font-black text-white tracking-wide mt-0.5">
                  {qrPlaqueRoom.roomNumber}
                </h3>
                <p className="text-xs text-amber-100/80 font-medium">
                  {qrPlaqueRoom.roomType}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/15 text-[10px] text-stone-300 space-y-1">
                <p className="font-semibold text-white tracking-wider uppercase">
                  Point Camera to Order Dining & Concierge
                </p>
                <p className="font-mono text-amber-300/90">
                  TOKEN: {selectedPlaqueQR.token}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyToken(selectedPlaqueQR.token)}
                  className="px-3 py-2 bg-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl active:scale-[0.96] transition-[background-color,transform] duration-140 flex items-center gap-1.5 select-none"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Token</span>
                    </>
                  )}
                </button>

                {onSelectRoomForGuest && (
                  <button
                    onClick={() => {
                      onSelectRoomForGuest(currentProperty.slug, qrPlaqueRoom.id);
                      setQrPlaqueRoom(null);
                    }}
                    className="px-3 py-2 bg-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl active:scale-[0.96] transition-[background-color,transform] duration-140 flex items-center gap-1.5 select-none"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Test as Guest</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQrPlaqueRoom(null)}
                  className="px-3.5 py-2 text-xs font-bold text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-xl active:scale-[0.96] transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-950 text-amber-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-900 text-xs font-bold rounded-xl shadow-diffused active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 select-none"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print QR Card</span>
                </button>
              </div>
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

      {/* MODAL 5: ADD STAFF MEMBER (Tier 2) */}
      {isAddStaffOpen && isManagerOrAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-modal border border-stone-900/[0.08] modal-content-animate">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-300 flex items-center justify-center shadow-2xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Add Staff Member</h2>
              </div>
              <button
                onClick={() => setIsAddStaffOpen(false)}
                className="p-1.5 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-700 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-full active:scale-[0.92] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gift Mwape"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Department *
                  </label>
                  <select
                    value={newStaffDepartment}
                    onChange={(e) => setNewStaffDepartment(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                  >
                    <option value="housekeeping">Housekeeping</option>
                    <option value="reception">Reception</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="restaurant">Restaurant / Kitchen</option>
                    <option value="concierge">Concierge</option>
                    <option value="management">Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                    Role Tier *
                  </label>
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 bg-white"
                  >
                    <option value="staff">Tier 3 (Staff)</option>
                    <option value="manager">Tier 2 (Manager)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  4-Digit Access PIN *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 5566"
                  value={newStaffPin}
                  onChange={(e) => setNewStaffPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 font-mono tracking-widest font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. gift@zambeziheights.zm"
                  value={newStaffEmail}
                  onChange={(e) => setNewStaffEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wide mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+260 97 000 0000"
                  value={newStaffPhone}
                  onChange={(e) => setNewStaffPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-900/[0.1] focus:outline-none focus:ring-2 focus:ring-emerald-900 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-xl active:scale-[0.96] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-900 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-diffused active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
                >
                  Register Staff Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: FAST 4-DIGIT PIN SIGN-IN */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 modal-backdrop-animate">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-modal border border-stone-900/[0.08] text-center modal-content-animate">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 text-amber-300 mx-auto flex items-center justify-center mb-3 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-stone-900">Fast Staff PIN Sign-In</h3>
            <p className="text-xs text-stone-500 mt-1 mb-4 leading-relaxed">
              Enter your assigned 4-digit security PIN to switch active operational profile.
            </p>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              <input
                type="password"
                maxLength={6}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-36 mx-auto text-center tracking-[0.4em] font-mono text-2xl font-bold py-2 border-b-2 border-emerald-950 focus:outline-none focus:border-amber-500"
              />

              {pinError && (
                <p className="text-xs text-rose-600 font-medium">
                  {pinError}
                </p>
              )}

              {/* Quick sample buttons for rapid reviewer testing */}
              <div className="pt-2 text-[11px] text-stone-400">
                <span>Quick Test PINs:</span>
                <div className="flex items-center justify-center gap-2 mt-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setPinInput('1234'); }}
                    className="px-2 py-0.5 bg-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 rounded font-mono text-stone-800 font-bold active:scale-[0.94] transition-all border border-stone-900/[0.05]"
                  >
                    1234 (GM)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPinInput('2222'); }}
                    className="px-2 py-0.5 bg-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 rounded font-mono text-stone-800 font-bold active:scale-[0.94] transition-all border border-stone-900/[0.05]"
                  >
                    2222 (Housekeeping)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPinInput('7777'); }}
                    className="px-2 py-0.5 bg-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-200 rounded font-mono text-stone-800 font-bold active:scale-[0.94] transition-all border border-stone-900/[0.05]"
                  >
                    7777 (Founder)
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => { setIsPinModalOpen(false); setPinError(null); }}
                  className="px-4 py-2 text-xs font-bold text-stone-600 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 rounded-xl active:scale-[0.96] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-950 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-900 text-amber-300 text-xs font-bold rounded-xl shadow-diffused active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
                >
                  Unlock Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
