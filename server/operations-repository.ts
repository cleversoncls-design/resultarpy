import { and, asc, count, desc, eq, gte, ilike, lte, or } from 'drizzle-orm';
import { getDb } from './db';
import { fleetEvents, fleetReservations, fleetWorkOrders, travelers, tripApprovals, tripExpenses, trips, users, vehicles } from '../drizzle/schema';

export type PageInput = { page: number; pageSize: number; search?: string; direction?: 'asc' | 'desc' };
type Scope = { userId?: number; admin?: boolean };

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error('PostgreSQL database is not available for this operation');
  return db;
}

function page(input: PageInput) {
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  return { limit: pageSize, offset: Math.max(input.page - 1, 0) * pageSize };
}

export async function findTravelerIdByUserId(userId: number) {
  const db = await requireDb();
  const [traveler] = await db.select({ id: travelers.id }).from(travelers).where(eq(travelers.userId, userId)).limit(1);
  return traveler?.id;
}

export async function listTrips(input: PageInput & { status?: string; travelerId?: number; userId?: number }) {
  const db = await requireDb();
  const filters = [
    input.search ? or(ilike(trips.tripCode, `%${input.search}%`), ilike(trips.destination, `%${input.search}%`)) : undefined,
    input.status ? eq(trips.status, input.status as typeof trips.status.enumValues[number]) : undefined,
    input.travelerId ? eq(trips.travelerId, input.travelerId) : undefined,
    input.userId ? eq(travelers.userId, input.userId) : undefined,
  ].filter(Boolean);
  const paging = page(input);
  const query = db.select({ trip: trips }).from(trips).leftJoin(travelers, eq(trips.travelerId, travelers.id));
  const rows = await query.where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(trips.startsOn) : asc(trips.startsOn)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(trips).leftJoin(travelers, eq(trips.travelerId, travelers.id)).where(filters.length ? and(...filters) : undefined);
  return { items: rows.map(({ trip }) => trip), page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

export async function getTrip(id: number, scope: Scope = {}) {
  const db = await requireDb();
  const filters = [eq(trips.id, id), scope.admin ? undefined : scope.userId ? eq(travelers.userId, scope.userId) : undefined].filter(Boolean);
  const [row] = await db.select({ trip: trips }).from(trips).leftJoin(travelers, eq(trips.travelerId, travelers.id)).where(and(...filters)).limit(1);
  return row?.trip;
}

export async function createTrip(input: typeof trips.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(trips).values(input).returning();
  return created;
}

export async function updateTrip(id: number, input: Partial<typeof trips.$inferInsert>, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(id, scope))) return undefined;
  const [updated] = await db.update(trips).set(input).where(eq(trips.id, id)).returning();
  return updated;
}

export async function deleteTrip(id: number, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(id, scope))) return undefined;
  const [deleted] = await db.delete(trips).where(eq(trips.id, id)).returning({ id: trips.id });
  return deleted;
}

