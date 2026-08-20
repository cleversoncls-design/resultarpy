import { describe, expect, it } from 'vitest';
import { isMaintenanceAlert, maintenanceThreshold, parseKm, vehicles } from '../lib/demo-data';

describe('fleet rules', () => {
  it('detects maintenance inside the 3 percent tolerance window', () => {
    const vehicle = vehicles[0];
    expect(maintenanceThreshold(vehicle)).toBe(75000);
    expect(isMaintenanceAlert(vehicle)).toBe(true);
  });

  it('parses KM values entered with punctuation', () => {
    expect(parseKm('74.820 km')).toBe(74820);
    expect(parseKm('')).toBe(0);
  });
});
