import { describe, it, expect, beforeEach } from 'vitest';
import {
  SESSION_POLICIES,
  SESSION_STORAGE_KEYS,
  evaluateSessionState,
} from '../../src/lib/sessionPolicy';

describe('Role-based Session Policies', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const key in store) delete store[key];
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        for (const key in store) delete store[key];
      },
      length: 0,
      key: () => null,
    };
  });

  it('enforces 40 min idle and 12 h max session for staff and manager', () => {
    expect(SESSION_POLICIES.staff.idleTimeoutMs).toBe(40 * 60 * 1000);
    expect(SESSION_POLICIES.staff.maxSessionMs).toBe(12 * 60 * 60 * 1000);
    expect(SESSION_POLICIES.manager.idleTimeoutMs).toBe(40 * 60 * 1000);
    expect(SESSION_POLICIES.manager.maxSessionMs).toBe(12 * 60 * 60 * 1000);
  });

  it('enforces 30 min idle and 8 h max session for founder', () => {
    expect(SESSION_POLICIES.founder.idleTimeoutMs).toBe(30 * 60 * 1000);
    expect(SESSION_POLICIES.founder.maxSessionMs).toBe(8 * 60 * 60 * 1000);
  });

  it('triggers warning when within 2 minutes of idle timeout', () => {
    const now = 200000000;
    // Founder has 30 min idle timeout. At 28.5 min idle, 1.5 min remaining (warning active)
    store[SESSION_STORAGE_KEYS.lastActivityAt] = String(now - 28.5 * 60 * 1000);
    store[SESSION_STORAGE_KEYS.sessionStartedAt] = String(now - 30 * 60 * 1000);

    const result = evaluateSessionState('founder', now);
    expect(result.expired).toBe(false);
    expect(result.warningActive).toBe(true);
    expect(result.remainingMs).toBeLessThanOrEqual(2 * 60 * 1000);
  });

  it('marks session as expired when idle time exceeds limit', () => {
    const now = 200000000;
    store[SESSION_STORAGE_KEYS.lastActivityAt] = String(now - 31 * 60 * 1000);
    store[SESSION_STORAGE_KEYS.sessionStartedAt] = String(now - 40 * 60 * 1000);

    const result = evaluateSessionState('founder', now);
    expect(result.expired).toBe(true);
    expect(result.reason).toBe('idle');
  });

  it('marks session as expired when total session age exceeds limit', () => {
    const now = 200000000;
    store[SESSION_STORAGE_KEYS.lastActivityAt] = String(now - 5 * 60 * 1000);
    store[SESSION_STORAGE_KEYS.sessionStartedAt] = String(now - 8.5 * 3600 * 1000); // 8.5 hours

    const result = evaluateSessionState('founder', now);
    expect(result.expired).toBe(true);
    expect(result.reason).toBe('max_age');
  });

  it('normalises legacy "admin" role to founder policy and expires correctly', () => {
    const now = 200000000;
    // 31 min idle -> expired for admin (founder policy: 30 min)
    store[SESSION_STORAGE_KEYS.lastActivityAt] = String(now - 31 * 60 * 1000);
    store[SESSION_STORAGE_KEYS.sessionStartedAt] = String(now - 40 * 60 * 1000);

    const idleResult = evaluateSessionState('admin' as any, now);
    expect(idleResult.expired).toBe(true);
    expect(idleResult.reason).toBe('idle');

    // 8.5 hours session -> max_age expired for admin
    store[SESSION_STORAGE_KEYS.lastActivityAt] = String(now - 5 * 60 * 1000);
    store[SESSION_STORAGE_KEYS.sessionStartedAt] = String(now - 8.5 * 3600 * 1000);
    const maxResult = evaluateSessionState('admin' as any, now);
    expect(maxResult.expired).toBe(true);
    expect(maxResult.reason).toBe('max_age');
  });
});
