import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  clients,
  clientBillingLimits,
  clientBillingProfiles,
  clientBillingProfileItems,
  cities,
  expenseTypes,
  maintenanceReasons,
  reimbursementLimits,
  reimbursementLimitProfiles,
  reimbursementLimitProfileItems,
  currencyRates,
  travelers,
  users,
  units,
  translationEntries,
  type InsertClient,
  type InsertCity,
  type InsertExpenseType,
  type InsertTraveler,
  type InsertUnit,
} from "../drizzle/schema";
import { getDb } from "./db";

export type CatalogListInput = {
  page: number;
  pageSize: number;
  search?: string;
  includeInactive?: boolean;
  direction?: "asc" | "desc";
};

export type CatalogListResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

async function requireDb() {
  const db = await getDb();
  if (!db) {
    throw new Error("PostgreSQL database is not available");
  }
  return db;
}

function pageOffset(input: CatalogListInput) {
  return (input.page - 1) * input.pageSize;
}

function totalPages(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / pageSize));
}

function normalizedSearch(search?: string) {
  const value = search?.trim();
  return value ? `%${value}%` : undefined;
}

function result<T>(items: T[], input: CatalogListInput, total: number): CatalogListResult<T> {
  return {
    items,
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: totalPages(total, input.pageSize),
  };
}

export async function listTranslationEntries(input: { search?: string }) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const where = search ? or(ilike(translationEntries.translationKey, search), ilike(translationEntries.spanish, search)) : undefined;
  return db.select().from(translationEntries).where(where).orderBy(asc(translationEntries.translationKey));
}

export async function upsertTranslationEntries(items: Array<{ key: string; spanish: string }>, updatedBy: number) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const rows = [];
    for (const item of items) {
      const [row] = await tx.insert(translationEntries).values({ translationKey: item.key, spanish: item.spanish, updatedBy }).onConflictDoUpdate({ target: translationEntries.translationKey, set: { spanish: item.spanish, updatedBy, updatedAt: new Date() } }).returning();
      if (row) rows.push(row);
    }
    return rows;
  });
}

export async function listUnits(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const filters = [];
  if (!input.includeInactive) filters.push(eq(units.active, true));
  if (search) filters.push(or(ilike(units.code, search), ilike(units.name, search), ilike(units.city, search)));
  const where = filters.length ? and(...filters) : undefined;
  const order = input.direction === "desc" ? desc(units.name) : asc(units.name);
  const [items, countRows] = await Promise.all([
    db.select().from(units).where(where).orderBy(order).limit(input.pageSize).offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` }).from(units).where(where),
  ]);
  return result(items, input, Number(countRows[0]?.count ?? 0));
}

export async function getUnit(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(units).where(eq(units.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createUnit(input: Pick<InsertUnit, "code" | "name" | "city">) {
  const db = await requireDb();
  const rows = await db.insert(units).values({ ...input, active: true }).returning();
  return rows[0];
}

export async function updateUnit(id: number, input: Partial<Pick<InsertUnit, "code" | "name" | "city" | "active">>) {
  const db = await requireDb();
  const rows = await db.update(units).set(input).where(eq(units.id, id)).returning();
  return rows[0] ?? null;
}

export async function archiveUnit(id: number) {
  return updateUnit(id, { active: false });
}

// --- Cidades (independentes de Unidade) ---
export async function listCities(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const filters = [];
  if (!input.includeInactive) filters.push(eq(cities.active, true));
  if (search) filters.push(ilike(cities.name, search));
  const where = filters.length ? and(...filters) : undefined;
  const order = input.direction === "desc" ? desc(cities.name) : asc(cities.name);
  const [items, countRows] = await Promise.all([
    db.select().from(cities).where(where).orderBy(order).limit(input.pageSize).offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` }).from(cities).where(where),
  ]);
  return result(items, input, Number(countRows[0]?.count ?? 0));
}

