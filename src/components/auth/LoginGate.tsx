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
  Building2 
} from 'lucide-react';

interface LoginGateProps {
  targetRole: 'admin' | 'staff';
  onSuccess: (user: UserProfile) => void;
  onCancel: () => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({
  targetRole,
  onSuccess,
  onCancel,
}) => {
  const { availableStaff, loginWithEmail, signUpWithEmail, signInAs } = useAuth();
  const { property } = useTenant();

  // If targetRole is admin, strictly require email/password.
  // If targetRole is staff, default to PIN keypad with option to switch to GM email login.
  const [authMode, setAuthMode] = useState<'pin' | 'email'>(
    targetRole === 'admin' ? 'email' : 'pin'
  );

  // Email/Password state
  const [email, setEmail] = useState(
    targetRole === 'admin' ? 'nathanielmazaba@gmail.com' : 'nathanielmazaba+gm@gmail.com'
  );
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState(
    targetRole === 'admin' ? 'Nathaniel Mazaba (Founder)' : 'Joe Zaza (General Manager)'
  );

  // PIN keypad state (for operational floor staff)
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
    if (defaultStaff && !selectedStaffId) {
      setSelectedStaffId(defaultStaff.id);
    }
  }, [defaultStaff, selectedStaffId]);

  // Handle Firebase Email/Password submission (Founder & GM)
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
          targetRole === 'admin' ? 'admin' : 'manager',
          targetRole === 'admin' ? '' : 'prop_rocks_lusaka'
        );
      } else {
        authenticatedUser = await loginWithEmail(email.trim(), password);
      }

      // Enforce role authorization
      if (targetRole === 'admin' && authenticatedUser.role !== 'admin') {
        setErrorMsg('Access denied: Account does not have Tier 1 Founder privileges.');
        setIsLoading(false);
        return;
      }

      onSuccess(authenticatedUser);
    } catch (err: any) {
      console.error('Email authentication failed:', err);
      const code = err.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMsg('Invalid email or password. If this is your first time, switch to "Create Account" below.');
      } else if (code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email already exists. Switch to "Sign In".');
      } else if (code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Access temporarily blocked due to repeated attempts. Please wait a moment.');
      } else {
        setErrorMsg(err.message || 'Authentication error. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify PIN for operational floor staff
  const verifyPin = (candidatePin: string) => {
    setErrorMsg(null);

    const chosenStaff = availableStaff.find((u) => u.id === selectedStaffId) || defaultStaff;

    if (!chosenStaff) {
      setErrorMsg('No staff profile selected.');
      setPin('');
      return;
    }

    // Verify PIN matches staff member's record or master PIN 1234
    if (candidatePin === chosenStaff.pinCode || candidatePin === '1234') {
      signInAs(chosenStaff);
      onSuccess(chosenStaff);
      return;
    }

    setErrorMsg('Invalid PIN code. Try PIN 1234.');
    setPin('');
  };

  const handleKeyPress = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      if (nextPin.length === 4) {
        setTimeout(() => verifyPin(nextPin), 120);
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

  // Physical keyboard support for PIN
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
  }, [pin, selectedStaffId, authMode]);

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col justify-between p-6 text-stone-100 selection:bg-amber-400">
      {/* Top Navigation */}
      <div className="flex items-center justify-between max-w-sm mx-auto w-full pt-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-white active:scale-[0.95] transition-[color,transform] duration-140"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Guest View</span>
        </button>

        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 bg-stone-900 border border-white/[0.08] px-2.5 py-1 rounded-full flex items-center gap-1">
          {targetRole === 'admin' ? (
            <>
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Founder Gate</span>
            </>
          ) : authMode === 'email' ? (
            <>
              <Building2 className="w-3 h-3 text-amber-400" />
              <span>GM Email Login</span>
            </>
          ) : (
            <>
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Floor Staff PIN</span>
            </>
          )}
        </span>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-sm mx-auto w-full my-auto space-y-5 text-center">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-amber-400/30 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-elevated">
            {targetRole === 'admin' || authMode === 'email' ? (
              <Lock className="w-6 h-6" />
            ) : (
              <KeyRound className="w-6 h-6" />
            )}
          </div>
          <h1 className="text-xl font-serif font-bold text-white tracking-tight">
            {targetRole === 'admin' 
              ? 'Founder Executive Gate' 
              : authMode === 'email'
                ? 'General Manager Sign-In'
                : 'Floor Staff Access'}
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {targetRole === 'admin'
              ? 'Enter your verified Firebase credentials to access platform controls.'
              : authMode === 'email'
                ? 'Manager credentials for Rocks Apartments.'
                : 'Quick PIN access for on-duty operational staff.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 text-left animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* --- 1. EMAIL & PASSWORD AUTHENTICATION FORM (ADMIN & GM) --- */}
        {(targetRole === 'admin' || authMode === 'email') && (
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
                  placeholder="e.g. Nathaniel Mazaba"
                  className="w-full text-xs bg-stone-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
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
                placeholder="name@rocksapartments.zm"
                className="w-full text-xs bg-stone-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-stone-300 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Password</span>
                <Lock className="w-3.5 h-3.5 text-stone-500" />
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full text-xs bg-stone-900 border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl shadow-diffused flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
              ) : isSignUp ? (
                'Create Account & Sign In'
              ) : (
                'Sign In with Firebase'
              )}
            </button>

            {/* Toggle Sign Up vs Sign In (Crucial for first-time onboarding) */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-stone-400 font-mono">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setIsSignUp(!isSignUp);
                }}
                className="hover:text-amber-300 transition-colors underline cursor-pointer"
              >
                {isSignUp ? 'Already registered? Sign In' : 'First time? Create account'}
              </button>

              {targetRole === 'staff' && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setAuthMode('pin');
                  }}
                  className="text-stone-400 hover:text-white transition-colors cursor-pointer"
                >
                  &larr; Back to PIN Keypad
                </button>
              )}
            </div>
          </form>
        )}

        {/* --- 2. PIN KEYPAD VIEW (STAFF OPERATIONAL DESK) --- */}
        {targetRole === 'staff' && authMode === 'pin' && (
          <div className="space-y-4">
            {/* Staff Profile Selection Dropdown */}
            <div className="text-left bg-stone-900/80 p-2.5 rounded-xl border border-white/[0.08] space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block flex items-center gap-1 font-mono">
                <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Select Duty Profile:</span>
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
                      {s.name} ({s.department.toUpperCase()})
                    </option>
                  ))}
              </select>
            </div>

            {/* PIN Dots Display */}
            <div className="py-1">
              <div className="flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((index) => {
                  const filled = pin.length > index;
                  return (
                    <div
                      key={index}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        filled
                          ? 'bg-amber-400 scale-110 shadow-md shadow-amber-400/50'
                          : 'border-2 border-white/[0.15] bg-stone-900'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 max-w-[270px] mx-auto select-none">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="h-12 rounded-xl bg-stone-900/90 border border-white/[0.08] text-lg font-bold text-stone-100 hover:bg-stone-850 active:scale-[0.94] transition-all cursor-pointer shadow-xs"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-xl bg-stone-900/50 border border-white/[0.06] text-xs font-semibold text-stone-400 hover:text-stone-200 hover:bg-stone-850 active:scale-[0.94] transition-all font-mono cursor-pointer"
              >
                Clear
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="h-12 rounded-xl bg-stone-900/90 border border-white/[0.08] text-lg font-bold text-stone-100 hover:bg-stone-850 active:scale-[0.94] transition-all cursor-pointer shadow-xs"
              >
                0
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="h-12 rounded-xl bg-stone-900/50 border border-white/[0.06] text-stone-400 hover:text-stone-200 hover:bg-stone-850 flex items-center justify-center active:scale-[0.94] transition-all cursor-pointer"
              >
                <Delete className="w-4 h-4" />
              </button>
            </div>

            {/* Manager Login Toggle Button */}
            <div className="pt-2 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setAuthMode('email');
                }}
                className="text-xs text-amber-400/90 hover:text-amber-300 font-medium tracking-wide flex items-center justify-center gap-1.5 mx-auto py-1.5 transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Manager Login (Email & Password)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[11px] text-stone-500 pb-1 font-mono">
        <span>Protected by Hospitally Security &bull; Rocks Apartments Lusaka</span>
      </div>
    </div>
  );
};
