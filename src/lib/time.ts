import { useEffect, useState } from 'react';
import { DEFAULT_TIMEZONE } from './config';

/**
 * Formats an ISO timestamp or Date as "HH:mm" in the property's timezone (default: Africa/Lusaka).
 */
export function formatPropertyTime(
  value?: string | number | Date | null,
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}

/**
 * Formats an ISO timestamp or Date as "Fri 30 Oct, 11:00" in the property's timezone (default: Africa/Lusaka).
 * Never returns raw ISO strings.
 */
export function formatPropertyDate(
  value?: string | number | Date | null,
  timeZone: string = DEFAULT_TIMEZONE,
  defaultTime: string = '11:00'
): string {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    // Date-only string: interpret at defaultTime in Lusaka (+02:00)
    const parsed = new Date(`${value.trim()}T${defaultTime}:00+02:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return formatDateWithTime(parsed, timeZone);
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return formatDateWithTime(date, timeZone);
}

function formatDateWithTime(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }).formatToParts(date);

    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    return `${get('weekday')} ${get('day')} ${get('month')}, ${get('hour')}:${get('minute')}`.trim();
  } catch {
    return date.toLocaleString('en-GB');
  }
}

/**
 * Formats relative elapsed time ("Just now", "6 min ago", "2 h ago").
 */
export function formatRelativeAgo(
  createdAt?: string | number | Date | null,
  nowMs: number = Date.now()
): string {
  if (!createdAt) return '';
  const ts = new Date(createdAt).getTime();
  if (Number.isNaN(ts)) return '';
  const diffMin = Math.max(0, Math.floor((nowMs - ts) / 60_000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} h ago`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} d ago`;
}

/**
 * Converts a check-out date/ISO string into an exact epoch timestamp in Africa/Lusaka (+02:00).
 */
export function parseCheckOutTimestamp(
  checkOutValue?: string | null,
  defaultCheckOutTime: string = '11:00'
): number | null {
  if (!checkOutValue) return null;
  const trimmed = checkOutValue.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(`${trimmed}T${defaultCheckOutTime}:00+02:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const d = new Date(`${trimmed.length === 16 ? `${trimmed}:00` : trimmed}+02:00`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Returns the YYYY-MM-DD calendar date in the property's timezone.
 */
export function getPropertyCalendarDate(
  value: number | Date = Date.now(),
  timeZone: string = DEFAULT_TIMEZONE
): string {
  const date = value instanceof Date ? value : new Date(value);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone,
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${m}-${d}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export type CheckOutCountdownTone = 'grey' | 'amber' | 'orange' | 'red';

export interface CheckOutCountdown {
  tone: CheckOutCountdownTone;
  state: CheckOutCountdownTone;
  label: string;
  text: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  dueTimestamp: number;
}

/**
 * Computes the live check-out countdown state per Spec §3:
 * - > 2 h: grey "Due out 11:00"
 * - <= 2 h (120 min): amber "Due out in 1 h 20 min"
 * - <= 15 min: orange "Due out in 12 min"
 * - past check-out and still occupied: red "Overdue 25 min"
 */
export function computeCheckOutCountdown(
  checkOutValue?: string | null,
  nowMs: number = Date.now(),
  timeZone: string = DEFAULT_TIMEZONE,
  defaultCheckOutTime: string = '11:00'
): CheckOutCountdown | null {
  const dueTs = parseCheckOutTimestamp(checkOutValue, defaultCheckOutTime);
  if (dueTs === null) return null;

  const todayStr = getPropertyCalendarDate(nowMs, timeZone);
  const tomorrowStr = getPropertyCalendarDate(nowMs + 86_400_000, timeZone);
  const dueDateStr = getPropertyCalendarDate(dueTs, timeZone);

  const isToday = dueDateStr <= todayStr;
  const isTomorrow = dueDateStr === tomorrowStr;
  const diffMs = dueTs - nowMs;
  const diffMin = Math.round(diffMs / 60_000);
  const dueTimeFormatted = formatPropertyTime(dueTs, timeZone);

  if (diffMs <= 0) {
    const overdueMin = Math.max(1, Math.floor(Math.abs(diffMs) / 60_000));
    const hrs = Math.floor(overdueMin / 60);
    const mins = overdueMin % 60;
    const durationText =
      hrs > 0 ? `${hrs} h${mins > 0 ? ` ${mins} min` : ''}` : `${overdueMin} min`;
    const label = `Overdue ${durationText}`;
    return {
      tone: 'red',
      state: 'red',
      label,
      text: label,
      isOverdue: true,
      isToday: true,
      isTomorrow: false,
      dueTimestamp: dueTs,
    };
  }

  if (diffMin <= 15) {
    const label = `Due out in ${Math.max(1, diffMin)} min`;
    return {
      tone: 'orange',
      state: 'orange',
      label,
      text: label,
      isOverdue: false,
      isToday,
      isTomorrow,
      dueTimestamp: dueTs,
    };
  }

  if (diffMin <= 120) {
    const hrs = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    const durationText = hrs > 0 ? `${hrs} h${mins > 0 ? ` ${mins} min` : ''}` : `${diffMin} min`;
    const label = `Due out in ${durationText}`;
    return {
      tone: 'amber',
      state: 'amber',
      label,
      text: label,
      isOverdue: false,
      isToday,
      isTomorrow,
      dueTimestamp: dueTs,
    };
  }

  const label = `Due out ${dueTimeFormatted}`;
  return {
    tone: 'grey',
    state: 'grey',
    label,
    text: label,
    isOverdue: false,
    isToday,
    isTomorrow,
    dueTimestamp: dueTs,
  };
}

/**
 * Live clock hook that ticks every `intervalMs` (default 30_000 ms).
 */
export function useNow(intervalMs: number = 30_000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

/**
 * Formats wait duration in minutes into a clean human string:
 * - < 1 min
 * - 12 min
 * - 3 h 20 min
 * - 1 d 11 h
 */
export function formatWaitDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / (24 * 60));
  const remainingMinutes = minutes % (24 * 60);
  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;
  if (days > 0) {
    return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
  }
  return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`;
}
