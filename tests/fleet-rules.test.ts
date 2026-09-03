import { describe, expect, it } from 'vitest';
import { isMaintenanceAlert, maintenanceThreshold, parseKm, type Vehicle } from '../lib/demo-data';

const maintenanceFixture: Vehicle = {
  id: 'fixture-vehicle', plate: 'ABC-0000', brand: 'Marca teste', model: 'Modelo teste', year: 2026, color: 'Branco', unitId: 'fixture-unit', currentKm: 74820, lastMaintenanceKm: 65000, maintenanceIntervalKm: 10000, extinguisherDue: '2027-01-01', status: 'Realizar manutenção',
};

describe('fleet rules', () => {
  it('detects maintenance inside the 3 percent tolerance window', () => {
    expect(maintenanceThreshold(maintenanceFixture)).toBe(75000);
    expect(isMaintenanceAlert(maintenanceFixture)).toBe(true);
  });

  it('parses KM values entered with punctuation', () => {
    expect(parseKm('74.820 km')).toBe(74820);
    expect(parseKm('')).toBe(0);
  });
});
