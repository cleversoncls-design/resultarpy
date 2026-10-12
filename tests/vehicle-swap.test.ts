import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';
import { closeDb, getDb, getUserByOpenId } from '../server/db';
import type { TrpcContext } from '../server/_core/context';
import { clients, travelers, units, vehicles } from '../drizzle/schema';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
const describePostgres = testDatabaseUrl ? describe : describe.skip;
type CallerUser = NonNullable<TrpcContext['user']>;

function callerFor(user: CallerUser) {
  return appRouter.createCaller({ user, req: {} as TrpcContext['req'], res: {} as TrpcContext['res'] });
}

describePostgres('Troca do veículo reservado (PostgreSQL)', () => {
  afterAll(async () => { await closeDb(); });

  it('troca o veículo antes da saída e bloqueia depois que o KM de saída foi registrado', async () => {
    const admin = await getUserByOpenId('seed-admin');
    const approver = await getUserByOpenId('seed-approver');
    const caller = callerFor(admin!);
    const db = await getDb();
    if (!db) throw new Error('TEST_DATABASE_URL não abriu uma conexão PostgreSQL');
    const [traveler] = await db.select().from(travelers).limit(1);
    const [unit] = await db.select().from(units).limit(1);
    const [client] = await db.select().from(clients).limit(1);
    await db.update(travelers).set({ approverId: approver!.id }).where(eq(travelers.id, traveler!.id));
    const stamp = Date.now();
    const baseVehicle = { brand: 'Toyota', modelYear: 2024, color: 'Prata', unitId: unit!.id, currentKm: 10000, lastMaintenanceKm: 9000, maintenanceIntervalKm: 10000, fireExtinguisherExpiresOn: null, notes: 'Registro temporário do teste' };
    const first = await caller.operations.fleet.vehicles.create({ ...baseVehicle, plate: `SA${stamp}`.slice(0, 10), model: 'Troca A' });
    const second = await caller.operations.fleet.vehicles.create({ ...baseVehicle, plate: `SB${stamp}`.slice(0, 10), model: 'Troca B' });

    const trip = await caller.operations.trips.create({ travelerId: traveler!.id, clientId: client!.id, unitId: unit!.id, origin: 'São Paulo', destination: 'Asunción', country: 'Paraguai', area: 'Comercial', transport: 'Veículo da frota', startsOn: '2026-11-02', endsOn: '2026-11-05', requiresFleetVehicle: true, hasAdvance: false, needsHotel: false, advanceAmount: '0', tripCode: `SW-${stamp}`, status: 'Aprovada' });
    const reservation = await caller.operations.fleet.reservations.create({ tripId: trip.id, vehicleId: first.id, driverId: traveler!.id, status: 'Reservada', plannedStartOn: '2026-11-02', plannedEndOn: '2026-11-05' });

    // Antes da saída: o Administrativo corrige o veículo escolhido por engano.
    const swapped = await caller.operations.fleet.reservations.update({ id: reservation!.id, vehicleId: second.id, status: 'Reservada' });
    expect(swapped?.vehicleId).toBe(second.id);
    expect((await caller.operations.fleet.reservations.byTrip({ id: trip.id }))?.vehicleId).toBe(second.id);

    // Com o KM de saída registrado, a troca é recusada.
    await caller.operations.fleet.reservations.update({ id: reservation!.id, departureKm: 10000 });
    await expect(caller.operations.fleet.reservations.update({ id: reservation!.id, vehicleId: first.id })).rejects.toThrow(/já saiu/);
    expect((await caller.operations.fleet.reservations.byTrip({ id: trip.id }))?.vehicleId).toBe(second.id);

    await caller.operations.trips.delete({ id: trip.id });
    await db.delete(vehicles).where(eq(vehicles.id, first.id)).catch(() => undefined);
    await db.delete(vehicles).where(eq(vehicles.id, second.id)).catch(() => undefined);
  });
});
