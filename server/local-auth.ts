import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { and, eq } from "drizzle-orm";
import { COOKIE_NAME } from "../shared/const";
import { localAuthCredentials, localAuthSessions, users, type User } from "../drizzle/schema";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 1000 * 60 * 15;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 };

export const LOCAL_PROFILES = ['traveler', 'traveler_approver', 'approver', 'admin'] as const;
export type LocalProfile = (typeof LOCAL_PROFILES)[number];

export function normalizeProfile(profile: unknown): LocalProfile {
  return LOCAL_PROFILES.includes(profile as LocalProfile) ? profile as LocalProfile : 'traveler_approver';
}

type LocalUser = User;

type LocalAuthResult = {
  user: LocalUser;
  sessionToken: string;
};

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, SCRYPT_KEY_LENGTH, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey as Buffer);
    });
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string): string | null {
  if (password.length < 10) return "A senha deve conter pelo menos 10 caracteres.";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
    return "A senha deve conter letras maiúsculas, minúsculas e números.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  return `scrypt$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltEncoded, hashEncoded] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltEncoded || !hashEncoded) return false;
  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(hashEncoded, "base64url");
    const actual = await deriveKey(password, salt);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function setLocalSessionCookie(req: Request, res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(req),
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
  });
}

export function clearLocalSessionCookie(req: Request, res: Response) {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), sameSite: "lax", maxAge: -1 });
}

function getSessionToken(req: Request): string | undefined {
  const cookies = parseCookieHeader(req.headers.cookie ?? "");
  const token = cookies[COOKIE_NAME];
  return typeof token === "string" ? token : undefined;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("PostgreSQL database is not available");
  return db;
}

