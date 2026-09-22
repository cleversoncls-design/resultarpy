import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or } from 'drizzle-orm';
import { getDb } from './db';
import { clients, clientBillingProfileItems, clientBillingProfiles, currencyRates, expenseTypes, fleetEventPhotos, fleetEvents, fleetReservations, fleetWorkOrders, reimbursementLimitProfileItems, reimbursementLimitProfiles, travelers, tripApprovals, tripExpenses, trips, users, vehicles } from '../drizzle/schema';

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

// Usado para decidir se mostramos "Minhas viagens" no menu do
// Administrativo — só faz sentido aparecer se ele mesmo já tiver alguma
// viagem própria registrada.
export async function hasOwnTrips(userId: number) {
  const db = await requireDb();
  const [row] = await db.select({ id: trips.id }).from(trips).innerJoin(travelers, eq(trips.travelerId, travelers.id)).where(eq(travelers.userId, userId)).limit(1);
  return Boolean(row);
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

// Verifica se todas as pendências aplicáveis a uma viagem foram resolvidas
// (veículo alocado quando exigido, adiantamento confirmado quando existe,
// nota de hotel preenchida quando necessária) e, nesse caso, avança o
// status da viagem para "Liberada para viagem" automaticamente.
export async function maybeReleaseTrip(id: number) {
  const db = await requireDb();
  const [trip] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  if (!trip) return undefined;
  if (trip.status !== 'Aprovada' && trip.status !== 'Em preparação') return trip;

  const vehicleOk = !trip.requiresFleetVehicle || (await getFleetReservationForTrip(id))?.vehicleId != null;
  const advanceOk = !trip.hasAdvance || trip.advanceConfirmedAt != null;
  const hotelOk = !trip.needsHotel || Boolean(trip.hotelNote && trip.hotelNote.trim() !== '');

  if (vehicleOk && advanceOk && hotelOk) {
    const [updated] = await db.update(trips).set({ status: 'Liberada para viagem' }).where(eq(trips.id, id)).returning();
    return updated;
  }
  return trip;
}

// O próprio viajante marca que a viagem começou de verdade — funciona
// para qualquer modalidade de transporte (frota, próprio ou ônibus), não
// só para quem tem veículo da frota associado.
export async function startTrip(id: number, scope: Scope = {}) {
  const db = await requireDb();
  const trip = await getTrip(id, scope);
  if (!trip) return undefined;
  if (trip.status !== 'Liberada para viagem') return trip;
  const [updated] = await db.update(trips).set({ status: 'Em prestação' }).where(eq(trips.id, id)).returning();
  return updated;
}

export async function updateTrip(id: number, input: Partial<typeof trips.$inferInsert>, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(id, scope))) return undefined;
  const [updated] = await db.update(trips).set(input).where(eq(trips.id, id)).returning();
  // Se a modalidade de transporte ou a exigência de veículo mudou (ex.: admin
  // trocou de "frota" para "próprio"/"ônibus"), reavalia se a viagem já pode
  // ser liberada.
  if (updated && ('transport' in input || 'requiresFleetVehicle' in input)) {
    return (await maybeReleaseTrip(id)) ?? updated;
  }
  return updated;
}

export async function deleteTrip(id: number, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(id, scope))) return undefined;
  const [deleted] = await db.delete(trips).where(eq(trips.id, id)).returning({ id: trips.id });
  return deleted;
}

// --- Fluxo de fechamento da prestação de contas ---

// O próprio viajante envia a prestação de contas para validação do
// Administrativo. Só é permitido a partir de "Em prestação" e uma única
// vez (não permite reenviar sem necessidade).
export async function submitTripClosure(id: number, scope: Scope = {}) {
  const db = await requireDb();
  const trip = await getTrip(id, scope);
  if (!trip) return undefined;
  if (trip.closureSubmittedAt) throw new Error('O fechamento desta viagem já foi enviado anteriormente.');
  if (trip.status !== 'Em prestação') throw new Error(`A viagem precisa estar "Em prestação" para enviar o fechamento (status atual: "${trip.status}"). Clique em "Iniciar viagem" antes.`);
  const [updated] = await db.update(trips).set({ closureSubmittedAt: new Date() }).where(eq(trips.id, id)).returning();
  return updated;
}

