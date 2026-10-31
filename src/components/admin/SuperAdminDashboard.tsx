import React, { useState, useSyncExternalStore } from 'react';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { dbService, subscribeToStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Property, StaffDepartment, UserProfile, Lead } from '../../types';
import { APP_NAME } from '../../lib/config';
import { Logo } from '../brand/Logo';
import {
  Building2,
  Plus,
  CheckCircle2,
  Lock,
  Unlock,
  Users,
  BedDouble,
  Clock,
  Mail,
  X,
  ArrowRight,
  AlertCircle,
  LogOut,
  UserPlus,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  MoreHorizontal,
  Settings,
  Camera,
  History,
  FileText,
  Sparkles,
  Phone,
} from 'lucide-react';
import { compressImageFileToJpeg } from '../../lib/imageCompression';
import { formatPropertyDate } from '../../lib/time';

interface SuperAdminDashboardProps {
  onManageProperty: (property: Property) => void;
  onSwitchToStaff?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onManageProperty,
  onSwitchToStaff,
}) => {
  const {
    user,
    signOut,
    provisionAccount,
    setAccountActive,
    updateAccountAssignment,
    sendPasswordReset,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'properties' | 'accounts' | 'activity' | 'leads'>('properties');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');
  const [suspendConfirmProperty, setSuspendConfirmProperty] = useState<Property | null>(null);
  const [customSuspendMessage, setCustomSuspendMessage] = useState('');
  const [resumeConfirmProperty, setResumeConfirmProperty] = useState<Property | null>(null);

  // Property Settings Modal state
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editPropName, setEditPropName] = useState('');
  const [editPropCity, setEditPropCity] = useState('');
  const [editPropPhone, setEditPropPhone] = useState('');
  const [editPropWhatsapp, setEditPropWhatsapp] = useState('');
  const [editPropTimezone, setEditPropTimezone] = useState('Africa/Lusaka');
  const [editPropCheckIn, setEditPropCheckIn] = useState('14:00');
  const [editPropCheckOut, setEditPropCheckOut] = useState('11:00');
  const [editPropWifiName, setEditPropWifiName] = useState('');
  const [editPropWifiPassword, setEditPropWifiPassword] = useState('');
  const [editPropCoverImg, setEditPropCoverImg] = useState<string | null>(null);
  const [isUploadingPropCover, setIsUploadingPropCover] = useState(false);
  const [propSettingsSaving, setPropSettingsSaving] = useState(false);

  // Account Administration filter & feedback state
  const [accountPropertyFilter, setAccountPropertyFilter] = useState<string>('all');
  const [showDeactivated, setShowDeactivated] = useState<boolean>(false);
  const [accountActionMessage, setAccountActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Provision new account form state
  const [acctName, setAcctName] = useState('');
  const [acctEmail, setAcctEmail] = useState('');
  const [acctPhone, setAcctPhone] = useState('');
  const [acctRole, setAcctRole] = useState<'manager' | 'staff'>('staff');
  const [acctDept, setAcctDept] = useState<StaffDepartment>('housekeeping');
  const [acctPropertyId, setAcctPropertyId] = useState('prop_rocks_lusaka');
  const [acctTempPassword, setAcctTempPassword] = useState('');
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  // New property form state
  const [propertyName, setPropertyName] = useState('');
  const [city, setCity] = useState('Lusaka');
  const [propertyType, setPropertyType] = useState('Serviced Apartment');
  const [currency, setCurrency] = useState('ZMW');
  const [primaryColor, setPrimaryColor] = useState('#1E3A5F');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPhone, setManagerPhone] = useState('+260 97 ');
  const [onboardError, setOnboardError] = useState<string | null>(null);

  // Reactive store subscriptions
  const properties = useSyncExternalStore(
    subscribeToStore,
    dbService.getProperties,
    dbService.getProperties
  );

  const rooms = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRooms,
    dbService.getAllRooms
  );

  const requests = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllRequests,
    dbService.getAllRequests
  );

  const users = useSyncExternalStore(
    subscribeToStore,
    dbService.getAllUsers,
    dbService.getAllUsers
  );

  const activityLogs = useSyncExternalStore(
    subscribeToStore,
    () => dbService.getActivityLog(),
    () => dbService.getActivityLog()
  );

  const leads = useSyncExternalStore(
    subscribeToStore,
    dbService.getLeads,
    dbService.getLeads
  );

  const newLeadsCount = leads.filter((l) => l.status === 'new').length;

  if (!user || user.role !== 'founder') {
    return null;
  }

  const filteredProperties = properties.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchCity = (p.city || '').toLowerCase().includes(q);
      if (!matchName && !matchCity) return false;
    }
    return true;
  });

  // Deduplicate accounts by lowercase email and hide deactivated unless toggled
  const seenEmails = new Set<string>();
  const filteredUsers = users.filter((u) => {
    const emailLower = (u.email || '').toLowerCase();
    if (emailLower === 'founder.test@example.com') return false;
    if (u.id === 'user_manager_rocks' && u.active === false) return false;
    if (!showDeactivated && u.active === false) return false;
    if (accountPropertyFilter !== 'all' && u.propertyId !== accountPropertyFilter) {
      return false;
    }
    if (emailLower) {
      if (seenEmails.has(emailLower)) return false;
      seenEmails.add(emailLower);
    }
    return true;
  });

  const deactivatedUsersCount = users.filter(
    (u) =>
      u.active === false &&
      (u.email || '').toLowerCase() !== 'founder.test@example.com' &&
      u.id !== 'user_manager_rocks'
  ).length;

  const activeCount = properties.filter((p) => p.status === 'active').length;
  const suspendedCount = properties.filter((p) => p.status === 'suspended').length;
  const totalPendingRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress'
  ).length;

  const handleToggleStatus = (prop: Property) => {
    if (prop.status === 'active') {
      setCustomSuspendMessage('');
      setSuspendConfirmProperty(prop);
    } else {
      setResumeConfirmProperty(prop);
    }
  };

  const confirmSuspendProperty = () => {
    if (!suspendConfirmProperty) return;
    dbService.togglePropertyStatus(
      suspendConfirmProperty.id,
      user.email,
      customSuspendMessage.trim() || undefined
    );
    setAccountActionMessage({
      type: 'success',
      text: `${suspendConfirmProperty.name} is now suspended. Guest QR pages are paused.`,
    });
    setSuspendConfirmProperty(null);
  };

  const confirmResumeProperty = () => {
    if (!resumeConfirmProperty) return;
    dbService.togglePropertyStatus(resumeConfirmProperty.id, user.email);
    setAccountActionMessage({
      type: 'success',
      text: `${resumeConfirmProperty.name} has been resumed. Guest QR access is active.`,
    });
    setResumeConfirmProperty(null);
  };

  const openEditPropertyModal = (prop: Property) => {
    setEditingProperty(prop);
    setEditPropName(prop.name);
    setEditPropCity(prop.city);
    setEditPropPhone(prop.contactPhone || '');
    setEditPropWhatsapp(prop.whatsappPhone || '');
    setEditPropTimezone(prop.timezone || 'Africa/Lusaka');
    setEditPropCheckIn(prop.checkInTime || '14:00');
    setEditPropCheckOut(prop.checkOutTime || '11:00');
    setEditPropWifiName(prop.wifiName || '');
    setEditPropWifiPassword(prop.wifiPassword || '');
    setEditPropCoverImg(prop.coverImageUrl || null);
  };

  const handleSavePropertySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty) return;
    setPropSettingsSaving(true);
    try {
      dbService.updatePropertySettings(
        editingProperty.id,
        {
          name: editPropName.trim() || editingProperty.name,
          city: editPropCity.trim() || editingProperty.city,
          contactPhone: editPropPhone.trim() || undefined,
          whatsappPhone: editPropWhatsapp.trim() || undefined,
          timezone: editPropTimezone.trim() || 'Africa/Lusaka',
          checkInTime: editPropCheckIn.trim() || '14:00',
          checkOutTime: editPropCheckOut.trim() || '11:00',
          wifiName: editPropWifiName.trim() || undefined,
          wifiPassword: editPropWifiPassword.trim() || undefined,
          coverImageUrl: editPropCoverImg || undefined,
        },
        { name: user.name || 'Founder', email: user.email }
      );
      setAccountActionMessage({
        type: 'success',
        text: `Updated settings for ${editingProperty.name}.`,
      });
      setEditingProperty(null);
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Failed to update property settings.',
      });
    } finally {
      setPropSettingsSaving(false);
    }
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingProperty) return;
    setIsUploadingPropCover(true);
    try {
      const compressed = await compressImageFileToJpeg(file);
      const mediaItem = await dbService.saveMedia({
        ownerType: 'property',
        ownerId: editingProperty.id,
        propertyId: editingProperty.id,
        dataUrl: compressed.dataUrl,
        width: compressed.width,
        height: compressed.height,
        uploadedBy: user.email,
      });
      setEditPropCoverImg(compressed.dataUrl);
      dbService.updatePropertySettings(
        editingProperty.id,
        { coverImageId: mediaItem.id, coverImageUrl: compressed.dataUrl },
        { name: user.name || 'Founder', email: user.email }
      );
      setAccountActionMessage({
        type: 'success',
        text: 'Cover photo compressed and uploaded successfully.',
      });
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Failed to upload cover photo.',
      });
    } finally {
      setIsUploadingPropCover(false);
    }
  };

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyName.trim() || !city.trim() || !managerName.trim() || !managerEmail.trim()) {
      setOnboardError('Please fill in all required fields.');
      return;
    }
    setOnboardError(null);

    const { property } = dbService.createPropertyWithManager(
      {
        name: propertyName.trim(),
        city: city.trim(),
        currency,
        primaryColor,
        propertyType,
        wifiName: wifiName.trim() || `${propertyName.trim().split(' ')[0]}_Guest`,
        wifiPassword: wifiPassword.trim() || 'Welcome2026!',
      },
      {
        name: managerName.trim(),
        email: managerEmail.trim(),
        phone: managerPhone.trim(),
      }
    );

    setPropertyName('');
    setWifiName('');
    setWifiPassword('');
    setManagerName('');
    setManagerEmail('');
    setManagerPhone('+260 97 ');
    setIsOnboardModalOpen(false);
    onManageProperty(property);
  };

  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';
    let pass = 'Hosp!';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAcctTempPassword(pass);
    setShowTempPassword(true);
  };

  const handleProvisionAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setAccountActionMessage(null);

    if (!acctName.trim() || !acctEmail.trim() || !acctTempPassword.trim()) {
      setProvisionError('Name, email, and initial password are required.');
      return;
    }
    if (acctTempPassword.trim().length < 6) {
      setProvisionError('Initial password must be at least 6 characters.');
      return;
    }

    setIsProvisioning(true);
    try {
      const res = await provisionAccount({
        name: acctName.trim(),
        email: acctEmail.trim(),
        tempPassword: acctTempPassword.trim(),
        role: acctRole,
        propertyId: acctPropertyId,
        department: acctRole === 'staff' ? acctDept : 'reception',
        phone: acctPhone.trim() || undefined,
      });

      setAccountActionMessage({
        type: 'success',
        text: `Provisioned ${acctRole.toUpperCase()} account for ${acctEmail.trim()} (${res.authCreated ? 'Firebase Auth active' : 'local profile'}).`,
      });

      setAcctName('');
      setAcctEmail('');
      setAcctPhone('');
      setAcctTempPassword('');
      setIsProvisionModalOpen(false);
      setActiveTab('accounts');
    } catch (err: any) {
      setProvisionError(err?.message || 'Failed to provision account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleToggleAccountActive = async (targetUser: UserProfile) => {
    if (targetUser.role === 'founder') return;
    const nextState = targetUser.active === false ? true : false;
    try {
      await setAccountActive(targetUser.id, nextState);
      setAccountActionMessage({
        type: 'success',
        text: `${targetUser.email} is now ${nextState ? 'Active' : 'Deactivated'}.`,
      });
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Failed to update account status.',
      });
    }
  };

  const handleSendResetEmail = async (email: string) => {
    try {
      await sendPasswordReset(email);
      setAccountActionMessage({
        type: 'success',
        text: `Password reset email dispatched to ${email}.`,
      });
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Could not send password reset email.',
      });
    }
  };

  const formatRoleBadge = (acct: UserProfile) => {
    if (acct.role === 'founder') return 'Founder Admin';
    if (acct.role === 'manager') return 'General Manager';
    const deptLabel = acct.department
      ? acct.department.charAt(0).toUpperCase() + acct.department.slice(1)
      : 'Reception';
    return `Staff · ${deptLabel}`;
  };

  return (
    <div className="min-h-screen bg-[#0E1A2B] text-[#FAF7F0] font-sans overflow-x-hidden">
      {/* Compact 56px Top Navigation Bar */}
      <header className="md:sticky md:top-0 z-30 h-14 bg-[#13233A]/95 backdrop-blur-md border-b border-[#1C2F4A] px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo variant="full" size="sm" tone="onDark" />
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#C9A55C]/15 text-[#C9A55C] border border-[#C9A55C]/30 font-medium">
            HQ
          </span>
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2.5">
          {onSwitchToStaff && (
            <button
              onClick={onSwitchToStaff}
              className="text-xs px-3 py-2 rounded-lg border border-stone-700 text-stone-300 hover:text-white hover:border-stone-500 transition-colors cursor-pointer"
            >
              Property Desk →
            </button>
          )}
          <button
            onClick={() => {
              handleGeneratePassword();
              setIsProvisionModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700 font-medium text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            Create Account
          </button>
          <button
            onClick={() => setIsOnboardModalOpen(true)}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Onboard Property
          </button>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-stone-800 text-stone-400 hover:text-red-400 hover:border-red-900/50 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Mobile ⋯ menu button */}
        <div className="relative md:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Open HQ actions menu"
            className="w-9 h-9 rounded-lg border border-stone-800 bg-stone-900 flex items-center justify-center text-stone-200 hover:text-white cursor-pointer"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {isMobileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 rounded-xl bg-stone-900 border border-stone-700 shadow-2xl py-1.5 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handleGeneratePassword();
                    setIsProvisionModalOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-stone-200 hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-amber-400" />
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsOnboardModalOpen(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-stone-200 hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Onboard property
                </button>
                {onSwitchToStaff && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onSwitchToStaff();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs text-stone-200 hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-stone-400" />
                    Property desk
                  </button>
                )}
                <div className="my-1 border-t border-stone-800" />
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signOut();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-stone-800 flex items-center gap-2.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* Compact Platform KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Properties</span>
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-serif text-white">{properties.length}</div>
            <div className="text-xs text-emerald-400 mt-0.5">
              {activeCount} active · {suspendedCount} paused
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Houses</span>
              <BedDouble className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-serif text-white">{rooms.length}</div>
            <div className="text-xs text-stone-400 mt-0.5">
              {rooms.filter((r) => r.status === 'occupied').length} occupied
            </div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Active Queue</span>
              <Clock className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-serif text-white">{totalPendingRequests}</div>
            <div className="text-xs text-stone-400 mt-0.5">{requests.length} total requests</div>
          </div>

          <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5">
            <div className="flex items-center justify-between text-stone-400 text-xs mb-1">
              <span>Accounts</span>
              <Users className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-serif text-white">
              {users.filter((u) => u.active !== false && (u.email || '').toLowerCase() !== 'founder.test@example.com').length}
            </div>
            <div className="text-xs text-stone-400 mt-0.5">
              {users.filter((u) => u.role === 'manager' && u.active !== false).length} GM ·{' '}
              {users.filter((u) => u.role === 'staff' && u.active !== false).length} staff
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('properties')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'properties'
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Properties ({properties.length})
          </button>
          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'accounts'
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Account Administration ({filteredUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Activity Log ({activityLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'leads'
                ? 'bg-amber-500 text-stone-950 font-semibold'
                : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Leads ({leads.length})</span>
            {newLeadsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold text-[10px]">
                {newLeadsCount}
              </span>
            )}
          </button>
        </div>

        {accountActionMessage && (
          <div
            className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border text-xs ${
              accountActionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="break-words">{accountActionMessage.text}</span>
            </div>
            <button
              onClick={() => setAccountActionMessage(null)}
              className="text-stone-400 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {activeTab === 'properties' ? (
          <ErrorBoundary sectionName="HQ properties">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 border border-stone-800 rounded-xl p-3.5">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {(['all', 'active', 'suspended'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                      filterStatus === status
                        ? 'bg-amber-500 text-stone-950 font-semibold'
                        : 'bg-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search property or city..."
                className="bg-stone-950 border border-stone-800 rounded-lg px-3.5 py-2 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-amber-500 w-full sm:w-64"
              />
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {filteredProperties.map((prop) => {
                const propRooms = rooms.filter((r) => r.propertyId === prop.id);
                const propRequests = requests.filter((r) => r.propertyId === prop.id);
                const activeManagers = users.filter(
                  (u) => u.propertyId === prop.id && u.role === 'manager' && u.active !== false
                );
                const primaryManager =
                  activeManagers.find((m) => (m.email || '').toLowerCase() === 'manager.pilot@rocks.co.zm') ||
                  activeManagers[0];
                const isActive = prop.status === 'active';

                return (
                  <div
                    key={prop.id}
                    className={`bg-stone-900 border rounded-2xl overflow-hidden flex flex-col justify-between transition-all ${
                      isActive ? 'border-stone-800' : 'border-red-900/50 opacity-85'
                    }`}
                  >
                    <div>
                      <div
                        className="h-32 bg-cover bg-center relative overflow-hidden"
                        style={{
                          background: prop.coverImageUrl
                            ? `url(${prop.coverImageUrl}) center/cover no-repeat`
                            : 'linear-gradient(165deg, #1C241E 0%, #263329 55%, #162019 100%)',
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/40 to-transparent" />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-stone-950/80 text-stone-200 border border-stone-700">
                            {prop.unitLabel === 'House' ? 'Serviced Apartments' : 'Hotel'}
                          </span>
                        </div>
                        <div className="absolute top-3 right-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-red-500/20 text-red-300 border border-red-500/40'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isActive ? 'bg-emerald-400' : 'bg-red-400'
                              }`}
                            />
                            {isActive ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-4 right-4">
                          <h2 className="font-serif text-xl text-white leading-tight truncate">
                            {prop.name}
                          </h2>
                          <p className="text-xs text-stone-300">
                            {prop.city}, {prop.country} · {prop.currency}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-2.5 text-center bg-stone-950/60 rounded-xl p-2.5 border border-stone-800/80">
                          <div>
                            <div className="text-base font-serif text-white">{propRooms.length}</div>
                            <div className="text-xs text-stone-400">Houses</div>
                          </div>
                          <div>
                            <div className="text-base font-serif text-white">
                              {propRequests.length}
                            </div>
                            <div className="text-xs text-stone-400">Requests</div>
                          </div>
                        </div>

                        {prop.status === 'suspended' && (prop.suspendedBy || prop.suspendedAt) && (
                          <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-3 py-2 text-xs text-red-300">
                            Suspended{prop.suspendedBy ? ` by ${prop.suspendedBy}` : ''}
                            {prop.suspendedAt
                              ? ` · ${new Date(prop.suspendedAt).toLocaleString('en-GB', {
                                  day: 'numeric',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}`
                              : ''}
                          </div>
                        )}

                        <div className="text-xs text-stone-400 space-y-1.5 pt-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="shrink-0">General Manager:</span>
                            <span className="text-stone-200 font-medium truncate">
                              {primaryManager ? primaryManager.name : 'Unassigned'}
                            </span>
                          </div>
                          {primaryManager && (
                            <div className="flex items-center justify-between gap-2">
                              <span className="shrink-0">GM Email:</span>
                              <span className="text-stone-300 truncate">{primaryManager.email}</span>
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <span className="shrink-0">Guest Wi-Fi:</span>
                            <span className="text-amber-400 truncate">
                              {prop.wifiName || 'Not set'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0 flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => onManageProperty(prop)}
                        className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-medium py-2.5 px-3 rounded-xl transition-colors cursor-pointer"
                      >
                        Manage Property
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditPropertyModal(prop)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:text-white hover:border-stone-500 text-xs font-medium transition-colors cursor-pointer"
                        title="Edit Property Settings"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Settings
                      </button>
                      <button
                        onClick={() => handleToggleStatus(prop)}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'border-stone-700 text-stone-300 hover:text-red-400 hover:border-red-800'
                            : 'border-emerald-700/50 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            Reactivate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </ErrorBoundary>
        ) : activeTab === 'accounts' ? (
          /* Account Administration Tab */
          <ErrorBoundary sectionName="HQ accounts">
            <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 border border-stone-800 rounded-xl p-4">
              <div>
                <h2 className="font-serif text-lg text-white">Staff & Manager Accounts</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Create accounts, assign properties and roles, or reset access.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <select
                  value={accountPropertyFilter}
                  onChange={(e) => setAccountPropertyFilter(e.target.value)}
                  className="bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 w-full sm:w-auto"
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {deactivatedUsersCount > 0 && (
                  <label className="inline-flex items-center gap-2 text-xs text-stone-300 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showDeactivated}
                      onChange={(e) => setShowDeactivated(e.target.checked)}
                      className="rounded border-stone-700 text-amber-500 focus:ring-amber-500"
                    />
                    Show deactivated ({deactivatedUsersCount})
                  </label>
                )}
                <button
                  onClick={() => {
                    handleGeneratePassword();
                    setIsProvisionModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs px-3.5 py-2.5 rounded-lg transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Provision Account
                </button>
              </div>
            </div>

            {/* Mobile Stacked Cards (< 768px) — zero horizontal scroll */}
            <div className="md:hidden space-y-3">
              {filteredUsers.map((acct) => {
                const isActive = acct.active !== false;
                return (
                  <div
                    key={acct.id}
                    className={`bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 ${
                      !isActive ? 'opacity-65' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-white truncate">{acct.name}</div>
                        <div className="text-xs text-stone-400 break-all mt-0.5">{acct.email}</div>
                        {acct.phone && (
                          <div className="text-xs text-stone-400 mt-0.5 whitespace-nowrap">
                            {acct.phone}
                          </div>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-500/15 text-red-300 border border-red-500/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        {isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-stone-800/80 grid grid-cols-1 gap-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-stone-400">Role:</span>
                        <span className="font-medium text-amber-300">{formatRoleBadge(acct)}</span>
                      </div>

                      {acct.role !== 'founder' && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-stone-400 mb-1">Change Role</label>
                              <select
                                value={acct.role}
                                onChange={(e) =>
                                  updateAccountAssignment(acct.id, {
                                    propertyId: acct.propertyId || 'prop_rocks_lusaka',
                                    role: e.target.value as 'manager' | 'staff',
                                    department: acct.department || 'reception',
                                  })
                                }
                                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                              >
                                <option value="manager">General Manager</option>
                                <option value="staff">Staff</option>
                              </select>
                            </div>
                            {acct.role === 'staff' ? (
                              <div>
                                <label className="block text-xs text-stone-400 mb-1">
                                  Department
                                </label>
                                <select
                                  value={acct.department || 'reception'}
                                  onChange={(e) =>
                                    updateAccountAssignment(acct.id, {
                                      propertyId: acct.propertyId || 'prop_rocks_lusaka',
                                      role: 'staff',
                                      department: e.target.value as StaffDepartment,
                                    })
                                  }
                                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                                >
                                  <option value="reception">Reception</option>
                                  <option value="housekeeping">Housekeeping</option>
                                  <option value="maintenance">Maintenance</option>
                                  <option value="concierge">Concierge</option>
                                </select>
                              </div>
                            ) : (
                              <div>
                                <label className="block text-xs text-stone-400 mb-1">Property</label>
                                <select
                                  value={acct.propertyId || ''}
                                  onChange={(e) =>
                                    updateAccountAssignment(acct.id, {
                                      propertyId: e.target.value,
                                      role: acct.role as 'manager' | 'staff',
                                      department: acct.department || 'reception',
                                    })
                                  }
                                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                                >
                                  {properties.map((p) => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>

                          {acct.role === 'staff' && (
                            <div>
                              <label className="block text-xs text-stone-400 mb-1">
                                Assigned Property
                              </label>
                              <select
                                value={acct.propertyId || ''}
                                onChange={(e) =>
                                  updateAccountAssignment(acct.id, {
                                    propertyId: e.target.value,
                                    role: 'staff',
                                    department: acct.department || 'reception',
                                  })
                                }
                                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                              >
                                {properties.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleSendResetEmail(acct.email)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-stone-700 text-xs text-stone-200 hover:text-white hover:border-stone-500 transition-colors cursor-pointer"
                      >
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        Reset Access
                      </button>
                      {acct.role !== 'founder' && (
                        <button
                          onClick={() => handleToggleAccountActive(acct)}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                            isActive
                              ? 'border-red-900/50 text-red-400 hover:bg-red-500/10'
                              : 'border-emerald-800 text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-800 text-xs uppercase tracking-wider text-stone-400 bg-stone-950/60">
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Role & Department</th>
                      <th className="py-3.5 px-4">Assigned Property</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/70 text-sm">
                    {filteredUsers.map((acct) => {
                      const isActive = acct.active !== false;

                      return (
                        <tr
                          key={acct.id}
                          className={`hover:bg-stone-800/40 transition-colors ${
                            !isActive ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4">
                            <div className="font-medium text-white">{acct.name}</div>
                            <div className="text-xs text-stone-400">{acct.email}</div>
                            {acct.phone && (
                              <div className="text-xs text-stone-400 mt-0.5 whitespace-nowrap">
                                {acct.phone}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {acct.role === 'founder' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                Founder Admin
                              </span>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  value={acct.role}
                                  onChange={(e) =>
                                    updateAccountAssignment(acct.id, {
                                      propertyId: acct.propertyId || 'prop_rocks_lusaka',
                                      role: e.target.value as 'manager' | 'staff',
                                      department: acct.department || 'reception',
                                    })
                                  }
                                  className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                                >
                                  <option value="manager">General Manager</option>
                                  <option value="staff">Staff</option>
                                </select>
                                {acct.role === 'staff' && (
                                  <select
                                    value={acct.department || 'reception'}
                                    onChange={(e) =>
                                      updateAccountAssignment(acct.id, {
                                        propertyId: acct.propertyId || 'prop_rocks_lusaka',
                                        role: 'staff',
                                        department: e.target.value as StaffDepartment,
                                      })
                                    }
                                    className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-300 focus:outline-none focus:border-amber-500"
                                  >
                                    <option value="reception">Reception</option>
                                    <option value="housekeeping">Housekeeping</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="concierge">Concierge</option>
                                  </select>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {acct.role === 'founder' ? (
                              <span className="text-xs text-stone-400">All Properties (Global)</span>
                            ) : (
                              <select
                                value={acct.propertyId || ''}
                                onChange={(e) =>
                                  updateAccountAssignment(acct.id, {
                                    propertyId: e.target.value,
                                    role: acct.role as 'manager' | 'staff',
                                    department: acct.department || 'reception',
                                  })
                                }
                                className="bg-stone-950 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                              >
                                {properties.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                isActive
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-red-500/15 text-red-300 border border-red-500/30'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? 'bg-emerald-400' : 'bg-red-400'
                                }`}
                              />
                              {isActive ? 'Active' : 'Deactivated'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => handleSendResetEmail(acct.email)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-stone-700 text-xs text-stone-300 hover:text-white hover:border-stone-500 transition-colors cursor-pointer"
                                title="Send Firebase password reset email"
                              >
                                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                Reset Access
                              </button>
                              {acct.role !== 'founder' && (
                                <button
                                  onClick={() => handleToggleAccountActive(acct)}
                                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                                    isActive
                                      ? 'border-red-900/50 text-red-400 hover:bg-red-500/10'
                                      : 'border-emerald-800 text-emerald-400 hover:bg-emerald-500/10'
                                  }`}
                                >
                                  {isActive ? 'Deactivate' : 'Reactivate'}
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
        </ErrorBoundary>
      ) : activeTab === 'leads' ? (
        <ErrorBoundary sectionName="HQ leads">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/60 border border-stone-800 rounded-xl p-4">
              <div>
                <h2 className="font-serif text-lg text-white font-medium">Prospective Property Leads</h2>
                <p className="text-xs text-stone-400">Quotes requested via the sales landing page</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                  {leads.length} Total {leads.length === 1 ? 'Lead' : 'Leads'}
                </span>
              </div>
            </div>

            {leads.length === 0 ? (
              <div className="p-8 text-center bg-stone-900/40 border border-stone-800 rounded-2xl text-stone-400 text-xs">
                No leads submitted yet. Quotes requested at / will appear here instantly.
              </div>
            ) : (
              <div className="space-y-3">
                {leads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 bg-stone-900 border border-stone-800 rounded-2xl space-y-3 hover:border-stone-700 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-2.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-base font-bold text-white">{lead.propertyName}</h3>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-800 text-stone-300">
                            {lead.propertyType} · {lead.roomCount || lead.rooms || 0} rooms
                          </span>
                        </div>
                        <p className="text-xs text-stone-400">
                          {lead.name} · {lead.city} · {new Date(lead.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lusaka' })}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={lead.status}
                          onChange={(e) => dbService.updateLeadStatus(lead.id, e.target.value as any, lead.notes)}
                          className="text-xs px-2.5 py-1 rounded-lg bg-stone-950 border border-stone-700 text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                        >
                          <option value="new">New</option>
                          <option value="contacted">Contacted</option>
                          <option value="won">Won</option>
                          <option value="lost">Lost</option>
                        </select>
                        <a
                          href={`https://wa.me/${(lead.whatsappPhone || lead.whatsapp || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `Hi ${lead.name}, this is Nathaniel from ${APP_NAME}. Following up on your quote for ${lead.propertyName}.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </div>
                    </div>

                    {lead.message && (
                      <p className="text-xs text-stone-300 italic bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
                        "{lead.message}"
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        defaultValue={lead.notes || ''}
                        placeholder="Add internal notes (e.g. quote sent ZMW 4,500, scheduled call Tuesday)..."
                        onBlur={(e) => {
                          if (e.target.value !== (lead.notes || '')) {
                            dbService.updateLeadStatus(lead.id, lead.status, e.target.value);
                          }
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-stone-950 border border-stone-800 text-xs text-stone-200 placeholder:text-stone-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ErrorBoundary>
      ) : (
          /* Activity Log Tab */
          <ErrorBoundary sectionName="HQ activity logs">
            <div className="space-y-4">
            <div className="bg-stone-900/60 border border-stone-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Platform Activity Log</h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Last 50 recorded security and operational actions across all properties.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                {activityLogs.length} events
              </span>
            </div>

            <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden divide-y divide-stone-800/80">
              {activityLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-stone-500">
                  No activity events recorded yet.
                </div>
              ) : (
                activityLogs.map((act) => (
                  <div key={act.id} className="p-3.5 sm:p-4 flex items-start gap-3 text-xs">
                    <div className="w-7 h-7 rounded-lg bg-stone-800 border border-stone-700/60 flex items-center justify-center shrink-0 mt-0.5">
                      <History className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-stone-200 capitalize">
                          {(act.type || (act as any).action || 'activity').replace(/_/g, ' ')}
                        </span>
                        <span className="text-stone-400 font-mono text-[11px]">
                          {formatPropertyDate(act.createdAt || new Date().toISOString(), 'Africa/Lusaka')}
                        </span>
                      </div>
                      <div className="text-stone-400">
                        By <span className="text-stone-300 font-medium">{act.actorName || 'System'}</span>
                        {act.actorEmail && act.actorEmail !== act.actorName && (
                          <span className="text-stone-500"> ({act.actorEmail})</span>
                        )}
                      </div>
                      {act.summary && (
                        <div className="text-stone-300 text-[11px] bg-stone-950/50 rounded-lg p-2 border border-stone-800/60 font-mono">
                          {(() => {
                            let s = act.summary;
                            for (const prop of properties) {
                              if (prop.id && s.includes(prop.id)) {
                                s = s.replaceAll(prop.id, prop.name || prop.id);
                              }
                            }
                            return s;
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          </ErrorBoundary>
        )}
      </main>

      {/* Suspend Property Confirmation Modal */}
      {suspendConfirmProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-white">
                  Suspend {suspendConfirmProperty.name}?
                </h2>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  While suspended, guest QR pages show a paused notice with the reception phone
                  number, new guest service requests are blocked, and the Property Desk is placed in
                  read-only mode.
                </p>
              </div>
              <button
                onClick={() => setSuspendConfirmProperty(null)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">
                Notice shown to guests (optional custom message)
              </label>
              <textarea
                rows={2}
                value={customSuspendMessage}
                onChange={(e) => setCustomSuspendMessage(e.target.value)}
                placeholder="Our online guest service is temporarily paused. Please contact reception at +260 97 782 8119 for assistance."
                className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-white placeholder:text-stone-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSuspendConfirmProperty(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSuspendProperty}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Property Confirmation Modal */}
      {resumeConfirmProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-white">
                  Resume {resumeConfirmProperty.name}?
                </h2>
                <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                  Online guest QR access will be restored immediately, allowing guests to send requests and front desk staff to operate normally.
                </p>
              </div>
              <button
                onClick={() => setResumeConfirmProperty(null)}
                className="text-stone-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setResumeConfirmProperty(null)}
                className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:text-white text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResumeProperty}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
              >
                Confirm Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Property Settings Modal */}
      {editingProperty && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div>
                <h2 className="font-serif text-xl text-white">Property Settings</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Update operational details, contact numbers, and guest banner for {editingProperty.name}.
                </p>
              </div>
              <button
                onClick={() => setEditingProperty(null)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePropertySettings} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1">Property Name</label>
                <input
                  type="text"
                  value={editPropName}
                  onChange={(e) => setEditPropName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">City</label>
                  <input
                    type="text"
                    value={editPropCity}
                    onChange={(e) => setEditPropCity(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Timezone</label>
                  <input
                    type="text"
                    value={editPropTimezone}
                    onChange={(e) => setEditPropTimezone(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Reception Phone</label>
                  <input
                    type="text"
                    value={editPropPhone}
                    onChange={(e) => setEditPropPhone(e.target.value)}
                    placeholder="+260 97 782 8119"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">WhatsApp Phone</label>
                  <input
                    type="text"
                    value={editPropWhatsapp}
                    onChange={(e) => setEditPropWhatsapp(e.target.value)}
                    placeholder="+260 97 782 8119"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Standard Check-In</label>
                  <input
                    type="text"
                    value={editPropCheckIn}
                    onChange={(e) => setEditPropCheckIn(e.target.value)}
                    placeholder="14:00"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Standard Check-Out</label>
                  <input
                    type="text"
                    value={editPropCheckOut}
                    onChange={(e) => setEditPropCheckOut(e.target.value)}
                    placeholder="11:00"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Default Wi-Fi Name</label>
                  <input
                    type="text"
                    value={editPropWifiName}
                    onChange={(e) => setEditPropWifiName(e.target.value)}
                    placeholder="8119 vip"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-300 mb-1">Default Wi-Fi Password</label>
                  <input
                    type="text"
                    value={editPropWifiPassword}
                    onChange={(e) => setEditPropWifiPassword(e.target.value)}
                    placeholder="@rocks.8119"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>

              {/* Cover Photo Upload */}
              <div>
                <label className="block text-xs font-medium text-stone-300 mb-1.5">
                  Property Cover Banner
                </label>
                <div className="flex items-center gap-3">
                  {editPropCoverImg ? (
                    <img
                      src={editPropCoverImg}
                      alt="Cover Preview"
                      className="w-20 h-14 object-cover rounded-lg border border-stone-700"
                    />
                  ) : (
                    <div className="w-20 h-14 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-stone-500 text-xs">
                      No cover
                    </div>
                  )}
                  <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs text-stone-200 cursor-pointer">
                    <Camera className="w-4 h-4 text-amber-400" />
                    <span>{isUploadingPropCover ? 'Compressing...' : 'Upload Cover Photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={isUploadingPropCover}
                      onChange={handleCoverPhotoUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-stone-400 mt-1">
                  Automatically compressed client-side to ≤ 300 KB (JPEG max 1600px).
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setEditingProperty(null)}
                  className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={propSettingsSaving}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {propSettingsSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision Account Modal */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-5">
              <div>
                <h2 className="font-serif text-xl text-white">Provision Staff / Manager Account</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Creates a real Firebase Auth credential and links the user to a property.
                </p>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {provisionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{provisionError}</span>
              </div>
            )}

            <form onSubmit={handleProvisionAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={acctName}
                    onChange={(e) => setAcctName(e.target.value)}
                    placeholder="e.g. Mutale Banda"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={acctPhone}
                    onChange={(e) => setAcctPhone(e.target.value)}
                    placeholder="+260 97 000 0000"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                  Login Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={acctEmail}
                    onChange={(e) => setAcctEmail(e.target.value)}
                    placeholder="staff.member@rocks.co.zm"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Assigned Property *
                  </label>
                  <select
                    value={acctPropertyId}
                    onChange={(e) => setAcctPropertyId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Access Role *
                  </label>
                  <select
                    value={acctRole}
                    onChange={(e) => setAcctRole(e.target.value as 'manager' | 'staff')}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">General Manager</option>
                  </select>
                </div>
              </div>

              {acctRole === 'staff' && (
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Department *
                  </label>
                  <select
                    value={acctDept}
                    onChange={(e) => setAcctDept(e.target.value as StaffDepartment)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="housekeeping">Housekeeping</option>
                    <option value="reception">Reception / Front Desk</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="concierge">Concierge</option>
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs text-stone-400 uppercase tracking-wider">
                    Initial Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    Generate Strong Password
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showTempPassword ? 'text' : 'password'}
                    required
                    value={acctTempPassword}
                    onChange={(e) => setAcctTempPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-3.5 pr-10 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTempPassword((v) => !v)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-white cursor-pointer"
                  >
                    {showTempPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  Share this initial password securely with the user or click &ldquo;Reset
                  Access&rdquo; later to email them a reset link.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold text-xs transition-colors cursor-pointer"
                >
                  {isProvisioning ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Provisioning…
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Create Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboard New Property Modal */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-5">
              <div>
                <h2 className="font-serif text-2xl text-white">Onboard New Property</h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Provisions a new property workspace, houses, and General Manager profile.
                </p>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="text-stone-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {onboardError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{onboardError}</span>
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Property Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="e.g. Zambezi Sun Suites"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Lusaka / Livingstone"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Property Type
                  </label>
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Serviced Apartment">Serviced Apartment</option>
                    <option value="Boutique Hotel">Boutique Hotel</option>
                    <option value="Safari Lodge">Safari Lodge</option>
                    <option value="Executive Resort">Executive Resort</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="ZMW">ZMW (Kwacha)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Brand Color
                  </label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full h-10 bg-stone-950 border border-stone-800 rounded-xl p-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Guest Wi-Fi Network
                  </label>
                  <input
                    type="text"
                    value={wifiName}
                    onChange={(e) => setWifiName(e.target.value)}
                    placeholder="Property_Guest_5G"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    Guest Wi-Fi Password
                  </label>
                  <input
                    type="text"
                    value={wifiPassword}
                    onChange={(e) => setWifiPassword(e.target.value)}
                    placeholder="Welcome2026!"
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="border-t border-stone-800 pt-4 mt-2">
                <h3 className="text-xs uppercase tracking-wider text-amber-400 mb-3">
                  General Manager Credentials
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                      GM Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="e.g. Chandaenga"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                      GM Phone (WhatsApp)
                    </label>
                    <input
                      type="tel"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      placeholder="+260 97 000 0000"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs text-stone-400 uppercase tracking-wider mb-1.5">
                    GM Login Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      placeholder="gm@property.co.zm"
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-700 text-stone-300 hover:text-white text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Create Property & Launch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
