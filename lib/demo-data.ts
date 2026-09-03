import { formatCurrency } from './currency';
export { formatCurrency } from './currency';

/** Contratos legados mantidos temporariamente para compatibilidade dos módulos em migração. */
export type Role = 'Viajante' | 'Aprovador' | 'Administrativo';
export type TripStatus = 'Aguardando aprovação' | 'Aprovada' | 'Liberada para viagem' | 'Em prestação' | 'Finalizada' | 'Devolvida';
export type FleetStatus = 'Disponível' | 'Reservado' | 'Em viagem' | 'Realizar manutenção' | 'Em manutenção' | 'Extintor próximo do vencimento' | 'Avaria registrada';
export type FleetEventType = 'Multa' | 'Avaria' | 'Outro';

export type Unit = { id: string; name: string; city: string };
export type Trip = { id: string; destination: string; country: string; client: string; area: string; startDate: string; endDate: string; status: TripStatus; amount: number; hasAdvance: boolean; needsHotel: boolean; transport: string; unitId?: string; requestsFleetVehicle?: boolean };
export type Expense = { id: string; tripId: string; date: string; city: string; client: string; concept: string; group: string; quantity: number; unitValue: number; prepaid: boolean; billable: boolean; limit: number; reviewNote?: string };
export type ReimbursementLimit = { id: string; city: string; concept: string; limitPerEvent: number; active: boolean };
export type Vehicle = { id: string; plate: string; brand: string; model: string; year: number; color: string; unitId: string; currentKm: number; lastMaintenanceKm: number; maintenanceIntervalKm: number; extinguisherDue: string; status: FleetStatus; observations?: string };
export type FleetReservation = { id: string; tripId: string; vehicleId?: string; driver: string; startDate: string; endDate: string; status: 'Aguardando veículo' | 'Reservada' | 'Em viagem' | 'Finalizada'; departureKm?: number; returnKm?: number };
export type FleetEvent = { id: string; tripId: string; vehicleId: string; type: FleetEventType; description: string; photos: string[]; createdAt: string };
export type MaintenanceKind = 'Preventiva' | 'Corretiva';
export type MaintenanceReason = { id: string; name: string; description: string; active: boolean };
export type FleetWorkOrder = { id: string; vehicleId: string; km: number; maintenanceDate: string; observation: string; cost: number; status: 'Concluída' | 'Em andamento'; kind: MaintenanceKind; reasonId: string };

/** O banco é a única fonte de dados de produção; estes arrays permanecem vazios por compatibilidade. */
export const demoUser = null;
export const units: Unit[] = [];
export const trips: Trip[] = [];
export const reimbursementLimits: ReimbursementLimit[] = [];
export const expenses: Expense[] = [];
export const vehicles: Vehicle[] = [];
export const fleetReservations: FleetReservation[] = [];
export const fleetEvents: FleetEvent[] = [];
export const maintenanceReasons: MaintenanceReason[] = [];
export const fleetWorkOrders: FleetWorkOrder[] = [];
export const approvalQueue: Array<{ id: string; traveler: string; destination: string; dates: string; client: string; amount: number; area: string }> = [];
export const adminQueue: Array<{ id: string; traveler: string; destination: string; status: string; hotel: boolean; vehicle: boolean }> = [];

export const parseKm = (value: string) => Number(value.replace(/\D/g, '')) || 0;
export const maintenanceThreshold = (vehicle: Vehicle) => vehicle.lastMaintenanceKm + vehicle.maintenanceIntervalKm;
export const maintenancePercent = (vehicle: Vehicle) => Math.round(((vehicle.currentKm - vehicle.lastMaintenanceKm) / vehicle.maintenanceIntervalKm) * 100);
export const clientBillableAmountFor = (expense: Expense) => Math.min(expense.quantity * expense.unitValue, expense.limit * expense.quantity);
export const clientBillingDifferenceFor = (expense: Expense) => expense.quantity * expense.unitValue - expense.limit * expense.quantity;
export const reimbursementLimitFor = (expense: Expense) => reimbursementLimits.find((item) => item.city === expense.city && item.concept === expense.concept)?.limitPerEvent ?? expense.limit;
export const reimbursementAmountFor = (expense: Expense) => Math.min(expense.quantity * expense.unitValue, reimbursementLimitFor(expense));
export const reimbursementExcessFor = (expense: Expense) => Math.max(0, expense.quantity * expense.unitValue - reimbursementLimitFor(expense));
export const isMaintenanceAlert = (vehicle: Vehicle) => { const target = maintenanceThreshold(vehicle); const tolerance = vehicle.maintenanceIntervalKm * 0.03; return vehicle.currentKm >= target - tolerance && vehicle.currentKm <= target + tolerance; };
export const isExtinguisherNearDue = (_dateText: string) => false;
