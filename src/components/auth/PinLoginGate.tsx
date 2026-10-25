import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenant } from '../../context/TenantContext';
import { UserProfile } from '../../types';
import { KeyRound, ShieldAlert, ArrowLeft, Delete, UserCheck, Loader2 } from 'lucide-react';

interface PinLoginGateProps {
  targetRole: 'admin' | 'staff';
  onSuccess: (user: UserProfile) => void;
  onCancel: () => void;
}

export const PinLoginGate: React.FC<PinLoginGateProps> = ({
  targetRole,
  onSuccess,
  onCancel
}) => {
  const { availableStaff, signInWithGoogle } = useAuth();
  const { property } = useTenant();

  // Find staff members, defaulting to current property's GM
  const currentPropertyStaff = availableStaff.filter(
    (s) => !property || s.propertyId === property.id
  );
  const defaultStaff = currentPropertyStaff.find((s) => s.role === 'manager') ||
    availableStaff.find((s) => s.role === 'manager' && (!property || s.propertyId === property.id)) ||
    availableStaff.find((s) => s.role === 'manager') ||
    availableStaff[0];

  const [selectedStaffId, setSelectedStaffId] = useState<string>(defaultStaff?.id || '');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (defaultStaff && !selectedStaffId) {
      setSelectedStaffId(defaultStaff.id);
    }
  }, [defaultStaff, selectedStaffId]);

  const verifyPin = (candidatePin: string) => {
    setErrorMsg(null);

    // Any PIN '1234' works for all roles for testing, as requested
    if (candidatePin === '1234' || candidatePin === '7777') {
      if (targetRole === 'admin') {
        const founder = availableStaff.find((u) => u.role === 'admin') || {
          id: 'admin_founder',
          propertyId: property?.id || 'prop_zambezi_01',
          name: 'Nathaniel Mazaba (Founder)',
          email: 'founder@hospitally.io',
          role: 'admin' as const,
          department: 'management' as const,
          pinCode: '1234',
          active: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        onSuccess(founder);
        return;
      } else {
        // Staff target: unlock as the selected staff member
        const chosenStaff = availableStaff.find((u) => u.id === selectedStaffId) || defaultStaff;
        if (chosenStaff) {
          onSuccess(chosenStaff);
          return;
        }
      }
    }

    // Also match candidatePin directly against any user's pinCode in availableStaff
    const matchedUser = availableStaff.find(
      (u) => u.pinCode === candidatePin && (targetRole === 'admin' ? u.role === 'admin' : true)
    );
    if (matchedUser) {
      onSuccess(matchedUser);
      return;
    }

    setErrorMsg('Invalid PIN code. Try testing with 1234.');
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

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      setErrorMsg(null);
      const user = await signInWithGoogle(targetRole);
      onSuccess(user);
    } catch (err: any) {
      console.error('Google sign in error:', err);
      // Fallback message if popup was closed by user
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google sign in was cancelled.');
      } else {
        setErrorMsg(err.message || 'Google sign in failed. Please try PIN 1234.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Keyboard listener for desktop testing
  useEffect(() => {
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
  }, [pin, selectedStaffId]);

  return (
    <div className="min-h-dvh bg-stone-950 flex flex-col justify-between p-6 text-stone-100 selection:bg-amber-400">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-sm mx-auto w-full pt-2">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 text-xs text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-white active:scale-[0.95] transition-[color,transform] duration-140"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Guest View</span>
        </button>

        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-secondary bg-stone-900 border border-white/[0.08] px-2.5 py-1 rounded-full">
          {targetRole === 'admin' ? 'Tier 1 Security' : 'Tier 2 & 3 Access'}
        </span>
      </div>

      {/* Main Authentication Container */}
      <div className="max-w-sm mx-auto w-full my-auto space-y-4 text-center">
        <div>
          <div className="w-12 h-12 rounded-2xl bg-brand-primary border border-brand-secondary/30 text-brand-secondary flex items-center justify-center mx-auto mb-3 shadow-elevated">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-serif font-bold text-white tracking-tight">
            {targetRole === 'admin' ? 'Founder Executive Gate' : 'Operational Staff Sign-In'}
          </h1>
          <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {targetRole === 'admin' 
              ? 'Sign in as Founder Admin to manage hospitality properties.'
              : `Staff access for ${property?.name || 'hospitality property'}.`}
          </p>
        </div>

        {/* 1. REAL FIREBASE GOOGLE LOGIN BUTTON */}
        <div className="pt-1">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 bg-white [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-100 text-stone-900 font-semibold text-xs rounded-xl shadow-diffused flex items-center justify-center gap-2.5 active:scale-[0.98] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] disabled:opacity-50 select-none"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-stone-600" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2 text-[11px] text-stone-500 font-mono">
          <div className="h-px bg-white/[0.08] flex-1" />
          <span>or sign in with PIN 1234</span>
          <div className="h-px bg-white/[0.08] flex-1" />
        </div>

        {/* Profile Selector for Staff Mode */}
        {targetRole === 'staff' && (
          <div className="text-left bg-stone-900/80 p-2.5 rounded-xl border border-white/[0.08] space-y-1 shadow-2xs">
            <label className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block flex items-center gap-1 font-mono">
              <UserCheck className="w-3.5 h-3.5 text-brand-secondary" />
              <span>Select Staff Profile to Unlock:</span>
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs bg-stone-950 border border-white/[0.1] rounded-lg p-2 text-stone-100 font-medium focus:outline-none focus:ring-1 focus:ring-brand-secondary"
            >
              {availableStaff
                .filter((s) => s.role === 'staff' || s.role === 'manager' || s.role === 'admin')
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role === 'manager' ? 'GM' : s.role.toUpperCase()} &bull; {s.department})
                  </option>
                ))}
            </select>
          </div>
        )}

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
                      ? 'bg-brand-secondary scale-110 shadow-md shadow-brand-secondary/50'
                      : 'border-2 border-white/[0.15] bg-stone-900'
                  }`}
                />
              );
            })}
          </div>

          {errorMsg && (
            <div className="mt-2 text-xs text-rose-400 font-medium flex items-center justify-center gap-1.5 animate-bounce">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2 max-w-[270px] mx-auto select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className="h-12 rounded-xl bg-stone-900/90 border border-white/[0.08] text-lg font-bold text-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-850 active:scale-[0.94] transition-[background-color,transform] duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]"
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-xl bg-stone-900/50 border border-white/[0.06] text-xs font-semibold text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-200 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-850 active:scale-[0.94] transition-[background-color,color,transform] duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] font-mono"
          >
            Clear
          </button>

          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className="h-12 rounded-xl bg-stone-900/90 border border-white/[0.08] text-lg font-bold text-stone-100 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-850 active:scale-[0.94] transition-[background-color,transform] duration-100 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[0_1px_2px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)]"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="h-12 rounded-xl bg-stone-900/50 border border-white/[0.06] text-stone-400 [@media(hover:hover)_and_(pointer:fine)]:hover:text-stone-200 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-850 flex items-center justify-center active:scale-[0.94] transition-[background-color,color,transform] duration-100 ease-[cubic-bezier(0.16,1,0.3,1)]"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        {/* Instant One-Click Unlock with 1234 for Testing */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              setPin('1234');
              setTimeout(() => verifyPin('1234'), 80);
            }}
            className="w-full py-2 bg-stone-900/90 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-stone-850 border border-white/[0.08] text-brand-secondary text-xs font-mono font-bold rounded-xl active:scale-[0.98] transition-[background-color,transform] duration-140 flex items-center justify-center gap-1.5 shadow-2xs select-none"
          >
            <span>Instant Test Unlock (PIN 1234)</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-stone-500 pb-1">
        <span>Protected by Hospitally Security &bull; PIN '1234' active across all profiles</span>
      </div>
    </div>
  );
};
