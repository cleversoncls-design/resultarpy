import { afterAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { appRouter } from '../server/routers';
import { closeDb, getDb, getUserByOpenId } from '../server/db';
import type { TrpcContext } from '../server/_core/context';
import { travelers, units, vehicles } from '../drizzle/schema';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (testDatabaseUrl) process.env.DATABASE_URL = testDatabaseUrl;
const describePostgres = testDatabaseUrl ? describe : describe.skip;
type CallerUser = NonNullable<TrpcContext['user']>;

function callerFor(user: CallerUser) {
  return appRouter.createCaller({ user, req: {} as TrpcContext['req'], res: {} as TrpcContext['res'] });
}

describePostgres('KM rodado no faturamento (PostgreSQL)', () => {
  afterAll(async () => { await closeDb(); });

  it('gera a linha de quilometragem (km x tarifa do cliente) quando o KM final é informado', async () => {
    const admin = await getUserByOpenId('seed-admin');
    const approver = await getUserByOpenId('seed-approver');
    const caller = callerFor(admin!);
    const db = await getDb();
    if (!db) throw new Error('TEST_DATABASE_URL não abriu uma conexão PostgreSQL');
    const [traveler] = await db.select().from(travelers).limit(1);
    const [unit] = await db.select().from(units).limit(1);
    await db.update(travelers).set({ approverId: approver!.id }).where(eq(travelers.id, traveler!.id));
    const stamp = Date.now();

    // Cliente com tarifa de 0,50 USD por KM (aceita vírgula).
    const client = await caller.catalogs.clients.create({ name: `Cliente KM ${stamp}`, billingCurrency: 'USD', kmRate: '0,50', kmRateCurrency: 'usd' });
    expect(Number(client!.kmRate)).toBe(0.5);
    expect(client!.kmRateCurrency).toBe('USD');
    // Tarifa inválida é recusada.
    await expect(caller.catalogs.clients.update({ id: client!.id, kmRate: '-1' })).rejects.toThrow(/maior que zero/);

    const vehicle = await caller.operations.fleet.vehicles.create({ brand: 'Toyota', modelYear: 2024, color: 'Prata', unitId: unit!.id, currentKm: 10000, lastMaintenanceKm: 9000, maintenanceIntervalKm: 10000, fireExtinguisherExpiresOn: null, notes: 'Registro temporário do teste', plate: `KM${stamp}`.slice(0, 10), model: 'Faturamento KM' });
    const trip = await caller.operations.trips.create({ travelerId: traveler!.id, clientId: client!.id, unitId: unit!.id, origin: 'São Paulo', destination: 'Asunción', country: 'Paraguai', area: 'Comercial', transport: 'Veículo da frota', startsOn: '2026-11-02', endsOn: '2026-11-05', requiresFleetVehicle: true, hasAdvance: false, needsHotel: false, advanceAmount: '0', tripCode: `KM-${stamp}`, status: 'Aprovada' });
    const reservation = await caller.operations.fleet.reservations.create({ tripId: trip.id, vehicleId: vehicle.id, driverId: traveler!.id, status: 'Reservada', plannedStartOn: '2026-11-02', plannedEndOn: '2026-11-05' });
    // A placa do veículo da reserva sai junto da viagem (cabeçalhos dos relatórios).
    expect((await caller.operations.trips.get({ id: trip.id })).vehiclePlate).toBe(vehicle.plate);
    const billing = () => caller.operations.reports.billing({ page: 1, pageSize: 50, direction: 'asc', tripId: trip.id });

    // Só com o KM de saída, ainda não há o que faturar.
    await caller.operations.fleet.reservations.update({ id: reservation!.id, departureKm: 10000 });
    expect((await billing()).items.filter((item) => item.kind === 'km')).toHaveLength(0);

    // Com o KM final: 320 km x 0,50 USD = 160 USD.
    await caller.operations.fleet.reservations.update({ id: reservation!.id, returnKm: 10320 });
    const km = (await billing()).items.filter((item) => item.kind === 'km');
    expect(km).toHaveLength(1);
    expect(km[0]!.id).toBe(-reservation!.id);
    expect(km[0]!.quantity).toBe('320');
    expect(km[0]!.sourceCurrency).toBe('USD');
    expect(Number(km[0]!.sourceAmount)).toBe(160);
    expect(km[0]!.billable).toBeGreaterThan(0);
    expect(km[0]!.difference).toBe(0);
    expect(km[0]!.expenseTypeName).toMatch(/^Quilometragem/);

    // Cliente sem tarifa: nenhuma linha de KM.
    await caller.catalogs.clients.update({ id: client!.id, kmRate: null });
    expect((await billing()).items.filter((item) => item.kind === 'km')).toHaveLength(0);

    await caller.operations.trips.delete({ id: trip.id });
    await db.delete(vehicles).where(eq(vehicles.id, vehicle.id)).catch(() => undefined);
  });
});
