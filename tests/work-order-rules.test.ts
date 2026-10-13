import { describe, expect, it } from 'vitest';
import { vehicleUpdateForWorkOrder } from '../server/work-order-rules';

const vehicle = (status: string, currentKm = 1000, lastMaintenanceKm = 500) => ({ status, currentKm, lastMaintenanceKm });

describe('vehicleUpdateForWorkOrder', () => {
  it('blocks the vehicle as "Em manutenção" when the OS is in progress', () => {
    expect(vehicleUpdateForWorkOrder({ status: 'Em andamento', vehicleKm: 1200, vehicle: vehicle('Disponível'), hasOtherOpenOrders: false, resetsMaintenanceCycle: true })).toEqual({ currentKm: 1200, status: 'Em manutenção' });
    expect(vehicleUpdateForWorkOrder({ status: 'Em andamento', vehicleKm: 900, vehicle: vehicle('Em viagem'), hasOtherOpenOrders: false, resetsMaintenanceCycle: true })).toEqual({});
  });

  it('records the maintenance KM and releases the vehicle when the OS is concluded', () => {
    expect(vehicleUpdateForWorkOrder({ status: 'Concluída', vehicleKm: 1200, vehicle: vehicle('Em manutenção'), hasOtherOpenOrders: false, resetsMaintenanceCycle: true })).toEqual({ currentKm: 1200, lastMaintenanceKm: 1200, status: 'Disponível' });
    expect(vehicleUpdateForWorkOrder({ status: 'Concluída', vehicleKm: 1200, vehicle: vehicle('Reservado'), hasOtherOpenOrders: false, resetsMaintenanceCycle: true })).toEqual({ currentKm: 1200, lastMaintenanceKm: 1200 });
  });

  it('keeps the vehicle in maintenance while another OS is still open', () => {
    expect(vehicleUpdateForWorkOrder({ status: 'Concluída', vehicleKm: 1000, vehicle: vehicle('Em manutenção'), hasOtherOpenOrders: true, resetsMaintenanceCycle: true })).toEqual({ lastMaintenanceKm: 1000, status: 'Em manutenção' });
  });

  it('cancelling releases only a blocked vehicle without touching KM', () => {
    expect(vehicleUpdateForWorkOrder({ status: 'Cancelada', vehicleKm: 5000, vehicle: vehicle('Em manutenção'), hasOtherOpenOrders: false, resetsMaintenanceCycle: true })).toEqual({ status: 'Disponível' });
    expect(vehicleUpdateForWorkOrder({ status: 'Cancelada', vehicleKm: 5000, vehicle: vehicle('Avaria registrada'), hasOtherOpenOrders: false, resetsMaintenanceCycle: true })).toEqual({});
  });

  it('does not touch the last maintenance KM when the reason does not reset the cycle (e.g. mechanical failure)', () => {
    expect(vehicleUpdateForWorkOrder({ status: 'Concluída', vehicleKm: 1200, vehicle: vehicle('Em manutenção'), hasOtherOpenOrders: false, resetsMaintenanceCycle: false })).toEqual({ currentKm: 1200, status: 'Disponível' });
  });

  it('does not lower KM when an older OS is registered', () => {
    expect(vehicleUpdateForWorkOrder({ status: 'Concluída', vehicleKm: 400, vehicle: vehicle('Disponível'), hasOtherOpenOrders: false, resetsMaintenanceCycle: true })).toEqual({});
  });
});
