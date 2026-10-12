import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';
import { closeDb, getDb, getUserByOpenId } from '../server/db';
import type { TrpcContext } from '../server/_core/context';
import { clients, expenseTypes, travelers, units } from '../drizzle/schema';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
const describePostgres = testDatabaseUrl ? describe : describe.skip;
type CallerUser = NonNullable<TrpcContext['user']>;

function callerFor(user: CallerUser) {
  return appRouter.createCaller({ user, req: {} as TrpcContext['req'], res: {} as TrpcContext['res'] });
}

describePostgres('Acompanhante da viagem (PostgreSQL)', () => {
  afterAll(async () => { await closeDb(); });

  it('registra o acompanhante, e gastos para várias pessoas (acompanhante e convidados externos)', async () => {
    const admin = await getUserByOpenId('seed-admin');
    const approver = await getUserByOpenId('seed-approver');
    const caller = callerFor(admin!);
    const db = await getDb();
    if (!db) throw new Error('TEST_DATABASE_URL não abriu uma conexão PostgreSQL');
    const [traveler] = await db.select().from(travelers).limit(1);
    const [unit] = await db.select().from(units).limit(1);
    const [client] = await db.select().from(clients).limit(1);
    const [expenseType] = await db.select().from(expenseTypes).limit(1);
    await db.update(travelers).set({ approverId: approver!.id }).where(eq(travelers.id, traveler!.id));
    const [companion] = await db.insert(travelers).values({ name: `Acompanhante ${Date.now()}`, unitId: unit!.id }).returning();

    const options = await caller.operations.trips.companionOptions();
    expect(options.some((item) => item.id === companion!.id && item.name === companion!.name)).toBe(true);

    const baseTrip = { travelerId: traveler!.id, clientId: client!.id, unitId: unit!.id, origin: 'São Paulo', destination: 'Asunción', country: 'Paraguai', area: 'Comercial', transport: 'Ônibus', startsOn: '2026-11-02', endsOn: '2026-11-05', requiresFleetVehicle: false, hasAdvance: false, needsHotel: false, advanceAmount: '0', status: 'Aguardando aprovação' as const };

    // O acompanhante tem de ser outra pessoa.
    await expect(caller.operations.trips.create({ ...baseTrip, tripCode: `CP-${Date.now()}-a`, companionId: traveler!.id })).rejects.toThrow(/outra pessoa/);

    const trip = await caller.operations.trips.create({ ...baseTrip, tripCode: `CP-${Date.now()}-b`, companionId: companion!.id });
    expect(trip.companionId).toBe(companion!.id);
    const loaded = await caller.operations.trips.get({ id: trip.id });
    expect(loaded.companionName).toBe(companion!.name);

    const expense = { tripId: trip.id, expenseTypeId: expenseType!.id, occurredOn: '2026-11-03', city: 'Asunción', quantity: '1', unitValue: '100.00', prepaid: true, billable: true };
    // O gasto pode atender mais de uma pessoa: acompanhante e convidados externos.
    const lunch = await caller.operations.expenses.create({ ...expense, people: 4, guests: '  Cliente ACME (2) e acompanhante  ' });
    expect(lunch.people).toBe(4);
    expect(lunch.guests).toBe('Cliente ACME (2) e acompanhante');
    const solo = await caller.operations.expenses.create({ ...expense, people: 1, guests: 'ignorado?' });
    expect(solo.people).toBe(1);
    const report = await caller.operations.reports.reimbursement({ page: 1, pageSize: 50, direction: 'asc', tripId: trip.id });
    expect(report.items.find((item) => item.id === lunch.id)?.people).toBe(4);
    expect(report.items.find((item) => item.id === lunch.id)?.guests).toBe('Cliente ACME (2) e acompanhante');

    // Edição: muda o número de pessoas e limpa os nomes.
    const edited = await caller.operations.expenses.update({ id: lunch.id, ...expense, people: 2, guests: '' });
    expect(edited.people).toBe(2);
    expect(edited.guests).toBeNull();

    // Mesmo sem acompanhante cadastrado na viagem, o gasto pode ter convidados externos.
    await caller.operations.trips.update({ id: trip.id, companionId: null });
    const external = await caller.operations.expenses.create({ ...expense, people: 3, guests: 'Cliente X' });
    expect(external.people).toBe(3);
    // Os gastos já lançados não são alterados ao remover o acompanhante.
    const list = await caller.operations.expenses.list({ page: 1, pageSize: 50, direction: 'asc', tripId: trip.id });
    expect(list.items.find((item) => item.id === edited.id)?.people).toBe(2);

    await caller.operations.trips.delete({ id: trip.id });
    await db.delete(travelers).where(eq(travelers.id, companion!.id)).catch(() => undefined);
  });
});