// O Administrativo confere os comprovantes lançados e valida a prestação.
export async function validateTripReceipts(id: number) {
  const db = await requireDb();
  const [trip] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  if (!trip) return undefined;
  if (!trip.closureSubmittedAt || trip.receiptsValidatedAt) return trip;
  const [updated] = await db.update(trips).set({ receiptsValidatedAt: new Date() }).where(eq(trips.id, id)).returning();
  return updated;
}

// O Administrativo fatura os gastos ao cliente — só depois de validar os
// comprovantes. Essa é a etapa que efetivamente finaliza a viagem.
export async function billTrip(id: number) {
  const db = await requireDb();
  const [trip] = await db.select().from(trips).where(eq(trips.id, id)).limit(1);
  if (!trip) return undefined;
  if (!trip.receiptsValidatedAt || trip.billedAt) return trip;
  const [updated] = await db.update(trips).set({ billedAt: new Date(), status: 'Finalizada' }).where(eq(trips.id, id)).returning();
  return updated;
}

// Fila do Administrativo: viagens com prestação enviada, aguardando
// validação de comprovantes ou faturamento.
export async function listClosureQueue(input: PageInput) {
  const db = await requireDb();
  const filters = [
    isNotNull(trips.closureSubmittedAt),
    isNull(trips.billedAt),
    input.search ? or(ilike(trips.tripCode, `%${input.search}%`), ilike(trips.destination, `%${input.search}%`)) : undefined,
  ].filter(Boolean);
  const paging = page(input);
  const rows = await db.select({ trip: trips, clientName: clients.name, travelerName: travelers.name }).from(trips).leftJoin(travelers, eq(trips.travelerId, travelers.id)).leftJoin(clients, eq(trips.clientId, clients.id)).where(and(...filters)).orderBy(asc(trips.closureSubmittedAt)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(trips).where(and(...filters));
  return { items: rows.map(({ trip, clientName, travelerName }) => ({ ...trip, clientName, travelerName })), page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

// Confirma que o depósito do adiantamento foi realizado, registrando o
// valor efetivamente depositado (que pode diferir do valor solicitado,
// para permitir encontro de contas) e a data automaticamente. Reavalia se
// a viagem pode ser liberada.
export async function confirmTripAdvance(id: number, depositedAmount: string, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(id, scope))) return undefined;
  await db.update(trips).set({ advanceConfirmedAt: new Date(), advanceConfirmedAmount: depositedAmount }).where(eq(trips.id, id));
  return maybeReleaseTrip(id);
}

// Salva a observação com os dados da reserva de hotel e reavalia se a
// viagem pode ser liberada.
export async function updateTripHotelNote(id: number, hotelNote: string | null, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(id, scope))) return undefined;
  await db.update(trips).set({ hotelNote }).where(eq(trips.id, id));
  return maybeReleaseTrip(id);
}

// Busca a reserva de frota vinculada a uma viagem específica, já com os
// dados do veículo e do condutor (para exibição na tela de detalhes).
export async function getFleetReservationForTrip(tripId: number, scope: Scope = {}) {
  const db = await requireDb();
  if (!(await getTrip(tripId, scope))) return undefined;
  const [row] = await db
    .select({
      reservation: fleetReservations,
      vehicleBrand: vehicles.brand,
      vehicleModel: vehicles.model,
      vehiclePlate: vehicles.plate,
      driverName: travelers.name,
    })
    .from(fleetReservations)
    .leftJoin(vehicles, eq(fleetReservations.vehicleId, vehicles.id))
    .leftJoin(travelers, eq(fleetReservations.driverId, travelers.id))
    .where(eq(fleetReservations.tripId, tripId))
    .orderBy(desc(fleetReservations.createdAt))
    .limit(1);
  if (!row) return null;
  return { ...row.reservation, vehicleBrand: row.vehicleBrand, vehicleModel: row.vehicleModel, vehiclePlate: row.vehiclePlate, driverName: row.driverName };
}

