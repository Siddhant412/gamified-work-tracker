import type { DailyApplicationCount, ISODate } from '@/src/types/domain';

import { diffDaysInclusive } from './dates';

export type ApplicationStats = {
  total: number;
  today: number;
  averagePerDay: number;
  activeDays: number;
  bestDay: number;
  currentStreak: number;
};

export function countByDate(counts: DailyApplicationCount[]) {
  return counts.reduce<Record<string, number>>((acc, item) => {
    acc[item.activityDate] = item.count;
    return acc;
  }, {});
}

export function getApplicationStats(
  counts: DailyApplicationCount[],
  today: ISODate,
  trackingStartedOn: ISODate,
): ApplicationStats {
  const total = counts.reduce((sum, item) => sum + item.count, 0);
  const todayCount = counts.find((item) => item.activityDate === today)?.count ?? 0;
  const daysTracked = diffDaysInclusive(trackingStartedOn, today);
  const activeDays = counts.filter((item) => item.count > 0).length;
  const bestDay = counts.reduce((best, item) => Math.max(best, item.count), 0);

  return {
    total,
    today: todayCount,
    averagePerDay: total / daysTracked,
    activeDays,
    bestDay,
    currentStreak: getCurrentStreak(counts, today),
  };
}

export function getCurrentStreak(counts: DailyApplicationCount[], today: ISODate) {
  const countsMap = countByDate(counts);
  let streak = 0;
  let cursor = today;

  while ((countsMap[cursor] ?? 0) > 0) {
    streak += 1;
    const date = new Date(`${cursor}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    cursor = date.toISOString().slice(0, 10) as ISODate;
  }

  return streak;
}

export function heatmapLevel(count: number) {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  if (count <= 20) return 4;
  if (count <= 30) return 5;
  return 6;
}
