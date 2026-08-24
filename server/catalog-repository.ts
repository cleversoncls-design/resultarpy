import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  clients,
  expenseTypes,
  travelers,
  units,
  type InsertClient,
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
  const [items, countRows] = await Promise.all([
    db.select().from(travelers).where(where).orderBy(order).limit(input.pageSize).offset(pageOffset(input)),
    db.select({ count: sql<number>`count(*)` }).from(travelers).where(where),
  ]);
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
