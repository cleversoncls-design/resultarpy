import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm';
import { getDb } from './db';
import { clients, clientBillingProfileItems, clientBillingProfiles, currencyRates, expenseTypes, fleetEvents, fleetReservations, fleetWorkOrders, reimbursementLimitProfileItems, reimbursementLimitProfiles, travelers, tripApprovals, tripExpenses, trips, users, vehicles } from '../drizzle/schema';

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

export async function ensureTravelerIdByUserId(userId: number) {
  const db = await requireDb();
  const existing = await findTravelerIdByUserId(userId);
  if (existing) return existing;
  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return undefined;
  const name = user.name?.trim() || user.email?.trim() || `Viajante ${userId}`;
  const [created] = await db.insert(travelers).values({ userId, name }).returning({ id: travelers.id });
  return created?.id;
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
  const [row] = await db.select({ trip: trips, clientName: clients.name, travelerName: travelers.name }).from(trips).leftJoin(travelers, eq(trips.travelerId, travelers.id)).leftJoin(clients, eq(trips.clientId, clients.id)).where(and(...filters)).limit(1);
  if (!row) return undefined;
  return { ...row.trip, clientName: row.clientName, travelerName: row.travelerName };
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

export type ApprovalQueueStatus = 'Pendiente' | 'Aprovada' | 'Rejeitada';

export async function listTripApprovals(input: PageInput & { userId?: number; admin?: boolean; approver?: boolean; status?: ApprovalQueueStatus }) {
  const db = await requireDb();
  const statusFilter = input.status === 'Aprovada'
    ? eq(trips.status, 'Aprovada')
    : input.status === 'Rejeitada'
      ? eq(trips.status, 'Rejeitada')
      : or(eq(trips.status, 'Aguardando aprovação'), eq(trips.status, 'Devolvida'));
  const filters = [
    statusFilter,
    input.admin || input.approver ? undefined : input.userId ? eq(trips.approverId, input.userId) : undefined,
    input.search ? or(ilike(trips.tripCode, `%${input.search}%`), ilike(trips.destination, `%${input.search}%`)) : undefined,
  ].filter(Boolean);
  const paging = page(input);
  const rows = await db.select({ trip: trips }).from(trips).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(trips.createdAt) : asc(trips.createdAt)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(trips).where(filters.length ? and(...filters) : undefined);
  const tripIds = rows.map(({ trip }) => trip.id);
  const approvals = tripIds.length ? await db.select({ tripId: tripApprovals.tripId, decision: tripApprovals.decision, comment: tripApprovals.comment, decidedAt: tripApprovals.decidedAt }).from(tripApprovals).where(inArray(tripApprovals.tripId, tripIds)).orderBy(desc(tripApprovals.decidedAt)) : [];
  const latestByTrip = new Map<number, (typeof approvals)[number]>();
  approvals.forEach((approval) => { if (!latestByTrip.has(approval.tripId)) latestByTrip.set(approval.tripId, approval); });
  return { items: rows.map(({ trip }) => ({ ...trip, latestApproval: latestByTrip.get(trip.id) ?? null })), page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

export type ApprovalHistoryFilters = {
  decision?: typeof tripApprovals.decision.enumValues[number];
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  exportAll?: boolean;
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
  const currentPage = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.exportAll ? 1000 : Math.min(Math.max(filters.pageSize ?? 10, 1), 100);
  const offset = filters.exportAll ? 0 : (currentPage - 1) * pageSize;
  const where = and(...historyFilters);
  const rows = await db.select({ approval: tripApprovals, approverName: users.name, approverEmail: users.email }).from(tripApprovals).leftJoin(users, eq(tripApprovals.approverId, users.id)).where(where).orderBy(desc(tripApprovals.decidedAt)).limit(pageSize).offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(tripApprovals).where(where);
  const items = rows.map(({ approval, approverName, approverEmail }) => ({ ...approval, approverName: approverName ?? approverEmail ?? 'Usuário' }));
  return { items, page: currentPage, pageSize, total: Number(total), totalPages: filters.exportAll ? 1 : Math.max(Math.ceil(Number(total) / pageSize), 1) };
}

export async function decideTripApproval(input: { tripId: number; approverId: number; decision: typeof tripApprovals.decision.enumValues[number]; comment?: string | null }, admin = false, approver = false) {
  const db = await requireDb();
  const [trip] = await db.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
  if (!trip || (!admin && !approver && trip.approverId !== input.approverId)) return undefined;
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

export type ReimbursementReportInput = PageInput & { tripId?: number; userId?: number; admin?: boolean; from?: string; to?: string };

export type ReimbursementProfileForReport = { id: number; city: string; currency: string; items: { expenseTypeId: number; limitAmount: number }[] };

function normalizeCity(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function chooseReimbursementProfile(profiles: ReimbursementProfileForReport[], city: string, expenseCurrency: string, expenseTypeId: number) {
  const normalizedCity = normalizeCity(city);
  const normalizedCurrency = expenseCurrency.toUpperCase();
  const hasExpenseType = (profile: ReimbursementProfileForReport) => profile.items.some((item) => item.expenseTypeId === expenseTypeId);
  const specific = profiles.filter((profile) => normalizeCity(profile.city) === normalizedCity && hasExpenseType(profile));
  const generic = profiles.filter((profile) => profile.city.trim() === '' && hasExpenseType(profile));
  const candidates = specific.length > 0 ? specific : generic;
  return candidates.find((profile) => profile.currency === normalizedCurrency) ?? candidates[0];
}

export function rateFor(rates: Array<{ rateDate: string; fromCurrency: string; toCurrency: string; rate: string }>, fromCurrency: string, toCurrency: string, date: string) {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return { value: 1, rateDate: date };
  const row = rates.filter((rate) => rate.fromCurrency === from && rate.toCurrency === to && rate.rateDate <= date).reduce<typeof rates[number] | undefined>((latest, rate) => !latest || rate.rateDate > latest.rateDate ? rate : latest, undefined);
  return row ? { value: Number(row.rate), rateDate: row.rateDate } : undefined;
}

export async function listReimbursementReport(input: ReimbursementReportInput) {
  const db = await requireDb();
  const filters = [
    input.tripId ? eq(tripExpenses.tripId, input.tripId) : undefined,
    input.userId && !input.admin ? eq(travelers.userId, input.userId) : undefined,
    input.from ? gte(tripExpenses.occurredOn, input.from) : undefined,
    input.to ? lte(tripExpenses.occurredOn, input.to) : undefined,
  ].filter(Boolean);
  const expensesRows = await db.select({
    expense: tripExpenses,
    tripCode: trips.tripCode,
    clientName: clients.name,
    expenseTypeName: expenseTypes.name,
  }).from(tripExpenses).innerJoin(trips, eq(tripExpenses.tripId, trips.id)).leftJoin(travelers, eq(trips.travelerId, travelers.id)).leftJoin(clients, eq(trips.clientId, clients.id)).leftJoin(expenseTypes, eq(tripExpenses.expenseTypeId, expenseTypes.id)).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(tripExpenses.occurredOn) : asc(tripExpenses.occurredOn));
  const profilesRows = await db.select({ profileId: reimbursementLimitProfiles.id, city: reimbursementLimitProfiles.city, currency: reimbursementLimitProfiles.currency, expenseTypeId: reimbursementLimitProfileItems.expenseTypeId, limitAmount: reimbursementLimitProfileItems.limitAmount }).from(reimbursementLimitProfiles).leftJoin(reimbursementLimitProfileItems, eq(reimbursementLimitProfileItems.profileId, reimbursementLimitProfiles.id));
  const profiles = new Map<number, ReimbursementProfileForReport>();
  for (const row of profilesRows) {
    const profile = profiles.get(row.profileId) ?? { id: row.profileId, city: row.city, currency: row.currency, items: [] };
    if (row.expenseTypeId && row.limitAmount !== null) profile.items.push({ expenseTypeId: row.expenseTypeId, limitAmount: Number(row.limitAmount) });
    profiles.set(row.profileId, profile);
  }
  const maxDate = expensesRows.reduce<string | undefined>((max, row) => !max || row.expense.occurredOn > max ? row.expense.occurredOn : max, undefined);
  const rateRows = await db.select({ rateDate: currencyRates.rateDate, fromCurrency: currencyRates.fromCurrency, toCurrency: currencyRates.toCurrency, rate: currencyRates.rate }).from(currencyRates).where(maxDate ? lte(currencyRates.rateDate, maxDate) : undefined).orderBy(desc(currencyRates.rateDate));
  const allProfiles = Array.from(profiles.values());
  const items = expensesRows.map(({ expense, tripCode, clientName, expenseTypeName }) => {
    const sourceCurrency = expense.currency.toUpperCase();
    const profile = chooseReimbursementProfile(allProfiles, expense.city, sourceCurrency, expense.expenseTypeId);
    const configuredLimit = profile?.items.find((item) => item.expenseTypeId === expense.expenseTypeId);
    const limitCurrency = profile?.currency ?? sourceCurrency;
    const sourceRate = rateFor(rateRows, sourceCurrency, 'PYG', expense.occurredOn);
    const targetRate = rateFor(rateRows, limitCurrency, 'PYG', expense.occurredOn);
    const spentInLimitCurrency = sourceRate && targetRate ? Number(expense.amount) * sourceRate.value / targetRate.value : Number(expense.amount);
    const limitAmount = configuredLimit?.limitAmount ?? null;
    const reimbursableAmount = limitAmount === null ? spentInLimitCurrency : Math.min(spentInLimitCurrency, limitAmount);
    return { id: expense.id, tripId: expense.tripId, tripCode, clientName: clientName ?? 'Sem cliente', date: expense.occurredOn, city: expense.city, expenseTypeId: expense.expenseTypeId, expenseTypeName: expenseTypeName ?? 'Tipo de gasto', quantity: expense.quantity, unitValue: expense.unitValue, sourceAmount: expense.amount, sourceCurrency, currency: limitCurrency, spent: spentInLimitCurrency, limit: limitAmount, reimbursable: reimbursableAmount, excess: Math.max(0, spentInLimitCurrency - reimbursableAmount), profileCity: profile?.city || null, rateDate: sourceRate && targetRate ? (sourceRate.rateDate < targetRate.rateDate ? sourceRate.rateDate : targetRate.rateDate) : null, conversionAvailable: Boolean(sourceRate && targetRate) };
  });
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  const offset = Math.max(input.page - 1, 0) * pageSize;
  return { items: items.slice(offset, offset + pageSize), page: input.page, pageSize, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) };
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


export type BillingReportInput = PageInput & { tripId?: number; clientId?: number; userId?: number; admin?: boolean; from?: string; to?: string };

export function calculateBillingAmounts(spent: number, limit: number | null) {
  const billable = limit === null ? spent : Math.min(spent, limit);
  return { billable, difference: spent - billable };
}

export async function listBillingReport(input: BillingReportInput) {
  const db = await requireDb();
  const filters = [
    input.tripId ? eq(tripExpenses.tripId, input.tripId) : undefined,
    input.clientId ? eq(trips.clientId, input.clientId) : undefined,
    input.userId && !input.admin ? eq(travelers.userId, input.userId) : undefined,
    input.from ? gte(tripExpenses.occurredOn, input.from) : undefined,
    input.to ? lte(tripExpenses.occurredOn, input.to) : undefined,
    eq(tripExpenses.billable, true),
  ].filter(Boolean);
  const expenseRows = await db.select({
    expense: tripExpenses,
    tripCode: trips.tripCode,
    clientId: clients.id,
    clientName: clients.name,
    clientCurrency: clients.billingCurrency,
    expenseTypeName: expenseTypes.name,
  }).from(tripExpenses)
    .innerJoin(trips, eq(tripExpenses.tripId, trips.id))
    .leftJoin(travelers, eq(trips.travelerId, travelers.id))
    .leftJoin(clients, eq(trips.clientId, clients.id))
    .leftJoin(expenseTypes, eq(tripExpenses.expenseTypeId, expenseTypes.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(input.direction === 'desc' ? desc(tripExpenses.occurredOn) : asc(tripExpenses.occurredOn));
  const profilesRows = await db.select({
    profileId: clientBillingProfiles.id,
    clientId: clientBillingProfiles.clientId,
    currency: clientBillingProfiles.currency,
    expenseTypeId: clientBillingProfileItems.expenseTypeId,
    limitAmount: clientBillingProfileItems.limitAmount,
  }).from(clientBillingProfiles).leftJoin(clientBillingProfileItems, eq(clientBillingProfileItems.profileId, clientBillingProfiles.id));
  const profileItems = new Map<string, { currency: string; limitAmount: number }>();
  for (const row of profilesRows) {
    if (row.expenseTypeId && row.limitAmount !== null) profileItems.set(`${row.clientId}:${row.expenseTypeId}`, { currency: row.currency, limitAmount: Number(row.limitAmount) });
  }
  const maxDate = expenseRows.reduce<string | undefined>((max, row) => !max || row.expense.occurredOn > max ? row.expense.occurredOn : max, undefined);
  const rateRows = await db.select({ rateDate: currencyRates.rateDate, fromCurrency: currencyRates.fromCurrency, toCurrency: currencyRates.toCurrency, rate: currencyRates.rate }).from(currencyRates).where(maxDate ? lte(currencyRates.rateDate, maxDate) : undefined).orderBy(desc(currencyRates.rateDate));
  const items = expenseRows.map(({ expense, tripCode, clientId, clientName, clientCurrency, expenseTypeName }) => {
    const sourceCurrency = expense.currency.toUpperCase();
    const targetCurrency = (clientCurrency ?? 'BRL').toUpperCase();
    const configured = clientId ? profileItems.get(`${clientId}:${expense.expenseTypeId}`) : undefined;
    const limitCurrency = configured?.currency ?? targetCurrency;
    const sourceRate = rateFor(rateRows, sourceCurrency, 'PYG', expense.occurredOn);
    const targetRate = rateFor(rateRows, limitCurrency, 'PYG', expense.occurredOn);
    const spent = sourceRate && targetRate ? Number(expense.amount) * sourceRate.value / targetRate.value : Number(expense.amount);
    const limit = configured?.limitAmount ?? null;
    const billing = calculateBillingAmounts(spent, limit);
    return { id: expense.id, tripId: expense.tripId, tripCode, clientId, clientName: clientName ?? 'Sem cliente', date: expense.occurredOn, city: expense.city, expenseTypeId: expense.expenseTypeId, expenseTypeName: expenseTypeName ?? 'Tipo de gasto', quantity: expense.quantity, sourceAmount: expense.amount, sourceCurrency, currency: limitCurrency, spent, limit, difference: billing.difference, billable: billing.billable, rateDate: sourceRate && targetRate ? (sourceRate.rateDate < targetRate.rateDate ? sourceRate.rateDate : targetRate.rateDate) : null, conversionAvailable: Boolean(sourceRate && targetRate) };
  });
  const paging = page(input);
  return { items: items.slice(paging.offset, paging.offset + paging.limit), page: input.page, pageSize: paging.limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / paging.limit)) };
}
