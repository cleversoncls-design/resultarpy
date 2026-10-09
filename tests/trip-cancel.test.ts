import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';
import { closeDb, getDb, getUserByOpenId } from '../server/db';
import type { TrpcContext } from '../server/_core/context';
import { clients, expenseTypes, travelers, units, vehicles } from '../drizzle/schema';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
const describePostgres = testDatabaseUrl ? describe : describe.skip;
type CallerUser = NonNullable<TrpcContext['user']>;

function callerFor(user: CallerUser) {
  return appRouter.createCaller({ user, req: {} as TrpcContext['req'], res: {} as TrpcContext['res'] });
}

describePostgres('Cancelamento de viagem (PostgreSQL)', () => {
  afterAll(async () => { await closeDb(); });

  it('cancela com motivo, libera a reserva do veículo e trava a viagem', async () => {
    const admin = await getUserByOpenId('seed-admin');
    const approver = await getUserByOpenId('seed-approver');
    expect(admin?.role).toBe('admin');
    const caller = callerFor(admin!);
    const db = await getDb();
    if (!db) throw new Error('TEST_DATABASE_URL não abriu uma conexão PostgreSQL');
    const [traveler] = await db.select().from(travelers).limit(1);
    const [unit] = await db.select().from(units).limit(1);
    const [client] = await db.select().from(clients).limit(1);
    const [expenseType] = await db.select().from(expenseTypes).limit(1);
    expect(traveler && unit && client && expenseType && approver).toBeTruthy();
    // Criar viagem exige aprovador padrão no cadastro do viajante (o mesmo
    // valor que os outros testes gravam, então rodar em paralelo não conflita).
    await db.update(travelers).set({ approverId: approver!.id }).where(eq(travelers.id, traveler!.id));
    const vehicle = await caller.operations.fleet.vehicles.create({ plate: `CX${Date.now()}`.slice(0, 10), brand: 'Toyota', model: 'Cancel Test', modelYear: 2024, color: 'Prata', unitId: unit!.id, currentKm: 10000, lastMaintenanceKm: 9000, maintenanceIntervalKm: 10000, fireExtinguisherExpiresOn: null, notes: 'Registro temporário do teste' });

    const baseTrip = { travelerId: traveler!.id, clientId: client!.id, unitId: unit!.id, origin: 'São Paulo', destination: 'Asunción', country: 'Paraguai', area: 'Comercial', transport: 'Veículo da frota', startsOn: '2026-11-02', endsOn: '2026-11-05', requiresFleetVehicle: true, hasAdvance: false, needsHotel: false, advanceAmount: '0' };
    const trip = await caller.operations.trips.create({ ...baseTrip, tripCode: `CX-${Date.now()}`, status: 'Aguardando aprovação' });
    const reservation = await caller.operations.fleet.reservations.create({ tripId: trip.id, vehicleId: vehicle.id, driverId: traveler!.id, status: 'Reservada', plannedStartOn: baseTrip.startsOn, plannedEndOn: baseTrip.endsOn });
    expect(reservation?.status).toBe('Reservada');

    // O motivo é obrigatório.
    await expect(caller.operations.trips.cancel({ id: trip.id, reason: '  ab ' })).rejects.toThrow(/motivo/i);

    const cancelled = await caller.operations.trips.cancel({ id: trip.id, reason: 'Cliente adiou a visita' });
    expect(cancelled.status).toBe('Cancelada');
    expect(cancelled.cancelReason).toBe('Cliente adiou a visita');
    expect(cancelled.cancelledAt).toBeTruthy();
    expect(cancelled.cancelledByUserId).toBe(admin!.id);

    // A reserva do veículo é liberada, mas continua no histórico.
    const afterReservation = await caller.operations.fleet.reservations.byTrip({ id: trip.id });
    expect(afterReservation?.status).toBe('Cancelada');
    expect(afterReservation?.vehicleId).toBe(vehicle.id);

    // Aparece no filtro por status e não pode ser cancelada de novo.
    const listed = await caller.operations.trips.list({ page: 1, pageSize: 100, direction: 'desc', status: 'Cancelada', mine: false });
    expect(listed.items.some((item) => item.id === trip.id)).toBe(true);
    await expect(caller.operations.trips.cancel({ id: trip.id, reason: 'Outra vez' })).rejects.toThrow(/já foi cancelada/);

    // Depois de cancelada, nada mais muda: edição, decisão do aprovador e despesas.
    await expect(caller.operations.trips.update({ id: trip.id, destination: 'Outro destino' })).rejects.toThrow(/cancelada/);
    await expect(caller.operations.approvals.decide({ tripId: trip.id, decision: 'Aprovada', comment: 'Aprovando mesmo assim' })).rejects.toThrow();
    await expect(caller.operations.expenses.create({ tripId: trip.id, expenseTypeId: expenseType!.id, occurredOn: '2026-11-03', city: 'Asunción', quantity: '1', unitValue: '10.00', prepaid: false, billable: true })).rejects.toThrow(/cancelada/);
    expect((await caller.operations.trips.get({ id: trip.id })).status).toBe('Cancelada');

    await caller.operations.trips.delete({ id: trip.id });
    await db.delete(vehicles).where(eq(vehicles.id, vehicle.id)).catch(() => undefined);
  });

  it('não cancela viagem que já começou (Em prestação)', async () => {
    const admin = await getUserByOpenId('seed-admin');
    const approver = await getUserByOpenId('seed-approver');
    const caller = callerFor(admin!);
    const db = await getDb();
    if (!db) throw new Error('TEST_DATABASE_URL não abriu uma conexão PostgreSQL');
    const [traveler] = await db.select().from(travelers).limit(1);
    const [unit] = await db.select().from(units).limit(1);
    const [client] = await db.select().from(clients).limit(1);
    await db.update(travelers).set({ approverId: approver!.id }).where(eq(travelers.id, traveler!.id));
    const trip = await caller.operations.trips.create({ travelerId: traveler!.id, clientId: client!.id, unitId: unit!.id, origin: 'São Paulo', destination: 'Asunción', country: 'Paraguai', area: 'Comercial', transport: 'Ônibus', startsOn: '2026-11-02', endsOn: '2026-11-05', requiresFleetVehicle: false, hasAdvance: false, needsHotel: false, advanceAmount: '0', tripCode: `CY-${Date.now()}`, status: 'Em prestação' });
    await expect(caller.operations.trips.cancel({ id: trip.id, reason: 'Tentando cancelar tarde' })).rejects.toThrow(/Não é possível cancelar/);
    expect((await caller.operations.trips.get({ id: trip.id })).status).toBe('Em prestação');
    await caller.operations.trips.delete({ id: trip.id });
  });
});
