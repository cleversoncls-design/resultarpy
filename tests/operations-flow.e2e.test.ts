import { eq } from 'drizzle-orm';
import { describe, expect, it, afterAll } from 'vitest';
import { appRouter } from '../server/routers';
import { closeDb, getDb, getUserByOpenId } from '../server/db';
import type { TrpcContext } from '../server/_core/context';
import { clients, expenseTypes, fleetReservations, fleetWorkOrders, travelers, units, vehicles } from '../drizzle/schema';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
const describePostgres = testDatabaseUrl ? describe : describe.skip;
type CallerUser = NonNullable<TrpcContext['user']>;

function callerFor(user: CallerUser) {
  return appRouter.createCaller({ user, req: {} as TrpcContext['req'], res: {} as TrpcContext['res'] });
}

describePostgres('Fluxo persistente ponta a ponta', () => {
  afterAll(async () => { await closeDb(); });

  it('percorre solicitação, aprovação, gasto, reserva e manutenção', async () => {
    const admin = await getUserByOpenId('seed-admin');
    expect(admin?.role).toBe('admin');
    const caller = callerFor(admin!);
    const db = await getDb();
    if (!db) throw new Error('TEST_DATABASE_URL não abriu uma conexão PostgreSQL');
    const [traveler] = await db.select().from(travelers).limit(1);
    const [unit] = await db.select().from(units).limit(1);
    const [client] = await db.select().from(clients).limit(1);
    const [expenseType] = await db.select().from(expenseTypes).limit(1);
    const approver = await getUserByOpenId('seed-approver');
    expect(traveler && unit && client && expenseType && approver).toBeTruthy();
    const approverCaller = callerFor(approver!);

    const vehicle = await caller.operations.fleet.vehicles.create({ plate: `E2E${Date.now()}`.slice(0, 10), brand: 'Toyota', model: 'Corolla E2E', modelYear: 2024, color: 'Prata', unitId: unit!.id, currentKm: 10000, lastMaintenanceKm: 9000, maintenanceIntervalKm: 10000, fireExtinguisherExpiresOn: '2027-12-31', notes: 'Registro temporário do teste de fluxo' });
    const trip = await caller.operations.trips.create({ tripCode: `E2E-${Date.now()}`, travelerId: traveler!.id, approverId: approver!.id, clientId: client!.id, unitId: unit!.id, origin: 'São Paulo', destination: 'Asunción', country: 'Paraguai', area: 'Comercial', transport: 'Veículo da frota', startsOn: '2026-09-10', endsOn: '2026-09-12', status: 'Aguardando aprovação', requiresFleetVehicle: true, hasAdvance: true, needsHotel: true, advanceAmount: '500.00' });
    expect((await approverCaller.operations.approvals.list({ page: 1, pageSize: 20, direction: 'asc' })).items.some((item) => item.id === trip.id)).toBe(true);
    const approvedTrip = await approverCaller.operations.approvals.decide({ tripId: trip.id, decision: 'Aprovada', comment: 'Aprovado no fluxo E2E' });
    expect(approvedTrip.trip.status).toBe('Aprovada');

    const expense = await caller.operations.expenses.create({ tripId: trip.id, expenseTypeId: expenseType!.id, occurredOn: '2026-09-11', city: 'Asunción', quantity: '2', unitValue: '80.00', expenseGroup: 'Hospedagem', prepaid: false, billable: true, notes: 'Fluxo E2E' });
    expect(expense.amount).toBe('160.00');
    const changedExpense = await caller.operations.expenses.update({ id: expense.id, quantity: '1', unitValue: '75.00', notes: 'Despesa revisada' });
    expect(changedExpense.amount).toBe('75.00');

    const reservation = await caller.operations.fleet.reservations.create({ tripId: trip.id, vehicleId: vehicle.id, driverId: traveler!.id, plannedStartOn: '2026-09-10', plannedEndOn: '2026-09-12', status: 'Reservado' });
    const startedReservation = await caller.operations.fleet.reservations.update({ id: reservation.id, status: 'Em viagem', departureAt: new Date('2026-09-10T08:00:00.000Z'), departureKm: 10010 });
    expect(startedReservation.status).toBe('Em viagem');
    const finalizedReservation = await caller.operations.fleet.reservations.update({ id: reservation.id, status: 'Finalizada', returnAt: new Date('2026-09-12T18:00:00.000Z'), returnKm: 10340 });
    expect(finalizedReservation.returnKm).toBe(10340);

    const workOrder = await caller.operations.fleet.workOrders.create({ vehicleId: vehicle.id, reasonId: null, maintenanceType: 'Corretiva', maintenanceDate: '2026-09-13', vehicleKm: 10340, observation: 'Correção após o fluxo de viagem', costAmount: '250.00', status: 'Em andamento' });
    const finishedWorkOrder = await caller.operations.fleet.workOrders.update({ id: workOrder.id, status: 'Concluída', observation: 'Manutenção finalizada no fluxo E2E' });
    expect(finishedWorkOrder.status).toBe('Concluída');
    expect((await caller.operations.fleet.vehicles.list({ page: 1, pageSize: 20, direction: 'asc' })).items.some((item) => item.id === vehicle.id)).toBe(true);

    await caller.operations.fleet.workOrders.delete({ id: workOrder.id });
    await caller.operations.expenses.delete({ id: expense.id });
    await db.delete(fleetReservations).where(eq(fleetReservations.id, reservation.id));
    await caller.operations.trips.delete({ id: trip.id });
    await db.delete(fleetWorkOrders).where(eq(fleetWorkOrders.vehicleId, vehicle.id));
    await db.delete(vehicles).where(eq(vehicles.id, vehicle.id));
  });
});