export async function authenticateLocalUser(email: string, password: string): Promise<LocalAuthResult | null> {
  const db = await requireDb();
  const normalizedEmail = normalizeEmail(email);
  const matches = await db
    .select({ user: users, credential: localAuthCredentials })
    .from(localAuthCredentials)
    .innerJoin(users, eq(localAuthCredentials.userId, users.id))
    .where(eq(localAuthCredentials.normalizedEmail, normalizedEmail))
    .limit(1);
  const match = matches[0];
  if (!match) return null;

  if (!match.user.active) return null;
  if (match.credential.lockedUntil && match.credential.lockedUntil.getTime() > Date.now()) {
    return null;
  }

  const valid = await verifyPassword(password, match.credential.passwordHash);
  if (!valid) {
    const nextAttempts = match.credential.failedAttempts + 1;
    await db
      .update(localAuthCredentials)
      .set({
        failedAttempts: nextAttempts,
        lockedUntil: nextAttempts >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_MS) : null,
        updatedAt: new Date(),
      })
      .where(eq(localAuthCredentials.userId, match.user.id));
    return null;
  }

  await db
    .update(localAuthCredentials)
    .set({ failedAttempts: 0, lockedUntil: null, updatedAt: new Date() })
    .where(eq(localAuthCredentials.userId, match.user.id));
  await db.update(users).set({ lastSignedIn: new Date(), updatedAt: new Date() }).where(eq(users.id, match.user.id));

  const token = randomBytes(32).toString("base64url");
  await db.insert(localAuthSessions).values({
    tokenHash: hashSessionToken(token),
    userId: match.user.id,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return { user: { ...match.user, lastSignedIn: new Date() }, sessionToken: token };
}

export async function getLocalUserFromRequest(req: Request): Promise<LocalUser | null> {
  const token = getSessionToken(req);
  if (!token) return null;
  const db = await requireDb();
  const tokenHash = hashSessionToken(token);
  const result = await db
    .select({ user: users, session: localAuthSessions })
    .from(localAuthSessions)
    .innerJoin(users, eq(localAuthSessions.userId, users.id))
    .where(eq(localAuthSessions.tokenHash, tokenHash))
    .limit(1);
  const match = result[0];
  if (!match || !match.user.active || match.session.revokedAt || match.session.expiresAt.getTime() <= Date.now()) return null;
  return match.user;
}

export async function revokeLocalSession(req: Request): Promise<void> {
  const token = getSessionToken(req);
  if (!token) return;
  const db = await requireDb();
  await db.update(localAuthSessions).set({ revokedAt: new Date() }).where(eq(localAuthSessions.tokenHash, hashSessionToken(token)));
}

export async function createLocalUser(input: {
  name: string;
  email: string;
  password: string;
  role?: "user" | "admin";
  profile?: LocalProfile;
  birthDate?: string | null;
}): Promise<User> {
  const db = await requireDb();
  const normalizedEmail = normalizeEmail(input.email);
  const passwordError = validatePassword(input.password);
  if (passwordError) throw new Error(passwordError);
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error("Informe um e-mail válido.");
  if (input.birthDate !== undefined && input.birthDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) throw new Error("Informe a data de nascimento em formato válido.");

  const existing = await db.select({ userId: localAuthCredentials.userId }).from(localAuthCredentials).where(eq(localAuthCredentials.normalizedEmail, normalizedEmail)).limit(1);
  if (existing[0]) throw new Error("Já existe uma conta local com este e-mail.");

  const profile = normalizeProfile(input.profile ?? (input.role === 'admin' ? 'admin' : 'traveler_approver'));
  const openId = `local:${randomUUID()}`;
  const inserted = await db
    .insert(users)
    .values({ openId, name: input.name.trim(), email: normalizedEmail, loginMethod: "local", role: profile === 'admin' ? 'admin' : 'user', profile, birthDate: input.birthDate ?? null, active: true })
    .returning();
  const user = inserted[0];
  if (!user) throw new Error("Não foi possível criar o usuário.");
  await db.insert(localAuthCredentials).values({ userId: user.id, normalizedEmail, passwordHash: await hashPassword(input.password) });
  return user;
}

export async function ensureInitialAdmin(): Promise<void> {
  const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME?.trim() || "Administrador";
  if (!email && !password) return;
  if (!email || !password) throw new Error("INITIAL_ADMIN_EMAIL e INITIAL_ADMIN_PASSWORD devem ser configurados juntos.");

  const db = await requireDb();
  const normalizedEmail = normalizeEmail(email);
  const existing = await db
    .select({ userId: localAuthCredentials.userId })
    .from(localAuthCredentials)
    .where(eq(localAuthCredentials.normalizedEmail, normalizedEmail))
    .limit(1);
  if (existing[0]) return;

  const user = await createLocalUser({ name, email: normalizedEmail, password, role: "admin" });
  console.log(`[LocalAuth] Initial administrator ensured for ${user.email}`);
}

export async function updateLocalUser(userId: number, input: { name: string; profile: LocalProfile; birthDate?: string | null }): Promise<User | null> {
  const db = await requireDb();
  const profile = normalizeProfile(input.profile);
  if (input.birthDate !== undefined && input.birthDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) throw new Error("Informe a data de nascimento em formato válido.");
  const updated = await db.update(users).set({ name: input.name.trim(), role: profile === 'admin' ? 'admin' : 'user', profile, ...(input.birthDate !== undefined ? { birthDate: input.birthDate } : {}), updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  return updated[0] ?? null;
}

export async function resetLocalUserPassword(userId: number, password: string): Promise<boolean> {
  const passwordError = validatePassword(password);
  if (passwordError) throw new Error(passwordError);
  const db = await requireDb();
  const result = await db.update(localAuthCredentials).set({ passwordHash: await hashPassword(password), failedAttempts: 0, lockedUntil: null, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(localAuthCredentials.userId, userId)).returning({ userId: localAuthCredentials.userId });
  if (!result[0]) return false;
  await db.update(localAuthSessions).set({ revokedAt: new Date() }).where(eq(localAuthSessions.userId, userId));
  return true;
}

export async function listLocalUsers(): Promise<User[]> {
  const db = await requireDb();
  return db.select().from(users).orderBy(users.createdAt);
}

export async function setLocalUserActive(userId: number, active: boolean): Promise<User | null> {
  const db = await requireDb();
  const target = (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
  if (!target) return null;
  if (!active && target.role === 'admin' && target.active) {
    const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, 'admin'), eq(users.active, true)));
    const activeAdmins = admins.filter((admin) => admin.id !== userId);
    if (activeAdmins.length === 0) throw new Error('Não é possível bloquear o último Administrador ativo.');
  }
  const updated = await db.update(users).set({ active, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
  if (!active) await db.update(localAuthSessions).set({ revokedAt: new Date() }).where(eq(localAuthSessions.userId, userId));
  return updated[0] ?? null;
}

export function publicUser(user: User) {
  return {
    id: user.id,
    openId: user.openId,
    name: user.name,
    email: user.email,
    loginMethod: user.loginMethod,
    role: user.role,
    profile: normalizeProfile(user.profile),
    birthDate: user.birthDate,
    active: user.active,
    lastSignedIn: user.lastSignedIn,
  };
}
