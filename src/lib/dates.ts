import type { ISODate } from '@/src/types/domain';

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timezone: string) {
  const existing = dateFormatterCache.get(timezone);
  if (existing) return existing;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  dateFormatterCache.set(timezone, formatter);
  return formatter;
}

export function getDeviceTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function toLocalDateKey(date: Date, timezone = getDeviceTimezone()): ISODate {
  const parts = formatterFor(timezone).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Unable to resolve local date for timezone ${timezone}`);
  }

  return `${year}-${month}-${day}` as ISODate;
}

export function parseDateKey(dateKey: ISODate | string) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function formatDateKey(date: Date): ISODate {
  return date.toISOString().slice(0, 10) as ISODate;
}

export function addDays(dateKey: ISODate, days: number): ISODate {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

export function diffDaysInclusive(startDate: ISODate, endDate: ISODate) {
  const start = parseDateKey(startDate).getTime();
  const end = parseDateKey(endDate).getTime();
  return Math.max(1, Math.floor((end - start) / 86_400_000) + 1);
}

export function enumerateDateKeys(startDate: ISODate, endDate: ISODate) {
  const dates: ISODate[] = [];
  let cursor = startDate;

  while (cursor <= endDate) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }

  return dates;
}

export function subtractMonths(dateKey: ISODate, months: number): ISODate {
  const date = parseDateKey(dateKey);
  date.setUTCMonth(date.getUTCMonth() - months);
  return formatDateKey(date);
}

export function startOfHeatmapWeek(dateKey: ISODate): ISODate {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - day);
  return formatDateKey(date);
}

export function monthLabel(dateKey: ISODate) {
  return new Intl.DateTimeFormat('en', { month: 'short' }).format(parseDateKey(dateKey));
}
