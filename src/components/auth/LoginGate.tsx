import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { UserProfile } from '../../types';
import { 
  KeyRound, 
  ShieldAlert, 
  ArrowLeft, 
  Delete, 
  UserCheck, 
  Loader2, 
  Mail, 
  Lock, 
  Shield, 
  Crown, 
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';

interface LoginGateProps {
  targetRole: 'admin' | 'staff';
  onSuccess: (user: UserProfile) => void;
  onCancel: () => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  targetRole: initialTargetRole,
  onSuccess,
  onCancel,
}) => {
  const { availableStaff, loginWithEmail, signUpWithEmail, signInAs } = useAuth();
  const { property } = useTenant();

  // Active portal mode: 'admin' (strictly Email & Password) | 'staff' (Fast PIN for shared tablet)
  const [currentRole, setCurrentRole] = useState<'admin' | 'staff'>(initialTargetRole);

  // Authentication method: Admin is strictly 'email'. Staff defaults to 'pin' with optional GM email.
  const [authMode, setAuthMode] = useState<'pin' | 'email'>(
    initialTargetRole === 'admin' ? 'email' : 'pin'
  );

  // Email & Password state
  const [email, setEmail] = useState(
    initialTargetRole === 'admin' ? 'nathanielmazaba@gmail.com' : 'nathanielmazaba+gm@gmail.com'
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState(
    initialTargetRole === 'admin' ? 'Nathaniel Mazaba (Founder)' : 'Joe Zaza (General Manager)'
  );

  // PIN keypad state (exclusively for operational floor staff on shared tablets)
  const currentPropertyStaff = availableStaff.filter(
    (s) => !property || s.propertyId === property.id
  );
  const defaultStaff =
    currentPropertyStaff.find((s) => s.role === 'staff') ||
    currentPropertyStaff.find((s) => s.role === 'manager') ||
    availableStaff[0];

  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaff?.id || '');
  const [pin, setPin] = useState('');
  
  // UI feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentRole === 'admin') {
      setEmail('nathanielmazaba@gmail.com');
      setFullName('Nathaniel Mazaba (Founder)');
      setAuthMode('email'); // Strict security: Founder Admin MUST authenticate with email/password
    } else {
      setEmail('nathanielmazaba+gm@gmail.com');
      setFullName('Joe Zaza (General Manager)');
      setAuthMode('pin');
    }
    setErrorMsg(null);
    setPassword('');
  }, [currentRole]);

  useEffect(() => {
    if (defaultStaff && !selectedStaffId) {
      setSelectedStaffId(defaultStaff.id);
    }
  }, [defaultStaff, selectedStaffId]);

  // Handle Firebase Email/Password submission (Founder & General Manager)
  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    try {
      setIsLoading(true);
      let authenticatedUser: UserProfile;

      if (isSignUp) {
        authenticatedUser = await signUpWithEmail(
          email.trim(),
          password,
          fullName.trim(),
          currentRole === 'admin' ? 'admin' : 'manager',
          currentRole === 'admin' ? '' : 'prop_rocks_lusaka'
        );
      } else {
        authenticatedUser = await loginWithEmail(email.trim(), password);
      }

      // Enforce strict executive authorization
      if (currentRole === 'admin' && authenticatedUser.role !== 'admin') {
        setErrorMsg('Access denied: This account does not possess Super Admin privileges.');
        setIsLoading(false);
        return;
      }

      onSuccess(authenticatedUser);
    } catch (err: any) {
      console.error('Email authentication failed:', err);
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMsg('Invalid email or password. If you have not created your password yet, click "First time? Create account" below.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Click "Sign In" instead.');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Password must be at least 6 characters.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Access temporarily locked due to repeated failed attempts. Please wait a moment.');
      } else {
        setErrorMsg(err.message || 'Authentication error. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify PIN exclusively for operational floor staff
  const verifyPin = (candidatePin: string) => {
    setErrorMsg(null);

    const chosenStaff = availableStaff.find((u) => u.id === selectedStaffId) || defaultStaff;

    if (!chosenStaff) {
      setErrorMsg('No staff profile selected.');
      setPin('');
      return;
    }

    // Verify PIN matches staff member's record or master staff PIN 1234
    if (candidatePin === chosenStaff.pinCode || candidatePin === '1234') {
      signInAs(chosenStaff);
      onSuccess(chosenStaff);
      return;
    }

    setErrorMsg('Invalid PIN code. Please enter the 4-digit staff PIN (1234).');
    setPin('');
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        setTimeout(() => verifyPin(nextPin), 100);
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg(null);
    setPin('');
  };

  // Physical keyboard listener for PIN
  useEffect(() => {
    if (authMode !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, selectedStaffId, authMode, currentRole]);

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col justify-between p-6 text-stone-100 selection:bg-amber-400">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between max-w-sm mx-auto w-full pt-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white active:scale-[0.95] transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Guest View</span>
        </button>

        {/* Portal Switcher Pill */}
        <div className="flex items-center bg-stone-900 border border-white/[0.1] rounded-full p-1 text-[11px] font-mono">
          <button
            onClick={() => {
              setCurrentRole('admin');
              setPin('');
              setErrorMsg(null);
            }}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentRole === 'admin'
                ? 'bg-amber-400 text-stone-950 shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Crown className="w-3 h-3" />
            <span>HQ Admin</span>
          </button>

          <button
            onClick={() => {
              setCurrentRole('staff');
              setPin('');
              setErrorMsg(null);
            }}
            className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer flex items-center gap-1 ${
              currentRole === 'staff'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Staff Portal</span>
          </button>
        </div>
      </div>

      {/* Main Authentication Container */}
      <div className="max-w-sm mx-auto w-full my-auto space-y-4 text-center">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto mb-2.5 shadow-elevated">
            {currentRole === 'admin' ? (
              <Crown className="w-6 h-6 text-amber-400" />
            ) : (
              <Building2 className="w-6 h-6 text-emerald-400" />
            )}
          </div>
          <h1 className="text-xl font-serif font-bold text-white tracking-tight">
            {currentRole === 'admin' ? 'HQ Founder Executive Gate' : 'Rocks Apartments Staff Portal'}
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {currentRole === 'admin'
              ? 'Secured executive gateway. Verified Founder credentials required.'
              : 'Operational desk for General Manager and floor staff.'}
          </p>
        </div>

        {/* If in Staff Mode, allow switching between PIN keypad and Manager Email */}
        {currentRole === 'staff' && (
          <div className="flex bg-stone-900/90 p-1 rounded-xl border border-white/[0.08] text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setAuthMode('pin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'pin'
                  ? 'bg-stone-800 text-white shadow-xs font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Staff PIN Pad</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('email');
                setErrorMsg(null);
              }}
              className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'email'
                  ? 'bg-stone-800 text-white shadow-xs font-bold'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-amber-400" />
              <span>Manager Login</span>
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 text-left animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* --- 1. PIN KEYPAD VIEW (ONLY FOR OPERATIONAL STAFF TABLETS) --- */}
        {currentRole === 'staff' && authMode === 'pin' && (
          <div className="space-y-3.5">
            {/* Profile Dropdown */}
            <div className="text-left bg-stone-900/80 p-2.5 rounded-xl border border-white/[0.08] space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block flex items-center gap-1 font-mono">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Select On-Duty Staff Profile:</span>
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setPin('');
                  setErrorMsg(null);
                }}
                className="w-full text-xs bg-stone-950 border border-white/[0.1] rounded-lg p-2 text-stone-100 font-medium focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {availableStaff
                  .filter((s) => s.role === 'staff' || s.role === 'manager')
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role === 'manager' ? 'GM' : s.department.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>

            {/* PIN Dots */}
            <div className="py-1">
              <div className="flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((index) => {
                  const filled = pin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                        filled
                          ? 'bg-amber-400 scale-110 shadow-md shadow-amber-400/50'
                          : 'border-2 border-white/[0.15] bg-stone-900'
                      }`}
                    />
                  );
                })}
              </div>
              <p className="text-[10px] text-stone-500 font-mono mt-1.5">
                Enter your 4-digit tablet access PIN
              </p>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[270px] mx-auto select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="h-11 rounded-xl bg-stone-900/90 border border-white/[0.08] text-lg font-bold text-stone-100 hover:bg-stone-850 active:scale-[0.94] transition-all cursor-pointer shadow-xs"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-11 rounded-xl bg-stone-900/50 border border-white/[0.06] text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-850 active:scale-[0.94] transition-all font-mono cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-11 rounded-xl bg-stone-900/90 border border-white/[0.08] text-lg font-bold text-stone-100 hover:bg-stone-850 active:scale-[0.94] transition-all cursor-pointer shadow-xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="h-11 rounded-xl bg-stone-900/50 border border-white/[0.06] text-stone-400 hover:text-stone-200 hover:bg-stone-850 flex items-center justify-center active:scale-[0.94] transition-all cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* --- 2. EMAIL & PASSWORD VIEW (MANDATORY FOR FOUNDER ADMIN; OPTIONAL FOR GM) --- */}
        {(currentRole === 'admin' || authMode === 'email') && (
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5 text-left">
            {isSignUp && (
              <div>
                <label className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full text-xs bg-stone-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Email Address</span>
                <Mail className="w-3.5 h-3.5 text-stone-500" />
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full text-xs bg-stone-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[11px] text-stone-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors select-none font-mono"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Hide Password</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-stone-400" />
                      <span>Show Password</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={showPassword ? 'Enter your password' : '••••••••••••'}
                  className="w-full text-xs bg-stone-900 border border-white/[0.12] rounded-xl pl-3.5 pr-10 py-2.5 text-stone-100 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-amber-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl shadow-diffused flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
              ) : isSignUp ? (
                'Create Account & Enter'
              ) : (
                'Sign In with Firebase'
              )}
            </button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setIsSignUp(!isSignUp);
                }}
                className="text-[11px] text-amber-300 hover:underline cursor-pointer font-mono"
              >
                {isSignUp ? 'Already registered? Sign In' : 'First time? Create account'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-stone-500 pb-1 font-mono">
        <span>Protected by Hospitally Security &bull; Rocks Apartments Lusaka</span>
      </div>
    </div>
  );
};