export type ApprovalQueueStatus = 'Pendiente' | 'Aprovada' | 'Rejeitada';

export async function listTripApprovals(input: PageInput & { userId?: number; admin?: boolean; approver?: boolean; status?: ApprovalQueueStatus; from?: string; to?: string }) {
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
    input.from ? gte(trips.createdAt, new Date(`${input.from}T00:00:00.000Z`)) : undefined,
    input.to ? lte(trips.createdAt, new Date(`${input.to}T23:59:59.999Z`)) : undefined,
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

// Histórico global de decisões (aprovadas/rejeitadas) já tomadas, em todas
// as viagens de uma vez — antes só existia um histórico por viagem
// específica, exigindo abrir cada uma para ver a decisão.
export async function listApprovalDecisionsGlobal(scope: Scope, filters: { decision?: typeof tripApprovals.decision.enumValues[number]; from?: string; to?: string; page: number; pageSize: number; exportAll?: boolean }) {
  const db = await requireDb();
  const conditions = [
    filters.decision ? eq(tripApprovals.decision, filters.decision) : undefined,
    filters.from ? gte(tripApprovals.decidedAt, new Date(`${filters.from}T00:00:00.000Z`)) : undefined,
    filters.to ? lte(tripApprovals.decidedAt, new Date(`${filters.to}T23:59:59.999Z`)) : undefined,
    scope.admin ? undefined : scope.userId ? eq(tripApprovals.approverId, scope.userId) : undefined,
  ].filter(Boolean);
  const where = conditions.length ? and(...conditions) : undefined;
  const currentPage = Math.max(filters.page ?? 1, 1);
  const pageSize = filters.exportAll ? 1000 : Math.min(Math.max(filters.pageSize ?? 10, 1), 100);
  const offset = filters.exportAll ? 0 : (currentPage - 1) * pageSize;
  const rows = await db
    .select({ approval: tripApprovals, approverName: users.name, approverEmail: users.email, tripId: trips.id, tripCode: trips.tripCode, destination: trips.destination, clientName: clients.name })
    .from(tripApprovals)
    .innerJoin(trips, eq(tripApprovals.tripId, trips.id))
    .leftJoin(users, eq(tripApprovals.approverId, users.id))
    .leftJoin(clients, eq(trips.clientId, clients.id))
    .where(where)
    .orderBy(desc(tripApprovals.decidedAt))
    .limit(pageSize)
    .offset(offset);
  const [{ total }] = await db.select({ total: count() }).from(tripApprovals).innerJoin(trips, eq(tripApprovals.tripId, trips.id)).where(where);
  const items = rows.map(({ approval, approverName, approverEmail, tripId, tripCode, destination, clientName }) => ({ ...approval, tripId, tripCode, destination, clientName: clientName ?? 'Sem cliente', approverName: approverName ?? approverEmail ?? 'Usuário' }));
  return { items, page: currentPage, pageSize, total: Number(total), totalPages: filters.exportAll ? 1 : Math.max(Math.ceil(Number(total) / pageSize), 1) };
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
    // Só despesas "Pago com adiantamento" (o viajante pagou do próprio
    // bolso) geram reembolso. Despesas "Pago Administrativo" (a empresa já
    // pagou direto) não entram nesse total.
    eq(tripExpenses.prepaid, true),
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
    const excessInLimitCurrency = Math.max(0, spentInLimitCurrency - reimbursableAmount); const isRejected = Boolean(expense.reimbursementRejectedAt);
    // Além dos valores na moeda do perfil de reembolso (usados para
    // comparar com o limite corretamente), guardamos também a mesma
    // informação sempre convertida para Guaraní, para exibição no
    // relatório de reembolso (que deve mostrar tudo em PYG).
    const spentPyg = sourceRate ? Number(expense.amount) * sourceRate.value : Number(expense.amount);
    const reimbursablePyg = isRejected ? 0 : (targetRate ? reimbursableAmount * targetRate.value : reimbursableAmount);
    const excessPyg = isRejected ? 0 : (targetRate ? excessInLimitCurrency * targetRate.value : excessInLimitCurrency);
    return { id: expense.id, tripId: expense.tripId, tripCode, clientName: clientName ?? 'Sem cliente', date: expense.occurredOn, city: expense.city, expenseTypeId: expense.expenseTypeId, expenseTypeName: expenseTypeName ?? 'Tipo de gasto', quantity: expense.quantity, unitValue: expense.unitValue, sourceAmount: expense.amount, sourceCurrency, currency: limitCurrency, rate: sourceRate?.value ?? null, spent: spentInLimitCurrency, limit: limitAmount, reimbursable: isRejected ? 0 : reimbursableAmount, excess: isRejected ? 0 : excessInLimitCurrency, spentPyg, reimbursablePyg, excessPyg, receiptUri: expense.receiptUri, reviewNote: expense.reviewNote, reimbursementRejectedAt: expense.reimbursementRejectedAt, profileCity: profile?.city || null, rateDate: sourceRate && targetRate ? (sourceRate.rateDate < targetRate.rateDate ? sourceRate.rateDate : targetRate.rateDate) : null, conversionAvailable: Boolean(sourceRate && targetRate) };
  });
  const pageSize = Math.min(Math.max(input.pageSize, 1), 100);
  const offset = Math.max(input.page - 1, 0) * pageSize;
  return { items: items.slice(offset, offset + pageSize), page: input.page, pageSize, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) };
}

