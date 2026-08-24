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

describePostgres('Operações persistentes autenticadas no PostgreSQL', () => {
  afterAll(async () => { await closeDb(); });

  it('executa CRUD autenticado de viagem, despesa e Ordem de Serviço', async () => {
    const admin = await getUserByOpenId('seed-admin');
    expect(admin?.role).toBe('admin');
    const caller = callerFor(admin!);
    const db = await getDb();
    if (!db) throw new Error('TEST_DATABASE_URL não abriu uma conexão PostgreSQL');
    const [traveler] = await db.select().from(travelers).limit(1);
    const [unit] = await db.select().from(units).limit(1);
    const [client] = await db.select().from(clients).limit(1);
    const [expenseType] = await db.select().from(expenseTypes).limit(1);
    expect(traveler && unit && client && expenseType).toBeTruthy();
    const vehicle = await caller.operations.fleet.vehicles.create({ plate: `IT${Date.now()}`.slice(0, 10), brand: 'Toyota', model: 'Integration Test', modelYear: 2024, color: 'Prata', unitId: unit!.id, currentKm: 10000, lastMaintenanceKm: 9000, maintenanceIntervalKm: 10000, fireExtinguisherExpiresOn: null, notes: 'Registro temporário do teste' });

    const tripCode = `IT-${Date.now()}`;
    const trip = await caller.operations.trips.create({ tripCode, travelerId: traveler!.id, clientId: client!.id, unitId: unit!.id, origin: 'São Paulo', destination: 'Asunción', country: 'Paraguai', area: 'Comercial', transport: 'Passagem aérea', startsOn: '2026-09-02', endsOn: '2026-09-05', status: 'Rascunho', requiresFleetVehicle: false, hasAdvance: true, needsHotel: true, advanceAmount: '920.00' });
    expect(trip.tripCode).toBe(tripCode);
    expect((await caller.operations.trips.get({ id: trip.id })).id).toBe(trip.id);

    const expense = await caller.operations.expenses.create({ tripId: trip.id, expenseTypeId: expenseType!.id, occurredOn: '2026-09-03', city: 'Asunción', quantity: '2', unitValue: '80.00', expenseGroup: 'Hospedagem', prepaid: false, billable: true, notes: 'Teste de integração' });
    expect(expense.amount).toBe('160.00');
    const expenseUpdate = await caller.operations.expenses.update({ id: expense!.id, quantity: '1', unitValue: '75.00', notes: 'Atualizado' });
    expect(expenseUpdate.amount).toBe('75.00');
    expect((await caller.operations.expenses.get({ id: expense!.id })).id).toBe(expense!.id);

    const workOrder = await caller.operations.fleet.workOrders.create({ vehicleId: vehicle!.id, reasonId: null, maintenanceType: 'Corretiva', maintenanceDate: '2026-09-06', vehicleKm: vehicle!.currentKm + 1, observation: 'Teste de integração', costAmount: '10.00', status: 'Em andamento' });
    expect(workOrder.vehicleId).toBe(vehicle!.id);
    const workOrderUpdate = await caller.operations.fleet.workOrders.update({ id: workOrder!.id, status: 'Concluída', observation: 'Concluída no teste' });
    expect(workOrderUpdate.status).toBe('Concluída');

    await caller.operations.fleet.workOrders.delete({ id: workOrder!.id });
    await caller.operations.expenses.delete({ id: expense!.id });
    await caller.operations.trips.delete({ id: trip.id });
    await db.delete(vehicles).where(eq(vehicles.id, vehicle.id)).catch(() => undefined);
  });

  it('bloqueia operações administrativas para usuário autenticado não administrador', async () => {
    const user = await getUserByOpenId('seed-approver');
    expect(user?.role).toBe('user');
    await expect(callerFor(user!).operations.fleet.vehicles.list({ page: 1, pageSize: 20, direction: 'asc' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
