import { getApplicationStats, heatmapLevel } from '@/src/lib/stats';
import type { DailyApplicationCount } from '@/src/types/domain';

describe('application stats', () => {
  const counts: DailyApplicationCount[] = [
    { activityDate: '2026-04-25', count: 4 },
    { activityDate: '2026-04-26', count: 0 },
    { activityDate: '2026-04-27', count: 6 },
  ];

  it('uses calendar days from tracking start through today for average pace', () => {
    expect(getApplicationStats(counts, '2026-04-27', '2026-04-25')).toEqual({
      total: 10,
      today: 6,
      averagePerDay: 10 / 3,
      activeDays: 2,
      bestDay: 6,
      currentStreak: 1,
    });
  });

  it('computes current streak from today backward', () => {
    expect(
      getApplicationStats(
        [
          { activityDate: '2026-04-24', count: 1 },
          { activityDate: '2026-04-25', count: 3 },
          { activityDate: '2026-04-26', count: 2 },
          { activityDate: '2026-04-27', count: 5 },
        ],
        '2026-04-27',
        '2026-04-24',
      ).currentStreak,
    ).toBe(4);
  });

  it('assigns stable heatmap intensity buckets', () => {
    expect([0, 1, 3, 8, 12, 21, 31].map(heatmapLevel)).toEqual([
      0, 1, 2, 3, 4, 5, 6,
    ]);
  });
});
