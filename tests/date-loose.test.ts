import { describe, expect, it } from 'vitest';
import { formatDateLoose } from '../lib/date-utils';

describe('formatDateLoose', () => {
  it('formats ISO dates and timestamps as DD/MM/AAAA', () => {
    expect(formatDateLoose('2026-10-13')).toBe('13/10/2026');
    expect(formatDateLoose('2026-10-13T00:00:00.000Z')).toBe('13/10/2026');
    expect(formatDateLoose('2026-10-13 08:30:00')).toBe('13/10/2026');
    expect(formatDateLoose(new Date(Date.UTC(2026, 9, 13)))).toBe('13/10/2026');
  });

  it('keeps unknown values and blanks empty ones', () => {
    expect(formatDateLoose('13/10/2026')).toBe('13/10/2026');
    expect(formatDateLoose(null)).toBe('');
    expect(formatDateLoose(undefined)).toBe('');
    expect(formatDateLoose('')).toBe('');
  });
});
