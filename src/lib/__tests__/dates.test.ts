import {
  addDays,
  diffDaysInclusive,
  enumerateDateKeys,
  startOfHeatmapWeek,
  subtractMonths,
  toLocalDateKey,
} from '@/src/lib/dates';

describe('date helpers', () => {
  it('resolves date keys in a supplied timezone', () => {
    const instant = new Date('2026-04-27T06:30:00.000Z');

    expect(toLocalDateKey(instant, 'America/Los_Angeles')).toBe('2026-04-26');
    expect(toLocalDateKey(instant, 'UTC')).toBe('2026-04-27');
  });

  it('enumerates inclusive date ranges', () => {
    expect(enumerateDateKeys('2026-04-25', '2026-04-27')).toEqual([
      '2026-04-25',
      '2026-04-26',
      '2026-04-27',
    ]);
  });

  it('adds days and computes inclusive day differences', () => {
    expect(addDays('2026-04-27', 1)).toBe('2026-04-28');
    expect(diffDaysInclusive('2026-04-25', '2026-04-27')).toBe(3);
  });

  it('aligns heatmap ranges to a Sunday week start', () => {
    expect(startOfHeatmapWeek('2026-04-27')).toBe('2026-04-26');
  });

  it('subtracts calendar months for range controls', () => {
    expect(subtractMonths('2026-04-27', 3)).toBe('2026-01-27');
  });
});
