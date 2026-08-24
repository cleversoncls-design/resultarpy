import { eq } from 'drizzle-orm';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleMysql } from 'drizzle-orm/mysql2';
import { Pool } from 'pg';
import mysql, { type Pool as MysqlPool, type RowDataPacket } from 'mysql2/promise';
import { users, type InsertUser, type User } from '../drizzle/schema';
import { ENV } from './_core/env';

let postgresPool: Pool | null = null;
let postgresDb: ReturnType<typeof drizzlePostgres> | null = null;
let mysqlPool: MysqlPool | null = null;

type MysqlUserRow = RowDataPacket & {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  role: 'user' | 'admin' | string;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

function isPostgresUrl(value: string) {
  return value.startsWith('postgres://') || value.startsWith('postgresql://');
}

function isMysqlUrl(value: string) {
  return value.startsWith('mysql://') || value.startsWith('mysql2://');
}

function normalizeMysqlUser(row: MysqlUserRow): User {
  return {
    id: Number(row.id),
    openId: row.openId,
    name: row.name,
    email: row.email,
    loginMethod: row.loginMethod,
    role: row.role === 'admin' ? 'admin' : 'user',
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    lastSignedIn: new Date(row.lastSignedIn),
  };
}

async function getPostgresDb() {
  const connectionString = process.env.DATABASE_URL ?? ENV.databaseUrl;
  if (!postgresDb && connectionString && isPostgresUrl(connectionString)) {
    postgresPool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    postgresPool.on('error', (error) => {
      console.error('[Database] Unexpected PostgreSQL pool error:', error);
    });
    postgresDb = drizzlePostgres(postgresPool);
  }
  return postgresDb;
}

async function getMysqlPool() {
  const connectionString = process.env.DATABASE_URL ?? ENV.databaseUrl;
  if (!mysqlPool && connectionString && isMysqlUrl(connectionString)) {
    mysqlPool = mysql.createPool({
      uri: connectionString,
      waitForConnections: true,
      connectionLimit: Number(process.env.DATABASE_POOL_MAX ?? 10),
    });
  }
  return mysqlPool;
}

/** Returns the PostgreSQL Drizzle client used by migrated domain repositories. */
export async function getDb() {
  return getPostgresDb();
}

export async function closeDb() {
  if (postgresPool) {
    await postgresPool.end();
    postgresPool = null;
    postgresDb = null;
  }
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
  }
}

async function upsertMysqlUser(user: InsertUser) {
  const pool = await getMysqlPool();
  if (!pool) return false;
  await pool.execute(
    `INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = COALESCE(VALUES(name), name),
       email = COALESCE(VALUES(email), email),
       loginMethod = COALESCE(VALUES(loginMethod), loginMethod),
       role = COALESCE(VALUES(role), role),
       lastSignedIn = VALUES(lastSignedIn),
       updatedAt = CURRENT_TIMESTAMP`,
    [
      user.openId,
      user.name ?? null,
      user.email ?? null,
      user.loginMethod ?? null,
      user.role ?? (user.openId === ENV.ownerOpenId ? 'admin' : 'user'),
      user.lastSignedIn ?? new Date(),
    ],
  );
  return true;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error('User openId is required for upsert');

  const postgres = await getPostgresDb();
  if (postgres) {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Partial<InsertUser> = {};
    const textFields = ['name', 'email', 'loginMethod'] as const;
    for (const field of textFields) {
      if (user[field] !== undefined) {
        values[field] = user[field] ?? null;
        updateSet[field] = user[field] ?? null;
      }
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    values.lastSignedIn ??= new Date();
    updateSet.lastSignedIn ??= new Date();
    await postgres.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
    return;
  }

  if (await upsertMysqlUser(user)) return;
  console.warn('[Database] Cannot upsert user: no supported database URL is available');
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const postgres = await getPostgresDb();
  if (postgres) {
    const result = await postgres.select().from(users).where(eq(users.openId, openId)).limit(1);
    return result[0];
  }

  const pool = await getMysqlPool();
  if (pool) {
    const [rows] = await pool.execute<MysqlUserRow[]>(
      'SELECT id, openId, name, email, loginMethod, role, createdAt, updatedAt, lastSignedIn FROM users WHERE openId = ? LIMIT 1',
      [openId],
    );
    return rows.length > 0 ? normalizeMysqlUser(rows[0]) : undefined;
  }

  console.warn('[Database] Cannot get user: no supported database URL is available');
  return undefined;
}
