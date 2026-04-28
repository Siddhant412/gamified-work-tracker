import { getDeviceTimezone } from './dates';

export const suggestedTimezones = [
  'UTC',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
] as const;

export function isValidTimezone(timezone: string) {
  const trimmed = timezone.trim();
  if (!trimmed) return false;

  try {
    new Intl.DateTimeFormat('en', { timeZone: trimmed }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezone(timezone: string) {
  return timezone.trim() || getDeviceTimezone();
}