export async function setExpenseReimbursementRejection(id: number, rejected: boolean, reviewNote: string | null) {
  const db = await requireDb();
  const [updated] = await db.update(tripExpenses).set({ reimbursementRejectedAt: rejected ? new Date() : null, reviewNote }).where(eq(tripExpenses.id, id)).returning();
  return updated;
}

export async function getTripExpense(id: number, scope: Scope = {}) {
  const db = await requireDb();
  const filters = [eq(tripExpenses.id, id), scope.admin ? undefined : scope.userId ? eq(travelers.userId, scope.userId) : undefined].filter(Boolean);
  const [row] = await db.select({ expense: tripExpenses }).from(tripExpenses).innerJoin(trips, eq(tripExpenses.tripId, trips.id)).leftJoin(travelers, eq(trips.travelerId, travelers.id)).where(and(...filters)).limit(1);
  return row?.expense;
}

export async function createTripExpense(input: typeof tripExpenses.$inferInsert, scope: Scope = {}) {
  const db = await requireDb();
  const trip = await getTrip(input.tripId, scope);
  if (!trip) return undefined;
  // Depois que o Administrativo valida os comprovantes, a prestação fica
  // travada para o viajante — ele não pode mais incluir, editar ou
  // apagar despesas dessa viagem (o Administrativo continua podendo).
  if (!scope.admin && trip.receiptsValidatedAt) throw new Error('Esta viagem já teve os comprovantes validados e não pode mais receber novas despesas.');
  const [created] = await db.insert(tripExpenses).values(input).returning();
  return created;
}

export async function updateTripExpense(id: number, input: Partial<typeof tripExpenses.$inferInsert>, scope: Scope = {}) {
  const db = await requireDb();
  const expense = await getTripExpense(id, scope);
  if (!expense) return undefined;
  if (!scope.admin) {
    const trip = await getTrip(expense.tripId, scope);
    if (trip?.receiptsValidatedAt) throw new Error('Esta viagem já teve os comprovantes validados e não pode mais ser alterada.');
  }
  const [updated] = await db.update(tripExpenses).set(input).where(eq(tripExpenses.id, id)).returning();
  return updated;
}

export async function deleteTripExpense(id: number, scope: Scope = {}) {
  const db = await requireDb();
  const expense = await getTripExpense(id, scope);
  if (!expense) return undefined;
  if (!scope.admin) {
    const trip = await getTrip(expense.tripId, scope);
    if (trip?.receiptsValidatedAt) throw new Error('Esta viagem já teve os comprovantes validados e não pode mais ser alterada.');
  }
  const [deleted] = await db.delete(tripExpenses).where(eq(tripExpenses.id, id)).returning({ id: tripExpenses.id });
  return deleted;
}

