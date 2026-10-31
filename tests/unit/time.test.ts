import { describe, it, expect } from 'vitest';
import {
  formatPropertyTime,
  formatPropertyDate,
  formatRelativeAgo,
  computeCheckOutCountdown,
  parseCheckOutTimestamp,
  formatWaitDuration,
} from '../../src/lib/time';

describe('Time and Lusaka Timezone Utilities', () => {
  const LUSAKA = 'Africa/Lusaka';

  it('formats time strictly in Africa/Lusaka regardless of runner environment', () => {
    // 2026-10-29T10:00:00Z is 12:00 in Africa/Lusaka (+02:00)
    const epochUtc10 = new Date('2026-10-29T10:00:00Z').getTime();
    const formatted = formatPropertyTime(epochUtc10, LUSAKA);
    expect(formatted).toBe('12:00');
  });

  it('formats calendar dates accurately for Africa/Lusaka', () => {
    // 2026-10-28T23:30:00Z is 2026-10-29 01:30 in Africa/Lusaka
    const lateNightUtc = new Date('2026-10-28T23:30:00Z').getTime();
    const formatted = formatPropertyDate(lateNightUtc, LUSAKA);
    expect(formatted).toContain('29 Oct');
  });

  it('formats relative elapsed time accurately', () => {
    const baseNow = 1761700000000;
    expect(formatRelativeAgo(baseNow, baseNow)).toBe('Just now');
    expect(formatRelativeAgo(baseNow - 6 * 60_000, baseNow)).toBe('6 min ago');
    expect(formatRelativeAgo(baseNow - 120 * 60_000, baseNow)).toBe('2 h ago');
  });

  describe('computeCheckOutCountdown', () => {
    const checkoutTime = '11:00';
    // Let's set Lusaka check-out target: 2026-10-29T11:00:00+02:00 = 2026-10-29T09:00:00Z
    const checkoutIso = '2026-10-29T11:00:00+02:00';
    const checkoutTargetMs = new Date(checkoutIso).getTime();

    it('returns grey tone when check-out is > 2 hours away', () => {
      // 3 hours before check-out: 08:00 Lusaka time
      const nowMs = checkoutTargetMs - 3 * 3600_000;
      const res = computeCheckOutCountdown(checkoutIso, nowMs, LUSAKA, checkoutTime);
      expect(res).not.toBeNull();
      expect(res?.state).toBe('grey');
      expect(res?.isOverdue).toBe(false);
      expect(res?.text).toBe('Due out 11:00');
    });

    it('returns amber tone when check-out is <= 2 hours (e.g. 80 min away)', () => {
      const nowMs = checkoutTargetMs - 80 * 60_000;
      const res = computeCheckOutCountdown(checkoutIso, nowMs, LUSAKA, checkoutTime);
      expect(res).not.toBeNull();
      expect(res?.state).toBe('amber');
      expect(res?.isOverdue).toBe(false);
      expect(res?.text).toBe('Due out in 1 h 20 min');
    });

    it('returns orange tone when check-out is <= 15 min away', () => {
      const nowMs = checkoutTargetMs - 12 * 60_000;
      const res = computeCheckOutCountdown(checkoutIso, nowMs, LUSAKA, checkoutTime);
      expect(res).not.toBeNull();
      expect(res?.state).toBe('orange');
      expect(res?.isOverdue).toBe(false);
      expect(res?.text).toBe('Due out in 12 min');
    });

    it('returns red tone with overdue minutes when past check-out time', () => {
      // 25 min past 11:00
      const nowMs = checkoutTargetMs + 25 * 60_000;
      const res = computeCheckOutCountdown(checkoutIso, nowMs, LUSAKA, checkoutTime);
      expect(res).not.toBeNull();
      expect(res?.state).toBe('red');
      expect(res?.isOverdue).toBe(true);
      expect(res?.text).toBe('Overdue 25 min');
    });
  });

  describe('formatWaitDuration (B3)', () => {
    it('formats wait times correctly', () => {
      expect(formatWaitDuration(0)).toBe('< 1 min');
      expect(formatWaitDuration(12)).toBe('12 min');
      expect(formatWaitDuration(200)).toBe('3 h 20 min');
      expect(formatWaitDuration(2111)).toBe('1 d 11 h');
    });
  });
});
