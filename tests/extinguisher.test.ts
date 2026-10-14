import { describe, expect, it } from 'vitest';
import { extinguisherAlert } from '../lib/extinguisher';

describe('extinguisherAlert', () => {
  const today = '2026-10-13';

  it('flags expired extinguishers', () => {
    expect(extinguisherAlert('2026-10-12', today)).toBe('expired');
    expect(extinguisherAlert('2026-06-30', today)).toBe('expired');
  });

  it('flags extinguishers expiring within one month, including the due date itself', () => {
    expect(extinguisherAlert('2026-10-13', today)).toBe('soon');
    expect(extinguisherAlert('2026-11-13', today)).toBe('soon');
    expect(extinguisherAlert('2026-11-14', today)).toBeNull();
  });

  it('handles month ends and missing dates', () => {
    expect(extinguisherAlert('2026-02-28', '2026-01-31')).toBe('soon');
    expect(extinguisherAlert('2027-01-31', '2026-12-31')).toBe('soon');
    expect(extinguisherAlert(null, today)).toBeNull();
    expect(extinguisherAlert('', today)).toBeNull();
    expect(extinguisherAlert('2027-12-31T00:00:00.000Z', today)).toBeNull();
  });
});
