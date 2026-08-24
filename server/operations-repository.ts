import { and, asc, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { getDb } from './db';
import { fleetEvents, fleetReservations, fleetWorkOrders, tripExpenses, trips, vehicles } from '../drizzle/schema';

export type PageInput = { page: number; pageSize: number; search?: string; direction?: 'asc' | 'desc' };

function requireDb() {
  return getDb().then((db) => {
    if (!db) throw new Error('PostgreSQL database is not available for this operation');
    return db;
  });
}

function page(input: PageInput) {
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  return { limit: pageSize, offset: Math.max(input.page - 1, 0) * pageSize };
}

export async function listTrips(input: PageInput & { status?: string; travelerId?: number }) {
  const db = await requireDb();
  const filters = [input.search ? or(ilike(trips.tripCode, `%${input.search}%`), ilike(trips.destination, `%${input.search}%`)) : undefined, input.status ? eq(trips.status, input.status as typeof trips.status.enumValues[number]) : undefined, input.travelerId ? eq(trips.travelerId, input.travelerId) : undefined].filter(Boolean);
  const paging = page(input);
  const items = await db.select().from(trips).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(trips.startsOn) : asc(trips.startsOn)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(trips).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total };
}

export async function createTrip(input: typeof trips.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(trips).values(input).returning();
  return created;
}

export async function listTripExpenses(tripId: number | undefined, input: PageInput) {
  const db = await requireDb();
  const filters = [tripId ? eq(tripExpenses.tripId, tripId) : undefined, input.search ? or(ilike(tripExpenses.city, `%${input.search}%`), ilike(tripExpenses.notes, `%${input.search}%`)) : undefined].filter(Boolean);
  const paging = page(input);
  const items = await db.select().from(tripExpenses).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(tripExpenses.occurredOn) : asc(tripExpenses.occurredOn)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(tripExpenses).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total };
}

export async function createTripExpense(input: typeof tripExpenses.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(tripExpenses).values(input).returning();
  return created;
}

export async function listVehicles(input: PageInput & { status?: string }) {
  const db = await requireDb();
  const filters = [input.status ? eq(vehicles.status, input.status as typeof vehicles.status.enumValues[number]) : undefined, input.search ? or(ilike(vehicles.plate, `%${input.search}%`), ilike(vehicles.brand, `%${input.search}%`), ilike(vehicles.model, `%${input.search}%`)) : undefined].filter(Boolean);
  const paging = page(input);
  const items = await db.select().from(vehicles).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(vehicles.createdAt) : asc(vehicles.createdAt)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(vehicles).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total };
}

export async function createVehicle(input: typeof vehicles.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(vehicles).values(input).returning();
  return created;
}

export async function updateVehicle(id: number, input: Partial<typeof vehicles.$inferInsert>) {
  const db = await requireDb();
  const [updated] = await db.update(vehicles).set(input).where(eq(vehicles.id, id)).returning();
  return updated;
}

export async function listFleetReservations(input: PageInput & { status?: string }) {
  const db = await requireDb();
  const filters = [input.status ? eq(fleetReservations.status, input.status as typeof fleetReservations.status.enumValues[number]) : undefined].filter(Boolean);
  const paging = page(input);
  const items = await db.select().from(fleetReservations).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(fleetReservations.plannedStartOn) : asc(fleetReservations.plannedStartOn)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(fleetReservations).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total };
}

export async function createFleetReservation(input: typeof fleetReservations.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(fleetReservations).values(input).returning();
  return created;
}

export async function updateFleetReservation(id: number, input: Partial<typeof fleetReservations.$inferInsert>) {
  const db = await requireDb();
  const [updated] = await db.update(fleetReservations).set(input).where(eq(fleetReservations.id, id)).returning();
  return updated;
}

export async function listFleetEvents(reservationId: number | undefined, input: PageInput) {
  const db = await requireDb();
  const filters = reservationId ? [eq(fleetEvents.reservationId, reservationId)] : [];
  const paging = page(input);
  const items = await db.select().from(fleetEvents).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(fleetEvents.createdAt) : asc(fleetEvents.createdAt)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(fleetEvents).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total };
}

export async function createFleetEvent(input: typeof fleetEvents.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(fleetEvents).values(input).returning();
  return created;
}

export async function listWorkOrders(input: PageInput & { vehicleId?: number; maintenanceType?: string; from?: string; to?: string }) {
  const db = await requireDb();
  const filters = [input.vehicleId ? eq(fleetWorkOrders.vehicleId, input.vehicleId) : undefined, input.maintenanceType ? eq(fleetWorkOrders.maintenanceType, input.maintenanceType as typeof fleetWorkOrders.maintenanceType.enumValues[number]) : undefined, input.from ? gte(fleetWorkOrders.maintenanceDate, input.from) : undefined, input.to ? lte(fleetWorkOrders.maintenanceDate, input.to) : undefined].filter(Boolean);
  const paging = page(input);
  const items = await db.select().from(fleetWorkOrders).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(fleetWorkOrders.maintenanceDate) : asc(fleetWorkOrders.maintenanceDate)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(fleetWorkOrders).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total };
}

export async function createWorkOrder(input: typeof fleetWorkOrders.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(fleetWorkOrders).values(input).returning();
  if (created) await updateVehicle(created.vehicleId, { currentKm: created.vehicleKm, lastMaintenanceKm: created.vehicleKm, status: 'Disponível' });
  return created;
}
