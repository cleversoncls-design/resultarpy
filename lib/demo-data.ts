export type Role = 'Viajante' | 'Aprovador' | 'Administrativo';
export type TripStatus = 'Aguardando aprovação' | 'Aprovada' | 'Liberada para viagem' | 'Em prestação' | 'Finalizada' | 'Devolvida';
export type FleetStatus = 'Disponível' | 'Reservado' | 'Em viagem' | 'Realizar manutenção' | 'Em manutenção' | 'Extintor próximo do vencimento' | 'Avaria registrada';
export type FleetEventType = 'Multa' | 'Avaria' | 'Outro';

export type Unit = { id: string; name: string; city: string };
export type Trip = { id: string; destination: string; country: string; client: string; area: string; startDate: string; endDate: string; status: TripStatus; amount: number; hasAdvance: boolean; needsHotel: boolean; transport: string; unitId?: string; requestsFleetVehicle?: boolean };
export type Expense = { id: string; tripId: string; date: string; city: string; client: string; concept: string; group: string; quantity: number; unitValue: number; prepaid: boolean; billable: boolean; limit: number; reviewNote?: string };
export type Vehicle = { id: string; plate: string; brand: string; model: string; year: number; color: string; unitId: string; currentKm: number; lastMaintenanceKm: number; maintenanceIntervalKm: number; extinguisherDue: string; status: FleetStatus; observations?: string };
export type FleetReservation = { id: string; tripId: string; vehicleId?: string; driver: string; startDate: string; endDate: string; status: 'Aguardando veículo' | 'Reservada' | 'Em viagem' | 'Finalizada'; departureKm?: number; returnKm?: number };
export type FleetEvent = { id: string; tripId: string; vehicleId: string; type: FleetEventType; description: string; photos: string[]; createdAt: string };

