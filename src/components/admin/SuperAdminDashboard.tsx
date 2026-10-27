import React, { useState, useSyncExternalStore } from 'react';
import { dbService, subscribeToStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Property, StaffDepartment, UserProfile } from '../../types';
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
} from 'lucide-react';

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

  const [activeTab, setActiveTab] = useState<'properties' | 'accounts'>('properties');
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');

  // Account Administration filter & feedback state
  const [accountPropertyFilter, setAccountPropertyFilter] = useState<string>('all');
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

  if (!user || user.role !== 'founder') {
    return null;
  }

  const filteredProperties = properties.filter((p) => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchCity = p.city.toLowerCase().includes(q);
      if (!matchName && !matchCity) return false;
    }
    return true;
  });

  const filteredUsers = users.filter((u) => {
    if (accountPropertyFilter !== 'all' && u.propertyId !== accountPropertyFilter) {
      return false;
    }
    return true;
  });

  const activeCount = properties.filter((p) => p.status === 'active').length;
  const suspendedCount = properties.filter((p) => p.status === 'suspended').length;
  const totalPendingRequests = requests.filter(
    (r) => r.status === 'pending' || r.status === 'in_progress'
  ).length;

  const handleToggleStatus = (propertyId: string) => {
    dbService.togglePropertyStatus(propertyId);
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
        propertyType,
        currency,
        primaryColor,
        wifiName: wifiName.trim() || `${propertyName.replace(/\s+/g, '')}_Guest`,
        wifiPassword: wifiPassword.trim(),
        contactPhone: managerPhone.trim(),
      },
      {
        name: managerName.trim(),
        email: managerEmail.trim().toLowerCase(),
        phone: managerPhone.trim(),
      }
    );

    setIsOnboardModalOpen(false);
    setPropertyName('');
    setCity('Lusaka');
    setManagerName('');
    setManagerEmail('');
    setManagerPhone('+260 97 ');
    onManageProperty(property);
  };

  const handleProvisionAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionError(null);
    setAccountActionMessage(null);

    if (!acctName.trim() || !acctEmail.trim() || !acctPropertyId) {
      setProvisionError('Name, email address, and assigned property are required.');
      return;
    }

    if (acctTempPassword && acctTempPassword.length < 8) {
      setProvisionError('Temporary password must be at least 8 characters.');
      return;
    }

    try {
      setIsProvisioning(true);
      const { profile, authCreated } = await provisionAccount({
        name: acctName.trim(),
        email: acctEmail.trim().toLowerCase(),
        phone: acctPhone.trim(),
        role: acctRole,
        department: acctRole === 'manager' ? 'management' : acctDept,
        propertyId: acctPropertyId,
        tempPassword: acctTempPassword || undefined,
      });

      setIsProvisionModalOpen(false);
      setAcctName('');
      setAcctEmail('');
      setAcctPhone('');
      setAcctTempPassword('');
      setAccountActionMessage({
        type: 'success',
        text: authCreated
          ? `Provisioned ${profile.role.toUpperCase()} account for ${profile.email} and dispatched a password reset link.`
          : `Authorised ${profile.role.toUpperCase()} profile for ${profile.email}. A password reset link has been triggered.`,
      });
    } catch (err: any) {
      setProvisionError(err?.message || 'Failed to provision account.');
    } finally {
      setIsProvisioning(false);
    }
  };

  const handleToggleUserActive = async (targetUser: UserProfile) => {
    setAccountActionMessage(null);
    try {
      await setAccountActive(targetUser.id, !targetUser.active);
      setAccountActionMessage({
        type: 'success',
        text: `${targetUser.name} (${targetUser.email}) is now ${!targetUser.active ? 'Active' : 'Deactivated'}.`,
      });
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Could not update account status.',
      });
    }
  };

  const handleResetUserAccess = async (targetUser: UserProfile) => {
    setAccountActionMessage(null);
    try {
      await sendPasswordReset(targetUser.email);
      setAccountActionMessage({
        type: 'success',
        text: `Sent secure password reset email to ${targetUser.email}.`,
      });
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Could not send password reset email.',
      });
    }
  };

  const handlePropertyReassign = async (targetUser: UserProfile, newPropertyId: string) => {
    if (targetUser.role === 'founder') return;
    setAccountActionMessage(null);
    try {
      await updateAccountAssignment(targetUser.id, {
        propertyId: newPropertyId,
        role: targetUser.role === 'manager' ? 'manager' : 'staff',
        department: targetUser.department,
      });
      setAccountActionMessage({
        type: 'success',
        text: `Updated property assignment for ${targetUser.name}.`,
      });
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Could not reassign property.',
      });
    }
  };

  const handleRoleChange = async (targetUser: UserProfile, newRole: 'manager' | 'staff') => {
    if (targetUser.role === 'founder') return;
    setAccountActionMessage(null);
    try {
      await updateAccountAssignment(targetUser.id, {
        propertyId: targetUser.propertyId,
        role: newRole,
        department: newRole === 'manager' ? 'management' : targetUser.department,
      });
      setAccountActionMessage({
        type: 'success',
        text: `Updated role for ${targetUser.name} to ${newRole.toUpperCase()}.`,
      });
    } catch (err: any) {
      setAccountActionMessage({
        type: 'error',
        text: err?.message || 'Could not change user role.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 pb-24 selection:bg-amber-400 selection:text-stone-950">
      {/* Founder Header */}
      <header className="bg-stone-950 border-b border-stone-800 px-6 py-5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-lg shadow-lg">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Founder &bull; Platform Administration
                </span>
                <span className="text-[10px] text-stone-400 font-mono">{user.email}</span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Hospitally HQ</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => {
                setActiveTab('accounts');
                setIsProvisionModalOpen(true);
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Staff / Manager Account</span>
            </button>

            <button
              onClick={() => setIsOnboardModalOpen(true)}
              className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard Property</span>
            </button>

            {onSwitchToStaff && (
              <button
                onClick={onSwitchToStaff}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>Property Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => signOut()}
              className="px-3 py-2 bg-stone-900 hover:bg-rose-950 text-stone-300 hover:text-rose-200 border border-stone-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Sign Out of Founder HQ"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Metric Cards Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                Client Properties
              </span>
              <p className="text-3xl font-bold text-white mt-1">{properties.length}</p>
              <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                {activeCount} active &bull; {suspendedCount} suspended
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                Managed Houses
              </span>
              <p className="text-3xl font-bold text-white mt-1">{rooms.length}</p>
              <p className="text-[11px] text-stone-400 mt-1 font-medium">
                {rooms.filter((r) => r.status === 'occupied').length} occupied
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                Active Requests
              </span>
              <p className="text-3xl font-bold text-amber-400 mt-1">{totalPendingRequests}</p>
              <p className="text-[11px] text-stone-400 mt-1 font-medium">
                {requests.length} total recorded
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                Authorised Accounts
              </span>
              <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
              <p className="text-[11px] text-stone-400 mt-1 font-medium">
                {users.filter((u) => u.active).length} active accounts
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* HQ Section Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
          <button
            onClick={() => setActiveTab('properties')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'properties'
                ? 'bg-amber-400 text-stone-950'
                : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Properties ({properties.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'accounts'
                ? 'bg-amber-400 text-stone-950'
                : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Account Administration ({users.length})</span>
          </button>
        </div>

        {/* TAB 1: PROPERTIES */}
        {activeTab === 'properties' && (
          <>
            <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search properties by name or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-4 py-2 text-xs rounded-xl bg-stone-900 border border-stone-800 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="flex items-center gap-2">
                {(['all', 'active', 'suspended'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors cursor-pointer ${
                      filterStatus === status
                        ? 'bg-amber-400 text-stone-950'
                        : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredProperties.map((prop) => {
                const propRooms = rooms.filter((r) => r.propertyId === prop.id);
                const propRequests = requests.filter((r) => r.propertyId === prop.id);
                const propUsers = users.filter((u) => u.propertyId === prop.id);
                const manager = propUsers.find((u) => u.role === 'manager');
                const isSuspended = prop.status === 'suspended';

                return (
                  <div
                    key={prop.id}
                    className={`rounded-3xl border overflow-hidden flex flex-col justify-between ${
                      isSuspended
                        ? 'bg-stone-950/60 border-rose-900/40 opacity-80'
                        : 'bg-stone-950 border-white/[0.08]'
                    }`}
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={prop.coverImageUrl}
                          alt={prop.name}
                          loading="lazy"
                          className={`w-full h-full object-cover ${
                            isSuspended ? 'grayscale' : 'brightness-90'
                          }`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

                        <div className="absolute top-4 inset-x-4 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-900/90 text-white backdrop-blur-sm border border-white/[0.1]">
                              {prop.city}, Zambia
                            </span>
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-amber-400/90 text-stone-950 backdrop-blur-sm">
                              {prop.currency}
                            </span>
                          </div>

                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                              isSuspended
                                ? 'bg-rose-950/90 text-rose-300 border border-rose-800/80'
                                : 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/80'
                            }`}
                          >
                            {isSuspended ? (
                              <>
                                <Lock className="w-3 h-3" /> Suspended
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> Active
                              </>
                            )}
                          </span>
                        </div>

                        <div className="absolute bottom-3 left-4 right-4">
                          <h2 className="text-xl font-serif font-bold text-white leading-tight">
                            {prop.name}
                          </h2>
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                          {prop.description}
                        </p>

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-stone-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                            <span className="text-[10px] text-stone-500 uppercase font-semibold block">
                              Houses
                            </span>
                            <span className="text-base font-bold text-white">{propRooms.length}</span>
                          </div>
                          <div className="bg-stone-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                            <span className="text-[10px] text-stone-500 uppercase font-semibold block">
                              Live Requests
                            </span>
                            <span className="text-base font-bold text-amber-400">
                              {
                                propRequests.filter(
                                  (r) => r.status === 'pending' || r.status === 'in_progress'
                                ).length
                              }
                            </span>
                          </div>
                          <div className="bg-stone-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                            <span className="text-[10px] text-stone-500 uppercase font-semibold block">
                              Staff Team
                            </span>
                            <span className="text-base font-bold text-white">{propUsers.length}</span>
                          </div>
                        </div>

                        <div className="p-3.5 bg-stone-900/70 border border-white/[0.06] rounded-2xl space-y-1.5 text-xs">
                          <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                            Assigned General Manager
                          </span>
                          <div className="flex items-center justify-between text-stone-200 font-medium">
                            <span>{manager?.name || 'Unassigned'}</span>
                            <span className="text-stone-400 text-[11px] font-mono">
                              {manager?.email || prop.contactEmail}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-white/[0.06] mt-2">
                      <button
                        onClick={() => handleToggleStatus(prop.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                          isSuspended
                            ? 'bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800'
                        }`}
                      >
                        {isSuspended ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Reactivate Property</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Suspend Property</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onManageProperty(prop)}
                        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Open Property Desk</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TAB 2: FOUNDER ACCOUNT ADMINISTRATION */}
        {activeTab === 'accounts' && (
          <div className="space-y-4">
            <div className="bg-stone-950 p-5 rounded-3xl border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                  Founder-Only Provisioning
                </span>
                <h2 className="text-lg font-serif font-bold text-white mt-0.5">
                  Manager & Staff Account Governance
                </h2>
                <p className="text-xs text-stone-400 mt-1 max-w-2xl">
                  Create manager and staff accounts, assign them to a specific property, send secure password-reset links, or deactivate access. Managers cannot create accounts or change roles.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <select
                  value={accountPropertyFilter}
                  onChange={(e) => setAccountPropertyFilter(e.target.value)}
                  className="bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  <option value="all">All Properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setIsProvisionModalOpen(true)}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Provision Account</span>
                </button>
              </div>
            </div>

            {accountActionMessage && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between ${
                  accountActionMessage.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                    : 'bg-rose-950/70 border-rose-700 text-rose-200'
                }`}
              >
                <span>{accountActionMessage.text}</span>
                <button
                  onClick={() => setAccountActionMessage(null)}
                  className="text-stone-400 hover:text-white ml-4"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-900/90 border-b border-stone-800 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                      <th className="py-3.5 px-4">Account Holder</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Assigned Property</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Founder Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800/80 text-xs">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-stone-500">
                          No accounts found for the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((acct) => {
                        const isFounderAcct = acct.role === 'founder';
                        return (
                          <tr key={acct.id} className="hover:bg-stone-900/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{acct.name}</div>
                              <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                                {acct.email} {acct.phone ? `• ${acct.phone}` : ''}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              {isFounderAcct ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                                  Founder
                                </span>
                              ) : (
                                <select
                                  value={acct.role === 'manager' ? 'manager' : 'staff'}
                                  onChange={(e) =>
                                    handleRoleChange(acct, e.target.value as 'manager' | 'staff')
                                  }
                                  className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-stone-200 font-semibold"
                                >
                                  <option value="manager">Manager</option>
                                  <option value="staff">Staff ({acct.department})</option>
                                </select>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              {isFounderAcct ? (
                                <span className="text-stone-400 font-mono text-[11px]">
                                  Platform-Wide (HQ)
                                </span>
                              ) : (
                                <select
                                  value={acct.propertyId}
                                  onChange={(e) => handlePropertyReassign(acct, e.target.value)}
                                  className="bg-stone-900 border border-stone-700 rounded-lg px-2.5 py-1 text-xs text-stone-200"
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
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  acct.active
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    acct.active ? 'bg-emerald-400' : 'bg-rose-400'
                                  }`}
                                />
                                {acct.active ? 'Active' : 'Deactivated'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResetUserAccess(acct)}
                                  className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer"
                                  title="Send Firebase Password Reset Email"
                                >
                                  <KeyRound className="w-3 h-3 text-amber-400" />
                                  <span>Reset Access</span>
                                </button>

                                {!isFounderAcct && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserActive(acct)}
                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                                      acct.active
                                        ? 'bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-800'
                                        : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800'
                                    }`}
                                  >
                                    {acct.active ? 'Deactivate' : 'Reactivate'}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: PROVISION MANAGER / STAFF ACCOUNT */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-stone-950 rounded-3xl max-w-lg w-full p-6 shadow-modal border border-white/[0.12] text-stone-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Provision Manager or Staff Account</h2>
                  <p className="text-xs text-stone-400">
                    Founder-only account creation & property assignment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProvisionModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProvisionAccountSubmit} className="space-y-4">
              {provisionError && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{provisionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chanda Phiri"
                  value={acctName}
                  onChange={(e) => setAcctName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. staff.test@example.com"
                  value={acctEmail}
                  onChange={(e) => setAcctEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">Role *</label>
                  <select
                    value={acctRole}
                    onChange={(e) => setAcctRole(e.target.value as 'manager' | 'staff')}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Property Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Department *
                  </label>
                  <select
                    value={acctRole === 'manager' ? 'management' : acctDept}
                    disabled={acctRole === 'manager'}
                    onChange={(e) => setAcctDept(e.target.value as StaffDepartment)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-60"
                  >
                    <option value="housekeeping">Housekeeping</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="reception">Reception</option>
                    <option value="concierge">Concierge</option>
                    <option value="management">Management</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Assigned Property *
                </label>
                <select
                  value={acctPropertyId}
                  onChange={(e) => setAcctPropertyId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.city})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-300">
                    Initial Temporary Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowTempPassword(!showTempPassword)}
                    className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center gap-1 font-mono"
                  >
                    {showTempPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Show
                      </>
                    )}
                  </button>
                </div>
                <input
                  type={showTempPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  value={acctTempPassword}
                  onChange={(e) => setAcctTempPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Creates the Firebase Auth account via the backend and sends a password-reset email so the user can set their own password.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Contact Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="+260 97 000 0000"
                  value={acctPhone}
                  onChange={(e) => setAcctPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-400 hover:text-white rounded-xl hover:bg-stone-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProvisioning}
                  className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isProvisioning ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  <span>Provision Account</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ONBOARD NEW CLIENT PROPERTY */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-stone-950 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-modal border border-white/[0.12] text-stone-100 my-8">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Onboard New Client Property</h2>
                  <p className="text-xs text-stone-400">
                    Founder Command &bull; Provision Property & Initial Manager Profile
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOnboardModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white rounded-full hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-5">
              {onboardError && (
                <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{onboardError}</span>
                </div>
              )}

              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-3">
                  1. Property Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Property Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lusaka Garden Villas"
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      City / Region (Zambia) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Lusaka, Livingstone"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Property Type
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="Serviced Apartment">Serviced Holiday Houses</option>
                      <option value="Boutique Hotel">Boutique Hotel</option>
                      <option value="Luxury Safari Lodge">Luxury Safari Lodge</option>
                      <option value="Private Safari Villa">Private Safari Villa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Billing Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="ZMW">ZMW - Zambian Kwacha</option>
                      <option value="USD">USD - US Dollars</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-3">
                  2. Wi-Fi Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Guest Wi-Fi Network (SSID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Property_Guest_WiFi"
                      value={wifiName}
                      onChange={(e) => setWifiName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Wi-Fi Password
                    </label>
                    <input
                      type="text"
                      placeholder="Enter property Wi-Fi password"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-3">
                  3. Assigned General Manager Profile
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      GM Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mutale Banda"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      GM Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. manager.test@example.com"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+260 97 000 0000"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-base rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOnboardModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold text-stone-400 hover:text-white rounded-xl hover:bg-stone-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Onboard Client Property</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