export async function listTripApprovals(input: PageInput & { userId?: number; admin?: boolean }) {
  const db = await requireDb();
  const filters = [
    eq(trips.status, 'Aguardando aprovação'),
    input.admin ? undefined : input.userId ? eq(trips.approverId, input.userId) : undefined,
    input.search ? or(ilike(trips.tripCode, `%${input.search}%`), ilike(trips.destination, `%${input.search}%`)) : undefined,
  ].filter(Boolean);
  const paging = page(input);
  const rows = await db.select({ trip: trips }).from(trips).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(trips.createdAt) : asc(trips.createdAt)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(trips).where(filters.length ? and(...filters) : undefined);
  return { items: rows.map(({ trip }) => trip), page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

export type ApprovalHistoryFilters = {
  decision?: typeof tripApprovals.decision.enumValues[number];
  from?: string;
  to?: string;
};

export async function listTripApprovalHistory(tripId: number, scope: Scope = {}, filters: ApprovalHistoryFilters = {}) {
  const db = await requireDb();
  const [tripAccess] = await db.select({ tripId: trips.id, approverId: trips.approverId, travelerUserId: travelers.userId }).from(trips).leftJoin(travelers, eq(trips.travelerId, travelers.id)).where(eq(trips.id, tripId)).limit(1);
  if (!tripAccess || (!scope.admin && scope.userId !== tripAccess.approverId && scope.userId !== tripAccess.travelerUserId)) return undefined;
  const historyFilters = [
    eq(tripApprovals.tripId, tripId),
    filters.decision ? eq(tripApprovals.decision, filters.decision) : undefined,
    filters.from ? gte(tripApprovals.decidedAt, new Date(`${filters.from}T00:00:00.000Z`)) : undefined,
    filters.to ? lte(tripApprovals.decidedAt, new Date(`${filters.to}T23:59:59.999Z`)) : undefined,
  ].filter(Boolean);
  const rows = await db.select({ approval: tripApprovals, approverName: users.name, approverEmail: users.email }).from(tripApprovals).leftJoin(users, eq(tripApprovals.approverId, users.id)).where(and(...historyFilters)).orderBy(desc(tripApprovals.decidedAt));
  return rows.map(({ approval, approverName, approverEmail }) => ({ ...approval, approverName: approverName ?? approverEmail ?? 'Usuário' }));
}

export async function decideTripApproval(input: { tripId: number; approverId: number; decision: typeof tripApprovals.decision.enumValues[number]; comment?: string | null }, admin = false) {
  const db = await requireDb();
  const [trip] = await db.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
  if (!trip || (!admin && trip.approverId !== input.approverId)) return undefined;
  if (trip.status !== 'Aguardando aprovação') return undefined;
  return db.transaction(async (tx) => {
    const [approval] = await tx.insert(tripApprovals).values({ tripId: input.tripId, approverId: input.approverId, decision: input.decision, comment: input.comment ?? null }).onConflictDoUpdate({ target: [tripApprovals.tripId, tripApprovals.approverId], set: { decision: input.decision, comment: input.comment ?? null, decidedAt: new Date() } }).returning();
    const [updatedTrip] = await tx.update(trips).set({ status: input.decision === 'Aprovada' ? 'Aprovada' : input.decision === 'Rejeitada' ? 'Rejeitada' : 'Devolvida' }).where(eq(trips.id, input.tripId)).returning();
    return { approval, trip: updatedTrip };
  });
}

export async function listTripExpenses(tripId: number | undefined, input: PageInput & { userId?: number }) {
  const db = await requireDb();
  const filters = [
    tripId ? eq(tripExpenses.tripId, tripId) : undefined,
    input.search ? or(ilike(tripExpenses.city, `%${input.search}%`), ilike(tripExpenses.notes, `%${input.search}%`)) : undefined,
    input.userId ? eq(travelers.userId, input.userId) : undefined,
  ].filter(Boolean);
  const paging = page(input);
  const rows = await db.select({ expense: tripExpenses }).from(tripExpenses).innerJoin(trips, eq(tripExpenses.tripId, trips.id)).leftJoin(travelers, eq(trips.travelerId, travelers.id)).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(tripExpenses.occurredOn) : asc(tripExpenses.occurredOn)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(tripExpenses).innerJoin(trips, eq(tripExpenses.tripId, trips.id)).leftJoin(travelers, eq(trips.travelerId, travelers.id)).where(filters.length ? and(...filters) : undefined);
  return { items: rows.map(({ expense }) => expense), page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

export async function getTripExpense(id: number, scope: Scope = {}) {
  const db = await requireDb();
  const filters = [eq(tripExpenses.id, id), scope.admin ? undefined : scope.userId ? eq(travelers.userId, scope.userId) : undefined].filter(Boolean);
  const [row] = await db.select({ expense: tripExpenses }).from(tripExpenses).innerJoin(trips, eq(tripExpenses.tripId, trips.id)).leftJoin(travelers, eq(trips.travelerId, travelers.id)).where(and(...filters)).limit(1);
  return row?.expense;
}

export async function createTripExpense(input: typeof tripExpenses.$inferInsert, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(input.tripId, scope))) return undefined;
  const [created] = await db.insert(tripExpenses).values(input).returning();
  return created;
}

export async function updateTripExpense(id: number, input: Partial<typeof tripExpenses.$inferInsert>, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTripExpense(id, scope))) return undefined;
  const [updated] = await db.update(tripExpenses).set(input).where(eq(tripExpenses.id, id)).returning();
  return updated;
}

export async function deleteTripExpense(id: number, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTripExpense(id, scope))) return undefined;
  const [deleted] = await db.delete(tripExpenses).where(eq(tripExpenses.id, id)).returning({ id: tripExpenses.id });
  return deleted;
}

export async function listVehicles(input: PageInput & { status?: string }) {
  const db = await requireDb();
  const filters = [input.status ? eq(vehicles.status, input.status as typeof vehicles.status.enumValues[number]) : undefined, input.search ? or(ilike(vehicles.plate, `%${input.search}%`), ilike(vehicles.brand, `%${input.search}%`), ilike(vehicles.model, `%${input.search}%`)) : undefined].filter(Boolean);
  const paging = page(input);
  const items = await db.select().from(vehicles).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(vehicles.createdAt) : asc(vehicles.createdAt)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(vehicles).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
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
  return { items, page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
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
  return { items, page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
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
  return { items, page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

export async function getWorkOrder(id: number) {
  const db = await requireDb();
  const [order] = await db.select().from(fleetWorkOrders).where(eq(fleetWorkOrders.id, id)).limit(1);
  return order;
}

export async function createWorkOrder(input: typeof fleetWorkOrders.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(fleetWorkOrders).values(input).returning();
  if (created) await updateVehicle(created.vehicleId, { currentKm: created.vehicleKm, lastMaintenanceKm: created.vehicleKm, status: 'Disponível' });
  return created;
}

export async function updateWorkOrder(id: number, input: Partial<typeof fleetWorkOrders.$inferInsert>) {
  const db = await requireDb();
  const [updated] = await db.update(fleetWorkOrders).set(input).where(eq(fleetWorkOrders.id, id)).returning();
  if (updated && (input.vehicleKm !== undefined || input.status === 'Concluída')) await updateVehicle(updated.vehicleId, { currentKm: updated.vehicleKm, lastMaintenanceKm: updated.vehicleKm, status: 'Disponível' });
  return updated;
}

export async function deleteWorkOrder(id: number) {
  const db = await requireDb();
  const [deleted] = await db.delete(fleetWorkOrders).where(eq(fleetWorkOrders.id, id)).returning({ id: fleetWorkOrders.id });
  return deleted;
}
