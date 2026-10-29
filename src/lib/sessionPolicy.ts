import { UserRole } from '../types';

export interface RoleSessionPolicy {
  idleTimeoutMs: number;
  maxSessionMs: number;
  warningLeadMs: number;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

export const SESSION_POLICIES: Record<Exclude<UserRole, 'guest'>, RoleSessionPolicy> = {
  founder: {
    idleTimeoutMs: 30 * MINUTE,
    maxSessionMs: 8 * HOUR,
    warningLeadMs: 2 * MINUTE,
  },
  manager: {
    idleTimeoutMs: 40 * MINUTE,
    maxSessionMs: 12 * HOUR,
    warningLeadMs: 2 * MINUTE,
  },
  staff: {
    idleTimeoutMs: 40 * MINUTE,
    maxSessionMs: 12 * HOUR,
    warningLeadMs: 2 * MINUTE,
  },
};

export const SESSION_STORAGE_KEYS = {
  lastActivityAt: 'hospitally_last_activity_at',
  sessionStartedAt: 'hospitally_session_started_at',
  expiredReason: 'hospitally_session_expired_reason',
} as const;

export function recordSessionStart(now: number = Date.now()): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEYS.sessionStartedAt, String(now));
    localStorage.setItem(SESSION_STORAGE_KEYS.lastActivityAt, String(now));
    localStorage.removeItem(SESSION_STORAGE_KEYS.expiredReason);
  } catch {
    // Ignore storage errors
  }
}

let lastThrottledWrite = 0;

export function touchSessionActivity(force: boolean = false, now: number = Date.now()): void {
  if (!force && now - lastThrottledWrite < 10_000) {
    return;
  }
  lastThrottledWrite = now;
  try {
    localStorage.setItem(SESSION_STORAGE_KEYS.lastActivityAt, String(now));
  } catch {
    // Ignore storage errors
  }
}

export function clearSessionTimestamps(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEYS.lastActivityAt);
    localStorage.removeItem(SESSION_STORAGE_KEYS.sessionStartedAt);
  } catch {
    // Ignore
  }
}

export function markSessionExpiredBanner(): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEYS.expiredReason, 'inactivity');
  } catch {
    // Ignore
  }
}

export function consumeSessionExpiredBanner(): boolean {
  try {
    const val = localStorage.getItem(SESSION_STORAGE_KEYS.expiredReason);
    if (val === 'inactivity') {
      localStorage.removeItem(SESSION_STORAGE_KEYS.expiredReason);
      return true;
    }
  } catch {
    // Ignore
  }
  return false;
}

export interface SessionCheckResult {
  expired: boolean;
  reason?: 'idle' | 'max_age';
  warningActive: boolean;
  remainingMs: number;
}

export function evaluateSessionState(role: UserRole, now: number = Date.now()): SessionCheckResult {
  if (role === 'guest') {
    return { expired: false, warningActive: false, remainingMs: Infinity };
  }
  const policy = SESSION_POLICIES[role];
  if (!policy) {
    return { expired: false, warningActive: false, remainingMs: Infinity };
  }

  try {
    const rawLast = localStorage.getItem(SESSION_STORAGE_KEYS.lastActivityAt);
    const rawStart = localStorage.getItem(SESSION_STORAGE_KEYS.sessionStartedAt);

    const lastActivityAt = rawLast ? Number(rawLast) : now;
    const sessionStartedAt = rawStart ? Number(rawStart) : now;

    if (!Number.isFinite(lastActivityAt) || !Number.isFinite(sessionStartedAt)) {
      recordSessionStart(now);
      return { expired: false, warningActive: false, remainingMs: policy.idleTimeoutMs };
    }

    const idleElapsed = now - lastActivityAt;
    const maxElapsed = now - sessionStartedAt;

    if (idleElapsed >= policy.idleTimeoutMs) {
      return { expired: true, reason: 'idle', warningActive: false, remainingMs: 0 };
    }
    if (maxElapsed >= policy.maxSessionMs) {
      return { expired: true, reason: 'max_age', warningActive: false, remainingMs: 0 };
    }

    const remainingIdleMs = Math.max(0, policy.idleTimeoutMs - idleElapsed);
    const warningActive = remainingIdleMs <= policy.warningLeadMs;

    return {
      expired: false,
      warningActive,
      remainingMs: remainingIdleMs,
    };
  } catch {
    return { expired: false, warningActive: false, remainingMs: policy.idleTimeoutMs };
  }
}

export function isSessionExpired(
  role: UserRole,
  now: number = Date.now()
): { expired: boolean; reason?: 'idle' | 'max_age' } {
  const res = evaluateSessionState(role, now);
  return { expired: res.expired, reason: res.reason };
}

export function ensureSessionTimestampsInitialized(now: number = Date.now()): void {
  try {
    const rawLast = localStorage.getItem(SESSION_STORAGE_KEYS.lastActivityAt);
    const rawStart = localStorage.getItem(SESSION_STORAGE_KEYS.sessionStartedAt);
    if (!rawLast || !rawStart) {
      recordSessionStart(now);
    }
  } catch {
    // Ignore
  }
}