export async function getVehicle(id: number) {
  const db = await requireDb();
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return vehicle;
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

export async function listFleetReservations(input: PageInput & { status?: string; vehicleId?: number }) {
  const db = await requireDb();
  const filters = [
    input.status ? eq(fleetReservations.status, input.status as typeof fleetReservations.status.enumValues[number]) : undefined,
    input.vehicleId ? eq(fleetReservations.vehicleId, input.vehicleId) : undefined,
  ].filter(Boolean);
  const paging = page(input);
  // Traz o codigo/destino da viagem e o nome de quem solicitou o
  // veiculo junto -- util para listar o historico de alocacoes de um
  // veiculo especifico (tela de gerenciar veiculo), sem precisar de
  // consultas separadas.
  const rows = await db.select({ reservation: fleetReservations, tripCode: trips.tripCode, destination: trips.destination, driverName: travelers.name }).from(fleetReservations).leftJoin(trips, eq(fleetReservations.tripId, trips.id)).leftJoin(travelers, eq(fleetReservations.driverId, travelers.id)).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(fleetReservations.plannedStartOn) : asc(fleetReservations.plannedStartOn)).limit(paging.limit).offset(paging.offset);
  const items = rows.map(({ reservation, tripCode, destination, driverName }) => ({ ...reservation, tripCode, destination, driverName }));
  const [{ total }] = await db.select({ total: count() }).from(fleetReservations).where(filters.length ? and(...filters) : undefined);
  return { items, page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

export async function createFleetReservation(input: typeof fleetReservations.$inferInsert) {
  const db = await requireDb();
  const [created] = await db.insert(fleetReservations).values(input).returning();
  if (created?.vehicleId) await maybeReleaseTrip(created.tripId);
  return created;
}

export async function updateFleetReservation(id: number, input: Partial<typeof fleetReservations.$inferInsert>) {
  const db = await requireDb();
  const [updated] = await db.update(fleetReservations).set(input).where(eq(fleetReservations.id, id)).returning();
  // Se um veículo acabou de ser associado a esta reserva, reavalia se a
  // viagem correspondente já pode ser liberada.
  if (updated && 'vehicleId' in input) await maybeReleaseTrip(updated.tripId);
  return updated;
}

// Permite que o próprio viajante registre o KM de saída/retorno do veículo
// da sua reserva — diferente de updateFleetReservation (admin-only), aqui
// verificamos que o usuário logado é de fato o viajante dono da viagem
// associada a essa reserva antes de gravar qualquer coisa.
export async function recordReservationKm(reservationId: number, input: { departureKm?: number; returnKm?: number }, userId: number, isAdmin = false) {
  const db = await requireDb();
  const [row] = await db
    .select({ reservation: fleetReservations, travelerUserId: travelers.userId })
    .from(fleetReservations)
    .innerJoin(trips, eq(fleetReservations.tripId, trips.id))
    .innerJoin(travelers, eq(trips.travelerId, travelers.id))
    .where(eq(fleetReservations.id, reservationId))
    .limit(1);
  // Antes, só o próprio viajante da reserva podia gravar o KM — o
  // Administrativo também precisa poder fazer isso.
  if (!row || (row.travelerUserId !== userId && !isAdmin)) return undefined;
  const changes: Partial<typeof fleetReservations.$inferInsert> = {};
  if (input.departureKm !== undefined) {
    changes.departureKm = input.departureKm;
    changes.departureAt = new Date();
  }
  if (input.returnKm !== undefined) {
    changes.returnKm = input.returnKm;
    changes.returnAt = new Date();
    changes.status = 'Finalizada';
  }
  const [updated] = await db.update(fleetReservations).set(changes).where(eq(fleetReservations.id, reservationId)).returning();
  // Registrar o KM de saída é, na prática, o momento em que a viagem
  // "começa de verdade" — por isso é aqui que avançamos o status da
  // viagem para "Em prestação" (nada mais no sistema fazia essa
  // transição, o que deixava "Enviar fechamento" sem efeito nenhum).
  if (updated && input.departureKm !== undefined) {
    await db.update(trips).set({ status: 'Em prestação' }).where(and(eq(trips.id, updated.tripId), eq(trips.status, 'Liberada para viagem')));
  }
  // O KM informado aqui também precisa refletir no cadastro do
  // veículo — antes, essa atualização nunca acontecia, então o
  // "KM atuais" do veículo ficava sempre desatualizado.
  const latestKm = input.returnKm ?? input.departureKm;
  if (updated && updated.vehicleId && latestKm !== undefined) {
    await db.update(vehicles).set({ currentKm: latestKm }).where(eq(vehicles.id, updated.vehicleId));
  }
  return updated;
}

export async function listFleetEvents(reservationId: number | undefined, input: PageInput) {
  const db = await requireDb();
  const filters = reservationId ? [eq(fleetEvents.reservationId, reservationId)] : [];
  const paging = page(input);
  const items = await db.select().from(fleetEvents).where(filters.length ? and(...filters) : undefined).orderBy(input.direction === 'desc' ? desc(fleetEvents.createdAt) : asc(fleetEvents.createdAt)).limit(paging.limit).offset(paging.offset);
  const [{ total }] = await db.select({ total: count() }).from(fleetEvents).where(filters.length ? and(...filters) : undefined);
  // Cada evento pode ter varias fotos anexadas (tabela propria
  // fleet_event_photos) -- antes so existia uma unica foto por evento.
  const eventIds = items.map((item) => item.id);
  const photosByEvent = new Map<number, string[]>();
  if (eventIds.length) {
    const photoRows = await db.select({ eventId: fleetEventPhotos.eventId, photoUri: fleetEventPhotos.photoUri }).from(fleetEventPhotos).where(inArray(fleetEventPhotos.eventId, eventIds));
    for (const row of photoRows) {
      const list = photosByEvent.get(row.eventId) ?? [];
      list.push(row.photoUri);
      photosByEvent.set(row.eventId, list);
    }
  }
  const itemsWithPhotos = items.map((item) => ({ ...item, photos: photosByEvent.get(item.id) ?? (item.photoUri ? [item.photoUri] : []) }));
  return { items: itemsWithPhotos, page: input.page, pageSize: paging.limit, total, totalPages: Math.ceil(Number(total) / paging.limit) };
}

export async function createFleetEvent(input: Omit<typeof fleetEvents.$inferInsert, 'photoUri'> & { photoUris?: string[] }) {
  const db = await requireDb();
  const { photoUris, ...eventFields } = input;
  const [created] = await db.insert(fleetEvents).values({ ...eventFields, photoUri: photoUris?.[0] ?? null }).returning();
  if (created && photoUris && photoUris.length) {
    await db.insert(fleetEventPhotos).values(photoUris.map((uri) => ({ eventId: created.id, photoUri: uri })));
  }
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
    // Só gera faturamento quando o tipo de gasto está explicitamente
    // vinculado ao cliente (na tela "Limites por cliente"). Antes, um tipo
    // de gasto sem vínculo caía no valor cheio por engano.
    const billing = configured ? calculateBillingAmounts(spent, limit) : { billable: 0, difference: spent };
    return { id: expense.id, tripId: expense.tripId, tripCode, clientId, clientName: clientName ?? 'Sem cliente', date: expense.occurredOn, city: expense.city, expenseTypeId: expense.expenseTypeId, expenseTypeName: expenseTypeName ?? 'Tipo de gasto', quantity: expense.quantity, sourceAmount: expense.amount, sourceCurrency, currency: limitCurrency, rate: targetRate?.value ?? null, spent, limit, difference: billing.difference, billable: billing.billable, rateDate: sourceRate && targetRate ? (sourceRate.rateDate < targetRate.rateDate ? sourceRate.rateDate : targetRate.rateDate) : null, conversionAvailable: Boolean(sourceRate && targetRate) };
  });
  const paging = page(input);
  return { items: items.slice(paging.offset, paging.offset + paging.limit), page: input.page, pageSize: paging.limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / paging.limit)) };
}
