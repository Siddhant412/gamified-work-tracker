import { isValidTimezone, normalizeTimezone } from '@/src/lib/timezones';

describe('timezone helpers', () => {
  it('validates IANA timezone identifiers', () => {
    expect(isValidTimezone('America/Los_Angeles')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
    expect(isValidTimezone('Not/A_Timezone')).toBe(false);
  });

  it('trims timezone input before persistence', () => {
    expect(normalizeTimezone('  America/New_York  ')).toBe('America/New_York');
  });
});
