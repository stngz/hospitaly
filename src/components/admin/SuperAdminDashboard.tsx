import React, { useState, useSyncExternalStore } from 'react';
import { dbService, subscribeToStore } from '../../lib/store';
import { useAuth } from '../../context/AuthContext';
import { Property, UserProfile } from '../../types';
import { 
  Building2, 
  Plus, 
  ShieldCheck, 
  CheckCircle2, 
  AlertOctagon, 
  ExternalLink, 
  Lock, 
  Unlock, 
  Sparkles, 
  KeyRound, 
  Users, 
  BedDouble, 
  Clock, 
  Wifi, 
  Phone, 
  Mail, 
  X, 
  Compass,
  Layers,
  ArrowRight,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onManageProperty: (property: Property, manager?: UserProfile) => void;
  onSwitchToGuest?: (propertySlug: string) => void;
  onSwitchToStaff?: () => void;
}

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  onManageProperty,
  onSwitchToGuest,
  onSwitchToStaff
}) => {
  const { user } = useAuth();
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'suspended'>('all');

  // New property form state
  const [propertyName, setPropertyName] = useState('');
  const [city, setCity] = useState('Livingstone');
  const [propertyType, setPropertyType] = useState('Luxury Safari Lodge');
  const [currency, setCurrency] = useState('ZMW');
  const [primaryColor, setPrimaryColor] = useState('#1B3B2B');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('Welcome2026');
  const [managerName, setManagerName] = useState('');
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPin, setManagerPin] = useState('1234');
  const [managerPhone, setManagerPhone] = useState('+260 97 ');

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
    () => dbService.getUsers(),
    () => dbService.getUsers()
  );

  // Filtered properties
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

  const activeCount = properties.filter((p) => p.status === 'active').length;
  const suspendedCount = properties.filter((p) => p.status === 'suspended').length;
  const totalPendingRequests = requests.filter((r) => r.status === 'pending' || r.status === 'in_progress').length;

  const handleToggleStatus = (propertyId: string, _currentStatus: string, _propName: string) => {
    dbService.togglePropertyStatus(propertyId);
  };

  const [onboardError, setOnboardError] = useState<string | null>(null);

  const handleOnboardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyName.trim() || !city.trim() || !managerName.trim() || !managerEmail.trim() || !managerPin.trim()) {
      setOnboardError('Please fill in all required fields.');
      return;
    }
    setOnboardError(null);

    const { property, manager } = dbService.createPropertyWithManager(
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
        pinCode: managerPin.trim(),
      }
    );

    setIsOnboardModalOpen(false);
    // Reset form
    setPropertyName('');
    setCity('Livingstone');
    setManagerName('');
    setManagerEmail('');
    setManagerPin('1234');
    setManagerPhone('+260 97 ');

    // Jump into the property
    onManageProperty(property, manager);
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 pb-24 selection:bg-amber-400 selection:text-stone-950">
      {/* Tier 1 Header */}
      <header className="bg-stone-950 border-b border-stone-800 px-6 py-5 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-black text-lg shadow-lg">
              H
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Tier 1 &bull; Platform Super Admin
                </span>
                <span className="text-[10px] text-stone-400 font-mono">
                  Founder Command
                </span>
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                Hospitally Zambia HQ
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setIsOnboardModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-stone-950 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Onboard New Client Property</span>
            </button>

            {onSwitchToStaff && (
              <button
                onClick={onSwitchToStaff}
                className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Staff Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => dbService.resetDemoData()}
              title="Reset database to fresh seed state"
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Metric Cards Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Client Properties</span>
              <p className="text-3xl font-bold text-white mt-1">{properties.length}</p>
              <p className="text-[11px] text-emerald-400 mt-1 font-medium">{activeCount} active &bull; {suspendedCount} suspended</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Managed Rooms</span>
              <p className="text-3xl font-bold text-white mt-1">{rooms.length}</p>
              <p className="text-[11px] text-stone-400 mt-1 font-medium">{rooms.filter(r => r.status === 'occupied').length} currently occupied</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <BedDouble className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Live Orders & Requests</span>
              <p className="text-3xl font-bold text-amber-400 mt-1">{totalPendingRequests}</p>
              <p className="text-[11px] text-stone-400 mt-1 font-medium">{requests.length} cumulative lifetime</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-stone-950/80 p-5 rounded-2xl border border-stone-800/80 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-wide">Staff & GMs</span>
              <p className="text-3xl font-bold text-white mt-1">{users.length}</p>
              <p className="text-[11px] text-stone-400 mt-1 font-medium">PIN-secured accounts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-stone-950/80 p-4 rounded-2xl border border-stone-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search properties by name or city (e.g. Livingstone, Luangwa, Lusaka)..."
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
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
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

        {/* Properties Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredProperties.map((prop) => {
            const propRooms = rooms.filter((r) => r.propertyId === prop.id);
            const propRequests = requests.filter((r) => r.propertyId === prop.id);
            const propUsers = users.filter((u) => u.propertyId === prop.id);
            const manager = propUsers.find((u) => u.role === 'manager') || propUsers[0];
            const isSuspended = prop.status === 'suspended';

            return (
              <div
                key={prop.id}
                className={`rounded-3xl border transition-[border-color,box-shadow,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden flex flex-col justify-between ${
                  isSuspended
                    ? 'bg-stone-950/60 border-rose-900/40 opacity-80 shadow-diffused'
                    : 'bg-stone-950 border-white/[0.08] [@media(hover:hover)_and_(pointer:fine)]:hover:border-white/[0.16] shadow-diffused'
                }`}
              >
                <div>
                  {/* Property Cover Header */}
                  <div className="relative h-44 overflow-hidden aspect-[16/9]">
                    <img
                      src={prop.coverImageUrl}
                      alt={prop.name}
                      loading="lazy"
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        isSuspended ? 'grayscale' : 'brightness-90'
                      }`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />

                    {/* Top Badges */}
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
                            <CheckCircle2 className="w-3 h-3" /> Active Client
                          </>
                        )}
                      </span>
                    </div>

                    {/* Bottom Title inside header */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h2 className="text-xl font-serif font-bold text-white leading-tight drop-shadow-sm">
                        {prop.name}
                      </h2>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                      {prop.description}
                    </p>

                    {/* Operational KPI Pills */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-stone-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                        <span className="text-[10px] text-stone-500 uppercase font-semibold block">Rooms</span>
                        <span className="text-base font-bold text-white">{propRooms.length}</span>
                      </div>
                      <div className="bg-stone-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                        <span className="text-[10px] text-stone-500 uppercase font-semibold block">Live Requests</span>
                        <span className="text-base font-bold text-amber-400">
                          {propRequests.filter((r) => r.status === 'pending' || r.status === 'in_progress').length}
                        </span>
                      </div>
                      <div className="bg-stone-900/90 p-2.5 rounded-xl border border-white/[0.06]">
                        <span className="text-[10px] text-stone-500 uppercase font-semibold block">Staff Team</span>
                        <span className="text-base font-bold text-white">{propUsers.length}</span>
                      </div>
                    </div>

                    {/* Primary Manager & Security Details */}
                    <div className="p-3.5 bg-stone-900/70 border border-white/[0.06] rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                          Primary General Manager (Tier 2)
                        </span>
                        {manager?.pinCode && (
                          <span className="px-2 py-0.5 bg-stone-800 text-amber-300 font-mono text-[11px] rounded border border-white/[0.1] flex items-center gap-1 font-bold">
                            <KeyRound className="w-3 h-3" /> PIN: {manager.pinCode}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-stone-200 font-medium">
                        <span>{manager?.name || 'No GM Assigned'}</span>
                        <span className="text-stone-400 text-[11px] font-mono">{manager?.email || prop.contactEmail}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-white/[0.06]">
                        <span className="flex items-center gap-1 font-mono">
                          <Wifi className="w-3 h-3 text-stone-500" /> {prop.wifiName}
                        </span>
                        <span className="font-mono text-stone-400">PW: {prop.wifiPassword || 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-5 pt-0 flex items-center justify-between gap-3 border-t border-white/[0.06] mt-2">
                  <button
                    onClick={() => handleToggleStatus(prop.id, prop.status, prop.name)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold active:scale-[0.96] transition-[background-color,border-color,transform] duration-140 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 select-none ${
                      isSuspended
                        ? 'bg-emerald-950 text-emerald-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-emerald-900 border border-emerald-800'
                        : 'bg-rose-950 text-rose-300 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-rose-900 border border-rose-800'
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
                        <span>Suspend (Billing Lock)</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    {onSwitchToGuest && (
                      <button
                        onClick={() => onSwitchToGuest(prop.slug)}
                        title="Preview Guest mobile experience for this lodge"
                        className="p-2 text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-white bg-stone-900 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-850 border border-white/[0.08] rounded-xl active:scale-[0.94] transition-[background-color,color,transform] duration-140"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onManageProperty(prop, manager)}
                      className="px-4 py-2 bg-amber-400 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-bold shadow-diffused active:scale-[0.96] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center gap-1.5 select-none"
                    >
                      <span>Manage Property</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* MODAL: ONBOARD NEW CLIENT PROPERTY */}
      {isOnboardModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto modal-backdrop-animate">
          <div className="bg-stone-950 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-modal border border-white/[0.12] text-stone-100 my-8 modal-content-animate">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Onboard New Client Property</h2>
                  <p className="text-xs text-stone-400">Founder Command &bull; Provision Property, GM Account & Initial Room</p>
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

              {/* Section 1: Property Identity */}
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
                      placeholder="e.g. Royal Zambezi Safari Lodge"
                      value={propertyName}
                      onChange={(e) => setPropertyName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      City / Region (Zambia) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Livingstone, Lusaka, Lower Zambezi"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Property Type
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="Luxury Safari Lodge">Luxury Safari Lodge</option>
                      <option value="Boutique Hotel">Boutique Hotel</option>
                      <option value="Serviced Apartment">Serviced Apartment</option>
                      <option value="Private Safari Villa">Private Safari Villa</option>
                      <option value="River Resort">River Resort</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Billing Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="ZMW">ZMW - Zambian Kwacha</option>
                      <option value="USD">USD - US Dollars</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 2: Wi-Fi & Guest Access */}
              <div className="pt-2 border-t border-stone-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-3">
                  2. In-Room Wi-Fi & Branding
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Guest Wi-Fi Network (SSID)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. RoyalLodge_Guest"
                      value={wifiName}
                      onChange={(e) => setWifiName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Wi-Fi Password
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SafariStay2026"
                      value={wifiPassword}
                      onChange={(e) => setWifiPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: General Manager Account (Tier 2) */}
              <div className="pt-2 border-t border-stone-800/80">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-3">
                  3. Client General Manager (Tier 2 Credentials)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      GM Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Brian Musonda (General Manager)"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      GM Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. gm@royallodge.zm"
                      value={managerEmail}
                      onChange={(e) => setManagerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      4-Digit Staff PIN Code *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="e.g. 5566"
                      value={managerPin}
                      onChange={(e) => setManagerPin(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-amber-300 font-mono text-sm tracking-widest focus:outline-none focus:ring-1 focus:ring-amber-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +260 97 700 0222"
                      value={managerPhone}
                      onChange={(e) => setManagerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-stone-900 border border-stone-800 text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
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
                  className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 text-xs font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2"
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
