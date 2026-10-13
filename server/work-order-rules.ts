export type WorkOrderStatusValue = 'Em andamento' | 'Concluída' | 'Cancelada';

// Situações do veículo que existem por causa de manutenção/alerta: ao concluir a OS elas são liberadas.
const RELEASABLE_VEHICLE_STATUSES = ['Em manutenção', 'Realizar Manutenção', 'Avaria registrada', 'Extintor próximo do vencimento'];

export type VehicleUpdateFromWorkOrder = { currentKm?: number; lastMaintenanceKm?: number; status?: 'Disponível' | 'Em manutenção' };

/**
 * Decide como a OS reflete no veículo:
 * - Em andamento: veículo passa a "Em manutenção" (exceto se estiver em viagem).
 * - Concluída: registra o KM da manutenção e libera o veículo (a menos que exista outra OS em andamento).
 * - Cancelada: não mexe no KM; só libera o veículo se ele estava bloqueado e não há outra OS em andamento.
 */
export function vehicleUpdateForWorkOrder(input: { status: WorkOrderStatusValue; vehicleKm: number; vehicle: { status: string; currentKm: number; lastMaintenanceKm: number }; hasOtherOpenOrders: boolean }): VehicleUpdateFromWorkOrder {
  const { status, vehicleKm, vehicle, hasOtherOpenOrders } = input;
  const update: VehicleUpdateFromWorkOrder = {};
  if (status === 'Em andamento') {
    if (vehicleKm > vehicle.currentKm) update.currentKm = vehicleKm;
    if (vehicle.status !== 'Em viagem') update.status = 'Em manutenção';
    return update;
  }
  if (status === 'Concluída') {
    if (vehicleKm > vehicle.currentKm) update.currentKm = vehicleKm;
    if (vehicleKm > vehicle.lastMaintenanceKm) update.lastMaintenanceKm = vehicleKm;
  }
  if (hasOtherOpenOrders) {
    if (vehicle.status !== 'Em viagem' && RELEASABLE_VEHICLE_STATUSES.includes(vehicle.status)) update.status = 'Em manutenção';
  } else if (status === 'Concluída' ? RELEASABLE_VEHICLE_STATUSES.includes(vehicle.status) : vehicle.status === 'Em manutenção') {
    update.status = 'Disponível';
  }
  return update;
}
