import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { users, type InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

function isPostgresUrl(value: string) {
  return value.startsWith("postgres://") || value.startsWith("postgresql://");
}

/**
 * Lazily creates the PostgreSQL connection so local tooling can run without a DB.
 * A non-PostgreSQL URL is ignored during the transition instead of being parsed by pg.
 */
export async function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!_db && connectionString && isPostgresUrl(connectionString)) {
    try {
      _pool = new Pool({
        connectionString,
        max: Number(process.env.DATABASE_POOL_MAX ?? 10),
        ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
      });
      _pool.on("error", (error) => {
        console.error("[Database] Unexpected PostgreSQL pool error:", error);
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect to PostgreSQL:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: PostgreSQL database is not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Partial<InsertUser> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: PostgreSQL database is not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}