export async function getCity(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(cities).where(eq(cities.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createCity(input: Pick<InsertCity, "name">) {
  const db = await requireDb();
  const rows = await db.insert(cities).values({ ...input, active: true }).returning();
  return rows[0];
}

export async function updateCity(id: number, input: Partial<Pick<InsertCity, "name" | "active">>) {
  const db = await requireDb();
  const rows = await db.update(cities).set(input).where(eq(cities.id, id)).returning();
  return rows[0] ?? null;
}

export async function archiveCity(id: number) {
  return updateCity(id, { active: false });
}

export async function listClients(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const filters = [];
  if (!input.includeInactive) filters.push(eq(clients.active, true));
  if (search) filters.push(ilike(clients.name, search));
  const where = filters.length ? and(...filters) : undefined;
  const order = input.direction === "desc" ? desc(clients.name) : asc(clients.name);
  const [items, countRows] = await Promise.all([
    db.select().from(clients).where(where).orderBy(order).limit(input.pageSize).offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` }).from(clients).where(where),
  ]);
  return result(items, input, Number(countRows[0]?.count ?? 0));
}

export async function getClient(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createClient(input: Pick<InsertClient, "name" | "billingCurrency">) {
  const db = await requireDb();
  const rows = await db.insert(clients).values({ ...input, active: true }).returning();
  return rows[0];
}

export async function updateClient(id: number, input: Partial<Pick<InsertClient, "name" | "billingCurrency" | "active">>) {
  const db = await requireDb();
  const rows = await db.update(clients).set(input).where(eq(clients.id, id)).returning();
  return rows[0] ?? null;
}

export async function archiveClient(id: number) {
  return updateClient(id, { active: false });
}

export async function listTravelers(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const filters = [];
  if (!input.includeInactive) filters.push(eq(travelers.active, true));
  if (search) filters.push(or(ilike(travelers.name, search), ilike(travelers.documentNumber, search)));
  const where = filters.length ? and(...filters) : undefined;
  const order = input.direction === "desc" ? desc(travelers.name) : asc(travelers.name);
  const [rows, countRows] = await Promise.all([
    db.select({ traveler: travelers, birthDate: users.birthDate }).from(travelers).leftJoin(users, eq(travelers.userId, users.id)).where(where).orderBy(order).limit(input.pageSize).offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` }).from(travelers).where(where),
  ]);
  const items = rows.map(({ traveler, birthDate }) => ({ ...traveler, birthDate: birthDate ?? null }));
  return result(items, input, Number(countRows[0]?.count ?? 0));
}

export async function getTraveler(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(travelers).where(eq(travelers.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createTraveler(
  input: Pick<InsertTraveler, "name" | "userId" | "unitId" | "documentNumber" | "canDrive">,
) {
  const db = await requireDb();
  const rows = await db.insert(travelers).values({ ...input, active: true }).returning();
  return rows[0];
}

export async function updateTraveler(
  id: number,
  input: Partial<Pick<InsertTraveler, "name" | "userId" | "unitId" | "documentNumber" | "canDrive" | "active">>,
) {
  const db = await requireDb();
  const rows = await db.update(travelers).set(input).where(eq(travelers.id, id)).returning();
  return rows[0] ?? null;
}

export async function archiveTraveler(id: number) {
  return updateTraveler(id, { active: false });
}

export async function listExpenseTypes(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const filters = [];
  if (!input.includeInactive) filters.push(eq(expenseTypes.active, true));
  if (search) filters.push(or(ilike(expenseTypes.name, search), ilike(expenseTypes.description, search)));
  const where = filters.length ? and(...filters) : undefined;
  const order = input.direction === "desc" ? desc(expenseTypes.name) : asc(expenseTypes.name);
  const [items, countRows] = await Promise.all([
    db.select().from(expenseTypes).where(where).orderBy(order).limit(input.pageSize).offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` }).from(expenseTypes).where(where),
  ]);
  return result(items, input, Number(countRows[0]?.count ?? 0));
}

export async function getExpenseType(id: number) {
  const db = await requireDb();
  const rows = await db.select().from(expenseTypes).where(eq(expenseTypes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createExpenseType(input: Pick<InsertExpenseType, "name" | "description">) {
  const db = await requireDb();
  const rows = await db.insert(expenseTypes).values({ ...input, active: true }).returning();
  return rows[0];
}

export async function updateExpenseType(
  id: number,
  input: Partial<Pick<InsertExpenseType, "name" | "description" | "active">>,
) {
  const db = await requireDb();
  const rows = await db.update(expenseTypes).set(input).where(eq(expenseTypes.id, id)).returning();
  return rows[0] ?? null;
}

export async function archiveExpenseType(id: number) {
  return updateExpenseType(id, { active: false });
}

export type ReimbursementProfileItemInput = { expenseTypeId: number; limitAmount: string };
export type ReimbursementProfileInput = { city: string; currency: string; items: ReimbursementProfileItemInput[] };

export async function listReimbursementLimitProfiles(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const rows = await db
    .select({
      profileId: reimbursementLimitProfiles.id,
      city: reimbursementLimitProfiles.city,
      currency: reimbursementLimitProfiles.currency,
      itemId: reimbursementLimitProfileItems.id,
      expenseTypeId: reimbursementLimitProfileItems.expenseTypeId,
      expenseTypeName: expenseTypes.name,
      limitAmount: reimbursementLimitProfileItems.limitAmount,
    })
    .from(reimbursementLimitProfiles)
    .leftJoin(reimbursementLimitProfileItems, eq(reimbursementLimitProfileItems.profileId, reimbursementLimitProfiles.id))
    .leftJoin(expenseTypes, eq(reimbursementLimitProfileItems.expenseTypeId, expenseTypes.id))
    .orderBy(input.direction === 'desc' ? desc(reimbursementLimitProfiles.city) : asc(reimbursementLimitProfiles.city));

  const grouped = new Map<number, { id: number; city: string; currency: string; items: { id: number; expenseTypeId: number; expenseTypeName: string; limitAmount: string }[] }>();
  for (const row of rows) {
    const profile = grouped.get(row.profileId) ?? { id: row.profileId, city: row.city, currency: row.currency, items: [] };
    if (row.itemId && row.expenseTypeId && row.expenseTypeName) profile.items.push({ id: row.itemId, expenseTypeId: row.expenseTypeId, expenseTypeName: row.expenseTypeName, limitAmount: String(row.limitAmount ?? '') });
    grouped.set(row.profileId, profile);
  }
  const query = search?.replaceAll('%', '').toLowerCase();
  const allProfiles = Array.from(grouped.values());
  const filteredProfiles = query ? allProfiles.filter((profile) => profile.city.toLowerCase().includes(query) || profile.items.some((item) => item.expenseTypeName.toLowerCase().includes(query))) : allProfiles;
  const items = filteredProfiles.slice(pageOffset(input), pageOffset(input) + input.pageSize);
  return result(items, input, filteredProfiles.length);
}

export async function createReimbursementLimitProfile(input: ReimbursementProfileInput) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const profiles = await tx.insert(reimbursementLimitProfiles).values({ city: input.city.trim(), currency: input.currency.trim().toUpperCase() }).returning();
    const profile = profiles[0];
    if (!profile) throw new Error('Não foi possível criar o limite de reembolso.');
    await tx.insert(reimbursementLimitProfileItems).values(input.items.map((item) => ({ profileId: profile.id, expenseTypeId: item.expenseTypeId, limitAmount: item.limitAmount.trim() })));
    return { ...profile, items: input.items };
  });
}

export async function updateReimbursementLimitProfile(id: number, input: ReimbursementProfileInput) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(reimbursementLimitProfiles).where(eq(reimbursementLimitProfiles.id, id));
    if (!existing[0]) return null;
    const profiles = await tx.update(reimbursementLimitProfiles).set({ city: input.city.trim(), currency: input.currency.trim().toUpperCase(), updatedAt: new Date() }).where(eq(reimbursementLimitProfiles.id, id)).returning();
    await tx.delete(reimbursementLimitProfileItems).where(eq(reimbursementLimitProfileItems.profileId, id));
    await tx.insert(reimbursementLimitProfileItems).values(input.items.map((item) => ({ profileId: id, expenseTypeId: item.expenseTypeId, limitAmount: item.limitAmount.trim() })));
    return { ...profiles[0], items: input.items };
  });
}

export async function deleteReimbursementLimitProfile(id: number) {
  const db = await requireDb();
  const rows = await db.delete(reimbursementLimitProfiles).where(eq(reimbursementLimitProfiles.id, id)).returning();
  return rows[0] ?? null;
}

export type CurrencyRateInput = { rateDate: string; fromCurrency: string; toCurrency: string; rate: string; rateType: 'venda' | 'referencial'; source: 'DNIT' | 'BCP' | 'Manual'; sourceUrl?: string | null };

export async function listCurrencyRates(input: { rateDate?: string; page: number; pageSize: number }) {
  const db = await requireDb();
  const where = input.rateDate ? eq(currencyRates.rateDate, input.rateDate) : undefined;
  const [items, countRows] = await Promise.all([
    db.select().from(currencyRates).where(where).orderBy(desc(currencyRates.rateDate), asc(currencyRates.fromCurrency)).limit(input.pageSize).offset((input.page - 1) * input.pageSize),
    db.select({ count: sql<number>`count(*)` }).from(currencyRates).where(where),
  ]);
  return result(items, { page: input.page, pageSize: input.pageSize }, Number(countRows[0]?.count ?? 0));
}

export async function upsertCurrencyRates(items: CurrencyRateInput[]) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const saved = [];
    for (const item of items) {
      const rows = await tx.insert(currencyRates).values({ ...item, fromCurrency: item.fromCurrency.toUpperCase(), toCurrency: item.toCurrency.toUpperCase(), rateType: item.rateType, source: item.source }).onConflictDoUpdate({ target: [currencyRates.rateDate, currencyRates.fromCurrency, currencyRates.toCurrency], set: { rate: item.rate, rateType: item.rateType, source: item.source, sourceUrl: item.sourceUrl ?? null, fetchedAt: new Date() } }).returning();
      if (rows[0]) saved.push(rows[0]);
    }
    return saved;
  });
}

export async function getCurrencyRatesForDate(rateDate: string) {
  const db = await requireDb();
  return db.select().from(currencyRates).where(eq(currencyRates.rateDate, rateDate)).orderBy(asc(currencyRates.fromCurrency));
}

export async function listLatestCurrencyRates() {
  const db = await requireDb();
  return db.select().from(currencyRates).orderBy(desc(currencyRates.rateDate), desc(currencyRates.fetchedAt), asc(currencyRates.fromCurrency)).limit(20);
}

export async function listClientBillingLimits(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const where = search
    ? or(ilike(clients.name, search), ilike(expenseTypes.name, search))
    : undefined;
  const order = input.direction === 'desc' ? desc(clients.name) : asc(clients.name);
  const [rows, countRows] = await Promise.all([
    db.select({ id: clientBillingLimits.id, clientId: clientBillingLimits.clientId, clientName: clients.name, expenseTypeId: clientBillingLimits.expenseTypeId, expenseTypeName: expenseTypes.name, limitAmount: clientBillingLimits.limitAmount })
      .from(clientBillingLimits)
      .innerJoin(clients, eq(clientBillingLimits.clientId, clients.id))
      .innerJoin(expenseTypes, eq(clientBillingLimits.expenseTypeId, expenseTypes.id))
      .where(where)
      .orderBy(order)
      .limit(input.pageSize)
      .offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` })
      .from(clientBillingLimits)
      .innerJoin(clients, eq(clientBillingLimits.clientId, clients.id))
      .innerJoin(expenseTypes, eq(clientBillingLimits.expenseTypeId, expenseTypes.id))
      .where(where),
  ]);
  return result(rows, input, Number(countRows[0]?.count ?? 0));
}

export async function createClientBillingLimit(input: { clientId: number; expenseTypeId: number; limitAmount: string }) {
  const db = await requireDb();
  const rows = await db.insert(clientBillingLimits).values(input).returning();
  return rows[0];
}

export async function updateClientBillingLimit(id: number, input: Partial<{ clientId: number; expenseTypeId: number; limitAmount: string }>) {
  const db = await requireDb();
  const rows = await db.update(clientBillingLimits).set(input).where(eq(clientBillingLimits.id, id)).returning();
  return rows[0] ?? null;
}

export async function deleteClientBillingLimit(id: number) {
  const db = await requireDb();
  const rows = await db.delete(clientBillingLimits).where(eq(clientBillingLimits.id, id)).returning();
  return rows[0] ?? null;
}

export type ClientBillingProfileItemInput = { expenseTypeId: number; limitAmount: string };
export type ClientBillingProfileInput = { clientId: number; currency: string; items: ClientBillingProfileItemInput[] };

export async function listClientBillingProfiles(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const rows = await db
    .select({
      profileId: clientBillingProfiles.id,
      clientId: clientBillingProfiles.clientId,
      clientName: clients.name,
      currency: clientBillingProfiles.currency,
      itemId: clientBillingProfileItems.id,
      expenseTypeId: clientBillingProfileItems.expenseTypeId,
      expenseTypeName: expenseTypes.name,
      limitAmount: clientBillingProfileItems.limitAmount,
    })
    .from(clientBillingProfiles)
    .innerJoin(clients, eq(clientBillingProfiles.clientId, clients.id))
    .leftJoin(clientBillingProfileItems, eq(clientBillingProfileItems.profileId, clientBillingProfiles.id))
    .leftJoin(expenseTypes, eq(clientBillingProfileItems.expenseTypeId, expenseTypes.id))
    .orderBy(input.direction === 'desc' ? desc(clients.name) : asc(clients.name));

  const grouped = new Map<number, { id: number; clientId: number; clientName: string; currency: string; items: Array<{ id: number; expenseTypeId: number; expenseTypeName: string; limitAmount: string }> }>();
  for (const row of rows) {
    const profile = grouped.get(row.profileId) ?? { id: row.profileId, clientId: row.clientId, clientName: row.clientName, currency: row.currency, items: [] };
    if (row.itemId && row.expenseTypeId && row.expenseTypeName) profile.items.push({ id: row.itemId, expenseTypeId: row.expenseTypeId, expenseTypeName: row.expenseTypeName, limitAmount: String(row.limitAmount ?? '') });
    grouped.set(row.profileId, profile);
  }
  const allProfiles = Array.from(grouped.values());
  const filteredProfiles = search ? allProfiles.filter((profile) => profile.clientName.toLowerCase().includes(search.replaceAll('%', '').toLowerCase()) || profile.items.some((item) => item.expenseTypeName.toLowerCase().includes(search.replaceAll('%', '').toLowerCase()))) : allProfiles;
  const items = filteredProfiles.slice(pageOffset(input), pageOffset(input) + input.pageSize);
  return result(items, input, filteredProfiles.length);
}

export async function createClientBillingProfile(input: ClientBillingProfileInput) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const profiles = await tx.insert(clientBillingProfiles).values({ clientId: input.clientId, currency: input.currency.trim().toUpperCase() }).returning();
    const profile = profiles[0];
    if (!profile) throw new Error('Não foi possível criar o limite por cliente.');
    await tx.insert(clientBillingProfileItems).values(input.items.map((item) => ({ profileId: profile.id, expenseTypeId: item.expenseTypeId, limitAmount: item.limitAmount.trim() })));
    return { ...profile, items: input.items };
  });
}

