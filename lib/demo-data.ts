export type Role = 'Viajante' | 'Aprovador' | 'Administrativo';
export type TripStatus = 'Aguardando aprovação' | 'Aprovada' | 'Liberada para viagem' | 'Em prestação' | 'Finalizada' | 'Devolvida';

export type Trip = {
  id: string;
  destination: string;
  country: string;
  client: string;
  area: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  amount: number;
  hasAdvance: boolean;
  needsHotel: boolean;
  transport: string;
};

export type Expense = {
  id: string;
  tripId: string;
  date: string;
  city: string;
  client: string;
  concept: string;
  group: string;
  quantity: number;
  unitValue: number;
  prepaid: boolean;
  billable: boolean;
  limit: number;
  reviewNote?: string;
};

export const demoUser = {
  name: 'Mariana Lopes',
  email: 'mariana.lopes@empresa.com',
  area: 'Comercial',
};

export const trips: Trip[] = [
  {
    id: 'TR-2026-031',
    destination: 'Ciudad del Este',
    country: 'Paraguai',
    client: 'AgroNorte S.A.',
    area: 'Comercial',
    startDate: '18 ago',
    endDate: '21 ago',
    status: 'Em prestação',
    amount: 1280,
    hasAdvance: true,
    needsHotel: true,
    transport: 'Veículo da frota',
  },
  {
    id: 'TR-2026-028',
    destination: 'Asunción',
    country: 'Paraguai',
    client: 'Cooperativa Central',
    area: 'Serviços',
    startDate: '02 set',
    endDate: '05 set',
    status: 'Aguardando aprovação',
    amount: 920,
    hasAdvance: true,
    needsHotel: true,
    transport: 'Passagem aérea',
  },
  {
    id: 'TR-2026-019',
    destination: 'Foz do Iguaçu',
    country: 'Brasil',
    client: 'Sem cliente',
    area: 'Administrativo',
    startDate: '10 jul',
    endDate: '12 jul',
    status: 'Finalizada',
    amount: 640,
    hasAdvance: false,
    needsHotel: false,
    transport: 'Veículo próprio',
  },
];

export const expenses: Expense[] = [
  { id: 'EX-001', tripId: 'TR-2026-031', date: '18 ago', city: 'Ciudad del Este', client: 'AgroNorte S.A.', concept: 'Alimentação', group: 'Viáticos', quantity: 2, unitValue: 18, prepaid: true, billable: true, limit: 40 },
  { id: 'EX-002', tripId: 'TR-2026-031', date: '18 ago', city: 'Ciudad del Este', client: 'AgroNorte S.A.', concept: 'Combustível', group: 'Quilometragem', quantity: 1, unitValue: 32, prepaid: false, billable: true, limit: 45 },
  { id: 'EX-003', tripId: 'TR-2026-031', date: '19 ago', city: 'Ciudad del Este', client: 'AgroNorte S.A.', concept: 'Hospedagem', group: 'Hospedagem', quantity: 1, unitValue: 86, prepaid: true, billable: false, limit: 80, reviewNote: 'Validar limite por unidade antes do fechamento.' },
];

export const approvalQueue = [
  { id: 'TR-2026-028', traveler: 'Rafael Benítez', destination: 'Asunción', dates: '02–05 set', client: 'Cooperativa Central', amount: 920, area: 'Serviços' },
  { id: 'TR-2026-026', traveler: 'Lucía Ferreira', destination: 'Encarnación', dates: '26–28 ago', client: 'Bioenergia Sul', amount: 480, area: 'Comercial' },
];

export const adminQueue = [
  { id: 'TR-2026-024', traveler: 'Carlos Duarte', destination: 'Pedro Juan Caballero', status: 'Adiantamento pendente', hotel: true, vehicle: false },
  { id: 'TR-2026-022', traveler: 'Ana Souza', destination: 'Asunción', status: 'Reservar hotel', hotel: true, vehicle: true },
];

export const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