export const demoUser = { name: 'Mariana Lopes', email: 'mariana.lopes@empresa.com', area: 'Comercial' };
export const units: Unit[] = [
  { id: 'UN-001', name: 'Matriz Curitiba', city: 'Curitiba' },
  { id: 'UN-002', name: 'Filial Oeste', city: 'Foz do Iguaçu' },
];
export const trips: Trip[] = [
  { id: 'TR-2026-031', destination: 'Ciudad del Este', country: 'Paraguai', client: 'AgroNorte S.A.', area: 'Comercial', startDate: '18 ago', endDate: '21 ago', status: 'Em prestação', amount: 1280, hasAdvance: true, needsHotel: true, transport: 'Veículo da frota', unitId: 'UN-001', requestsFleetVehicle: true },
  { id: 'TR-2026-028', destination: 'Asunción', country: 'Paraguai', client: 'Cooperativa Central', area: 'Serviços', startDate: '02 set', endDate: '05 set', status: 'Aguardando aprovação', amount: 920, hasAdvance: true, needsHotel: true, transport: 'Passagem aérea', unitId: 'UN-001', requestsFleetVehicle: false },
  { id: 'TR-2026-019', destination: 'Foz do Iguaçu', country: 'Brasil', client: 'Sem cliente', area: 'Administrativo', startDate: '10 jul', endDate: '12 jul', status: 'Finalizada', amount: 640, hasAdvance: false, needsHotel: false, transport: 'Veículo próprio', unitId: 'UN-002', requestsFleetVehicle: false },
];
export const expenses: Expense[] = [
  { id: 'EX-001', tripId: 'TR-2026-031', date: '18 ago', city: 'Ciudad del Este', client: 'AgroNorte S.A.', concept: 'Alimentação', group: 'Viáticos', quantity: 2, unitValue: 18, prepaid: true, billable: true, limit: 40 },
  { id: 'EX-002', tripId: 'TR-2026-031', date: '18 ago', city: 'Ciudad del Este', client: 'AgroNorte S.A.', concept: 'Combustível', group: 'Quilometragem', quantity: 1, unitValue: 32, prepaid: false, billable: true, limit: 45 },
  { id: 'EX-003', tripId: 'TR-2026-031', date: '19 ago', city: 'Ciudad del Este', client: 'AgroNorte S.A.', concept: 'Hospedagem', group: 'Hospedagem', quantity: 1, unitValue: 86, prepaid: true, billable: false, limit: 80, reviewNote: 'Validar limite por unidade antes do fechamento.' },
];
export const vehicles: Vehicle[] = [
  { id: 'VEI-001', plate: 'ABC1D23', brand: 'Toyota', model: 'Hilux SRX', year: 2023, color: 'Prata', unitId: 'UN-001', currentKm: 74820, lastMaintenanceKm: 65000, maintenanceIntervalKm: 10000, extinguisherDue: '18 set 2026', status: 'Realizar manutenção', observations: 'Uso compartilhado entre Comercial e Operações.' },
  { id: 'VEI-002', plate: 'DEF4G56', brand: 'Chevrolet', model: 'S10 LTZ', year: 2022, color: 'Branco', unitId: 'UN-001', currentKm: 52140, lastMaintenanceKm: 50000, maintenanceIntervalKm: 10000, extinguisherDue: '12 fev 2027', status: 'Disponível' },
  { id: 'VEI-003', plate: 'GHI7J89', brand: 'Fiat', model: 'Toro Volcano', year: 2021, color: 'Cinza', unitId: 'UN-002', currentKm: 89300, lastMaintenanceKm: 85000, maintenanceIntervalKm: 10000, extinguisherDue: '08 set 2026', status: 'Extintor próximo do vencimento' },
];
export const fleetReservations: FleetReservation[] = [
  { id: 'RES-001', tripId: 'TR-2026-031', vehicleId: 'VEI-001', driver: 'Mariana Lopes', startDate: '18 ago', endDate: '21 ago', status: 'Em viagem', departureKm: 74101 },
  { id: 'RES-002', tripId: 'TR-2026-024', driver: 'Carlos Duarte', startDate: '25 ago', endDate: '28 ago', status: 'Aguardando veículo' },
];
export const fleetEvents: FleetEvent[] = [];
export const approvalQueue = [
  { id: 'TR-2026-028', traveler: 'Rafael Benítez', destination: 'Asunción', dates: '02–05 set', client: 'Cooperativa Central', amount: 920, area: 'Serviços' },
  { id: 'TR-2026-026', traveler: 'Lucía Ferreira', destination: 'Encarnación', dates: '26–28 ago', client: 'Bioenergia Sul', amount: 480, area: 'Comercial' },
];
export const adminQueue = [
  { id: 'TR-2026-024', traveler: 'Carlos Duarte', destination: 'Pedro Juan Caballero', status: 'Adiantamento pendente', hotel: true, vehicle: false },
  { id: 'TR-2026-022', traveler: 'Ana Souza', destination: 'Asunción', status: 'Reservar hotel', hotel: true, vehicle: true },
];
export const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
export const parseKm = (value: string) => Number(value.replace(/\D/g, '')) || 0;
export const maintenanceThreshold = (vehicle: Vehicle) => vehicle.lastMaintenanceKm + vehicle.maintenanceIntervalKm;
export const maintenancePercent = (vehicle: Vehicle) => Math.round(((vehicle.currentKm - vehicle.lastMaintenanceKm) / vehicle.maintenanceIntervalKm) * 100);
export const isMaintenanceAlert = (vehicle: Vehicle) => { const target = maintenanceThreshold(vehicle); const tolerance = vehicle.maintenanceIntervalKm * 0.03; return vehicle.currentKm >= target - tolerance && vehicle.currentKm <= target + tolerance; };
export const isExtinguisherNearDue = (dateText: string) => { const match = dateText.match(/(\d{1,2})\s+([A-Za-zç]+)\s+(\d{4})/i); if (!match) return false; const months: Record<string, number> = { jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5, jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11 }; const month = Object.entries(months).find(([key]) => match[2].toLowerCase().startsWith(key))?.[1]; if (month === undefined) return false; const due = new Date(Number(match[3]), month, Number(match[1])); const days = Math.ceil((due.getTime() - Date.now()) / 86400000); return days >= 0 && days <= 30; };