export async function updateClientBillingProfile(id: number, input: ClientBillingProfileInput) {
  const db = await requireDb();
  return db.transaction(async (tx) => {
    const existing = await tx.select().from(clientBillingProfiles).where(eq(clientBillingProfiles.id, id));
    if (!existing[0]) return null;
    const profiles = await tx.update(clientBillingProfiles).set({ clientId: input.clientId, currency: input.currency.trim().toUpperCase(), updatedAt: new Date() }).where(eq(clientBillingProfiles.id, id)).returning();
    await tx.delete(clientBillingProfileItems).where(eq(clientBillingProfileItems.profileId, id));
    await tx.insert(clientBillingProfileItems).values(input.items.map((item) => ({ profileId: id, expenseTypeId: item.expenseTypeId, limitAmount: item.limitAmount.trim() })));
    return { ...profiles[0], items: input.items };
  });
}

export async function deleteClientBillingProfile(id: number) {
  const db = await requireDb();
  const rows = await db.delete(clientBillingProfiles).where(eq(clientBillingProfiles.id, id)).returning();
  return rows[0] ?? null;
}

export async function listMaintenanceReasons(input: CatalogListInput) {
  const db = await requireDb();
  const search = normalizedSearch(input.search);
  const filters = [input.includeInactive ? undefined : eq(maintenanceReasons.active, true), search ? or(ilike(maintenanceReasons.name, search), ilike(maintenanceReasons.description, search)) : undefined].filter(Boolean);
  const where = filters.length ? and(...filters) : undefined;
  const order = input.direction === 'desc' ? desc(maintenanceReasons.name) : asc(maintenanceReasons.name);
  const [items, countRows] = await Promise.all([
    db.select().from(maintenanceReasons).where(where).orderBy(order).limit(input.pageSize).offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` }).from(maintenanceReasons).where(where),
  ]);
  return result(items, input, Number(countRows[0]?.count ?? 0));
}

export async function createMaintenanceReason(input: { name: string; description?: string | null; category: 'Preventiva' | 'Corretiva' }) {
  const db = await requireDb();
  const rows = await db.insert(maintenanceReasons).values({ ...input, active: true }).returning();
  return rows[0];
}

export async function updateMaintenanceReason(id: number, input: Partial<{ name: string; description: string | null; category: 'Preventiva' | 'Corretiva'; active: boolean }>) {
  const db = await requireDb();
  const rows = await db.update(maintenanceReasons).set(input).where(eq(maintenanceReasons.id, id)).returning();
  return rows[0] ?? null;
}

export async function archiveMaintenanceReason(id: number) {
  return updateMaintenanceReason(id, { active: false });
}
