import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { consumeSessionExpiredBanner } from '../../lib/sessionPolicy';
import { UserProfile } from '../../types';
import { APP_NAME } from '../../lib/config';
import { Logo } from '../brand/Logo';
import {
  ShieldAlert,
  Loader2,
  Mail,
  Crown,
  Building2,
  Eye,
  EyeOff,
  CheckCircle2,
  Lock,
  Clock,
} from 'lucide-react';

interface LoginGateProps {
  portal: 'hq' | 'staff';
  onSuccess: (user: UserProfile) => void;
}

export const LoginGate: React.FC<LoginGateProps> = ({ portal, onSuccess }) => {
  const { loginWithEmail, signOut, sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expiredBanner, setExpiredBanner] = useState<string | null>(() =>
    consumeSessionExpiredBanner()
      ? 'Your session expired due to inactivity. Please sign in again.'
      : null
  );
  const [resetSentMsg, setResetSentMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setErrorMsg(null);
    setResetSentMsg(null);
    setPassword('');
    const expired = consumeSessionExpiredBanner();
    if (expired) {
      setExpiredBanner('Your session expired due to inactivity. Please sign in again.');
    }
  }, [portal]);

  const handleEmailAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setResetSentMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    try {
      setIsLoading(true);
      const authenticatedUser = await loginWithEmail(email.trim(), password);

      if (portal === 'hq' && authenticatedUser.role !== 'founder') {
        await signOut();
        setErrorMsg('Access denied: Only the Platform Founder is authorised to access /hq.');
        return;
      }

      if (
        portal === 'staff' &&
        authenticatedUser.role !== 'staff' &&
        authenticatedUser.role !== 'manager' &&
        authenticatedUser.role !== 'founder'
      ) {
        await signOut();
        setErrorMsg('Access denied: Your account is not authorised for the Staff Portal.');
        return;
      }

      onSuccess(authenticatedUser);
    } catch (err: any) {
      const code = err?.code || '';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password'
      ) {
        setErrorMsg('Invalid email or password. Please verify your credentials.');
      } else if (code === 'auth/user-disabled') {
        setErrorMsg('This account has been disabled by the Founder.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Access temporarily locked due to repeated failed attempts. Please wait a moment.');
      } else {
        setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setErrorMsg(null);
    setResetSentMsg(null);

    if (!email.trim()) {
      setErrorMsg('Enter your registered email address above first, then click Reset Password.');
      return;
    }

    try {
      setIsResetting(true);
      await sendPasswordReset(email.trim());
      setResetSentMsg('If an authorised account exists for that email, a password reset link has been sent.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to send password reset email right now.');
    } finally {
      setIsResetting(false);
    }
  };

  const isHq = portal === 'hq';

  return (
    <div className="fixed inset-0 overflow-y-auto w-full h-full min-h-[100dvh] bg-[#0E1A2B] flex flex-col justify-between px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-stone-100 overscroll-none selection:bg-[#C9A55C] selection:text-[#13233A] z-50">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between max-w-sm mx-auto w-full pt-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <Lock className="w-3.5 h-3.5 text-[#C9A55C]" />
          <span>{isHq ? `${APP_NAME} HQ (/hq)` : 'Property Operations (/staff)'}</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-[#13233A] border border-white/10 text-xs uppercase tracking-wider text-stone-400">
          Authorised Access
        </span>
      </div>

      {/* Main Authentication Container */}
      <div className="max-w-sm mx-auto w-full my-auto space-y-5 text-center">
        <div>
          <Logo variant="full" size="md" tone="onDark" className="justify-center mb-4" />
          <h1 className="text-xl font-serif font-bold text-white tracking-tight">
            {isHq ? 'Founder Executive Sign In' : 'Staff & Manager Sign In'}
          </h1>
          <p className="text-xs text-stone-300 mt-1 max-w-xs mx-auto leading-relaxed">
            {isHq
              ? 'Platform-wide administrative gateway. Founder credentials required.'
              : 'Sign in with your authorised property email and password.'}
          </p>
        </div>

        {expiredBanner && (
          <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-500/40 text-xs text-amber-200 flex items-center gap-2.5 text-left">
            <Clock className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{expiredBanner}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2.5 text-left">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {resetSentMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-xs text-emerald-200 flex items-start gap-2.5 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{resetSentMsg}</span>
          </div>
        )}

        <form onSubmit={handleEmailAuthSubmit} className="space-y-4 text-left">
          <div>
            <label
              htmlFor="login-email"
              className="text-xs font-semibold text-stone-300 uppercase tracking-wider mb-1.5 flex items-center justify-between"
            >
              <span>Email Address</span>
              <Mail className="w-3.5 h-3.5 text-stone-500" />
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={isHq ? 'founder@shekin.app' : 'manager@property.com'}
              className="w-full text-base bg-[#13233A] border border-white/[0.12] rounded-xl px-3.5 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-[#C9A55C]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="text-xs font-semibold text-stone-300 uppercase tracking-wider"
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-stone-400 hover:text-[#C9A55C] flex items-center gap-1 cursor-pointer transition-colors select-none"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-[#C9A55C]" />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-stone-400" />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full text-base bg-[#13233A] border border-white/[0.12] rounded-xl pl-3.5 pr-10 py-2.5 text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-[#C9A55C] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4 text-[#C9A55C]" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#C9A55C] hover:bg-[#d8b46b] text-[#13233A] font-bold text-sm rounded-xl shadow-diffused flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 select-none cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#13233A]" />
            ) : (
              <span>{isHq ? 'Sign In to HQ' : 'Sign In to Staff Portal'}</span>
            )}
          </button>

          <div className="pt-1 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={isResetting}
              onClick={handlePasswordReset}
              className="text-stone-400 hover:text-[#C9A55C] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isResetting ? 'Sending reset link...' : 'Forgot password? Reset via email'}
            </button>
          </div>
        </form>

        {!isHq && (
          <div className="p-3 rounded-xl bg-stone-900/80 border border-white/[0.06] text-xs text-stone-400 leading-relaxed text-left">
            <span className="font-semibold text-stone-300 block mb-0.5">Account Provisioning Policy</span>
            Staff and Manager accounts are provisioned exclusively by the Founder. Managers should contact {APP_NAME} HQ when additional team access is needed.
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="text-center text-xs text-stone-500 pb-1">
        <span>{APP_NAME} Security &bull; Authorised Access Only</span>
      </div>
    </div>
  );
};
