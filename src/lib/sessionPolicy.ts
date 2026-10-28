import { UserRole } from '../types';

export interface RoleSessionLimits {
  idleTimeoutMs: number;
  maxSessionMs: number;
}

export const SESSION_POLICY: Record<Exclude<UserRole, 'guest'>, RoleSessionLimits> = {
  founder: {
    idleTimeoutMs: 30 * 60 * 1000, // 30 minutes
    maxSessionMs: 8 * 60 * 60 * 1000, // 8 hours
  },
  manager: {
    idleTimeoutMs: 60 * 60 * 1000, // 60 minutes
    maxSessionMs: 12 * 60 * 60 * 1000, // 12 hours
  },
  staff: {
    idleTimeoutMs: 60 * 60 * 1000, // 60 minutes
    maxSessionMs: 12 * 60 * 60 * 1000, // 12 hours
  },
};

const STORAGE_KEYS = {
  LAST_ACTIVITY_AT: 'hospitally_last_activity_at',
  SESSION_STARTED_AT: 'hospitally_session_started_at',
  EXPIRED_BANNER: 'hospitally_session_expired_banner',
};

export function recordSessionStart(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now().toString();
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION_STARTED_AT, now);
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, now);
    localStorage.removeItem(STORAGE_KEYS.EXPIRED_BANNER);
  } catch {
    // ignore storage errors
  }
}

export function ensureSessionTimestampsInitialized(): void {
  if (typeof window === 'undefined') return;
  const now = Date.now().toString();
  try {
    if (!localStorage.getItem(STORAGE_KEYS.SESSION_STARTED_AT)) {
      localStorage.setItem(STORAGE_KEYS.SESSION_STARTED_AT, now);
    }
    if (!localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY_AT)) {
      localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, now);
    }
  } catch {
    // ignore
  }
}

export function touchSessionActivity(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY_AT, Date.now().toString());
  } catch {
    // ignore
  }
}

export function clearSessionTimestamps(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
    localStorage.removeItem(STORAGE_KEYS.SESSION_STARTED_AT);
  } catch {
    // ignore
  }
}

export function markSessionExpiredBanner(message = 'Signed out due to inactivity'): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.EXPIRED_BANNER, message);
  } catch {
    // ignore
  }
}

export function consumeSessionExpiredBanner(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const msg = localStorage.getItem(STORAGE_KEYS.EXPIRED_BANNER);
    if (msg) {
      localStorage.removeItem(STORAGE_KEYS.EXPIRED_BANNER);
      return msg;
    }
  } catch {
    // ignore
  }
  return null;
}

export function isSessionExpired(role: UserRole): boolean {
  if (typeof window === 'undefined' || role === 'guest') return false;
  const policy = SESSION_POLICY[role] || SESSION_POLICY.staff;
  const now = Date.now();

  try {
    const rawLast = localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY_AT);
    const rawStart = localStorage.getItem(STORAGE_KEYS.SESSION_STARTED_AT);

    const lastActivityAt = rawLast ? parseInt(rawLast, 10) : now;
    const sessionStartedAt = rawStart ? parseInt(rawStart, 10) : now;

    if (Number.isFinite(lastActivityAt) && now - lastActivityAt > policy.idleTimeoutMs) {
      return true;
    }
    if (Number.isFinite(sessionStartedAt) && now - sessionStartedAt > policy.maxSessionMs) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}
