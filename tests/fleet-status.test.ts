import { describe, expect, it } from 'vitest';
import { effectiveVehicleStatus, localTodayIso } from '../lib/fleet-status';

describe('effectiveVehicleStatus', () => {
  const today = '2026-10-14';
  const reserved = { vehicleId: 7, status: 'Reservada', startDate: '2026-10-12', endDate: '2026-10-16' };

  it('shows Reservado for an available vehicle with a reservation covering today', () => {
    expect(effectiveVehicleStatus('7', 'Disponível', [reserved], today)).toBe('Reservado');
    expect(effectiveVehicleStatus(7, 'Disponível', [{ ...reserved, status: 'Reservado' }], today)).toBe('Reservado');
  });

  it('keeps Disponível when the reservation is in the past, future or for another vehicle', () => {
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, endDate: '2026-10-13' }], today)).toBe('Disponível');
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, startDate: '2026-10-15' }], today)).toBe('Disponível');
    expect(effectiveVehicleStatus('8', 'Disponível', [reserved], today)).toBe('Disponível');
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, vehicleId: undefined }], today)).toBe('Disponível');
  });

  it('ignores cancelled and finished reservations', () => {
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, status: 'Cancelada' }], today)).toBe('Disponível');
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, status: 'Finalizada' }], today)).toBe('Disponível');
  });

  it('shows Em viagem while the reservation has left and not returned', () => {
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, status: 'Em viagem', returnKm: null }], today)).toBe('Em viagem');
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, status: 'Em viagem', returnKm: 100 }], today)).toBe('Disponível');
  });

  it('never overrides maintenance or other physical states', () => {
    expect(effectiveVehicleStatus('7', 'Em manutenção', [reserved], today)).toBe('Em manutenção');
    expect(effectiveVehicleStatus('7', 'Avaria registrada', [reserved], today)).toBe('Avaria registrada');
  });

  it('accepts timestamps as dates', () => {
    expect(effectiveVehicleStatus('7', 'Disponível', [{ ...reserved, startDate: '2026-10-12T00:00:00.000Z', endDate: '2026-10-16T00:00:00.000Z' }], today)).toBe('Reservado');
  });

  it('formats the local date', () => {
    expect(localTodayIso(new Date(2026, 9, 4))).toBe('2026-10-04');
  });
});
