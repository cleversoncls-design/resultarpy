import { desc, eq } from 'drizzle-orm';
import { emailLog, emailSettings, fleetReservations, travelers, trips, users, vehicles } from '../drizzle/schema';
import { getDb } from './db';
import { decryptSecret, encryptSecret } from './email-crypto';
import { sendSmtpMail, type SmtpConfig, type SmtpSecurity } from './smtp-client';

export type EmailEvent = 'trip_requested' | 'trip_approved' | 'trip_released' | 'closure_submitted' | 'test';

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error('Banco de dados não configurado.');
  return db;
}

const EMAIL_PATTERN = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
export const isValidEmail = (value: string) => value.length <= 320 && EMAIL_PATTERN.test(value);

// Aceita um e-mail por linha ou separados por vírgula/ponto e vírgula.
export function parseRecipients(raw: string) {
  const unique = new Set<string>();
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim().toLowerCase();
    if (email && isValidEmail(email)) unique.add(email);
  }
  return [...unique];
}

export function invalidRecipients(raw: string) {
  return raw.split(/[\s,;]+/).map((part) => part.trim()).filter((part) => part && !isValidEmail(part));
}

export type EmailSettingsInput = {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: SmtpSecurity;
  smtpUser: string;
  // undefined/vazio = manter a senha já guardada.
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
  adminRecipients: string;
};

export async function getEmailSettingsRow() {
  const db = await requireDb();
  const [row] = await db.select().from(emailSettings).where(eq(emailSettings.id, 1)).limit(1);
  if (row) return row;
  const [created] = await db.insert(emailSettings).values({ id: 1 }).onConflictDoNothing().returning();
  if (created) return created;
  const [again] = await db.select().from(emailSettings).where(eq(emailSettings.id, 1)).limit(1);
  if (!again) throw new Error('Não foi possível carregar a configuração de e-mail.');
  return again;
}

// Versão segura para as telas: nunca inclui a senha, só se ela existe.
export async function getPublicEmailSettings() {
  const { smtpPasswordEnc, ...row } = await getEmailSettingsRow();
  return { ...row, hasPassword: Boolean(smtpPasswordEnc) };
}

export async function saveEmailSettings(input: EmailSettingsInput) {
  await getEmailSettingsRow();
  const db = await requireDb();
  const password = input.smtpPassword?.trim() ? input.smtpPassword : undefined;
  await db.update(emailSettings).set({
    enabled: input.enabled,
    smtpHost: input.smtpHost.trim(),
    smtpPort: input.smtpPort,
    smtpSecurity: input.smtpSecurity,
    smtpUser: input.smtpUser.trim(),
    ...(password !== undefined ? { smtpPasswordEnc: encryptSecret(password) } : {}),
    fromEmail: input.fromEmail.trim(),
    fromName: input.fromName.trim(),
    adminRecipients: input.adminRecipients.trim(),
    updatedAt: new Date(),
  }).where(eq(emailSettings.id, 1));
  return getPublicEmailSettings();
}

type SettingsRow = Awaited<ReturnType<typeof getEmailSettingsRow>>;

function toSmtpConfig(row: SettingsRow): SmtpConfig {
  if (!row.smtpHost.trim() || !row.smtpPort || !isValidEmail(row.fromEmail.trim())) {
    throw new Error('Configuração SMTP incompleta: informe servidor, porta e e-mail de origem válidos.');
  }
  const security: SmtpSecurity = row.smtpSecurity === 'starttls' || row.smtpSecurity === 'none' ? row.smtpSecurity : 'ssl';
  return {
    host: row.smtpHost.trim(),
    port: row.smtpPort,
    security,
    user: row.smtpUser.trim(),
    password: row.smtpPasswordEnc ? decryptSecret(row.smtpPasswordEnc) : '',
    fromEmail: row.fromEmail.trim(),
    fromName: row.fromName.trim(),
  };
}

async function writeLog(entry: { event: EmailEvent; to: string[]; subject: string; ok: boolean; error?: string; tripId?: number }) {
  try {
    const db = await requireDb();
    await db.insert(emailLog).values({
      event: entry.event,
      toEmail: entry.to.join(', ').slice(0, 1000),
      subject: entry.subject.slice(0, 300),
      status: entry.ok ? 'sent' : 'error',
      error: entry.error ?? null,
      tripId: entry.tripId ?? null,
    });
  } catch (error) {
    console.error('[email] não foi possível gravar o registro de envio', error);
  }
}

type Outgoing = { event: EmailEvent; to: string[]; subject: string; text: string; tripId?: number };

// Envia e registra o resultado. Com "force" (teste) envia mesmo com o
// serviço desativado; sem ele, serviço desativado = não faz nada.
async function deliver(mail: Outgoing, options: { force?: boolean } = {}) {
  const row = await getEmailSettingsRow();
  if (!row.enabled && !options.force) return { sent: false as const, skipped: true as const };
  if (!mail.to.length) return { sent: false as const, skipped: true as const };
  try {
    await sendSmtpMail(toSmtpConfig(row), { to: mail.to, subject: mail.subject, text: mail.text });
    await writeLog({ ...mail, ok: true });
    return { sent: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await writeLog({ ...mail, ok: false, error: message });
    throw error;
  }
}

export async function sendTestEmail(to: string) {
  const db = await requireDb();
  const row = await getEmailSettingsRow();
  const subject = 'Teste de e-mail — Controle de Viagens';
  const text = 'Este é um e-mail de teste do Controle de Viagens.\n\nSe você recebeu esta mensagem, a configuração SMTP está funcionando.';
  try {
    await deliver({ event: 'test', to: [to], subject, text }, { force: true });
    await db.update(emailSettings).set({ lastTestAt: new Date(), lastTestOk: true, lastTestMessage: `Enviado para ${to}` }).where(eq(emailSettings.id, row.id));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.update(emailSettings).set({ lastTestAt: new Date(), lastTestOk: false, lastTestMessage: message.slice(0, 1000) }).where(eq(emailSettings.id, row.id));
    throw error;
  }
}

export async function listEmailLog(input: { page: number; pageSize: number }) {
  const db = await requireDb();
  const rows = await db.select().from(emailLog).orderBy(desc(emailLog.createdAt), desc(emailLog.id)).limit(input.pageSize + 1).offset((input.page - 1) * input.pageSize);
  return { items: rows.slice(0, input.pageSize), hasMore: rows.length > input.pageSize, page: input.page };
}

// ---------------------------------------------------------------------------
// Avisos do fluxo de viagem. Todos são "disparar e esquecer": falha de e-mail
// (servidor fora do ar, config errada...) é registrada no log, mas nunca
// atrapalha a operação que originou o aviso (criar, aprovar, liberar...).
// ---------------------------------------------------------------------------

async function loadTripContext(tripId: number) {
  const db = await requireDb();
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (!trip) return undefined;
  const [traveler] = await db.select().from(travelers).where(eq(travelers.id, trip.travelerId)).limit(1);
  const [travelerUser] = traveler?.userId ? await db.select().from(users).where(eq(users.id, traveler.userId)).limit(1) : [];
  const [approver] = trip.approverId ? await db.select().from(users).where(eq(users.id, trip.approverId)).limit(1) : [];
  return { trip, travelerName: traveler?.name ?? 'Viajante', travelerEmail: travelerUser?.email ?? undefined, approverEmail: approver?.email ?? undefined, approverName: approver?.name ?? undefined };
}

type TripContext = NonNullable<Awaited<ReturnType<typeof loadTripContext>>>;

const formatDate = (value: string) => value.split('-').reverse().join('/');
const money = (value: string | null | undefined) => (value ? Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');

function tripSummary(context: TripContext) {
  const { trip } = context;
  const link = process.env.APP_PUBLIC_URL?.replace(/\/+$/, '');
  return [
    `Viagem: ${trip.tripCode}`,
    `Viajante: ${context.travelerName}`,
    `Destino: ${trip.origin ? `${trip.origin} → ` : ''}${trip.destination}`,
    `Período: ${formatDate(trip.startsOn)} a ${formatDate(trip.endsOn)}`,
    ...(link ? ['', `Acesse o sistema: ${link}`] : []),
  ].join('\n');
}

async function adminRecipients() {
  return parseRecipients((await getEmailSettingsRow()).adminRecipients);
}

async function notifyTripRequestedNow(tripId: number) {
  const context = await loadTripContext(tripId);
  if (!context) return;
  const to = context.approverEmail ? parseRecipients(context.approverEmail) : [];
  await deliver({
    event: 'trip_requested', tripId, to,
    subject: `Solicitação de viagem aguardando sua aprovação — ${context.trip.tripCode}`,
    text: `${context.approverName ? `Olá, ${context.approverName}.` : 'Olá.'}\n\n${context.travelerName} solicitou uma viagem que aguarda a sua aprovação.\n\n${tripSummary(context)}\n`,
  });
}

async function notifyTripApprovedNow(tripId: number) {
  const context = await loadTripContext(tripId);
  if (!context) return;
  const flags = [context.trip.requiresFleetVehicle ? 'veículo da frota' : '', context.trip.hasAdvance ? `adiantamento (${money(context.trip.advanceAmount)})` : '', context.trip.needsHotel ? 'hotel' : ''].filter(Boolean);
  await deliver({
    event: 'trip_approved', tripId, to: await adminRecipients(),
    subject: `Viagem aprovada — definir os dados da viagem — ${context.trip.tripCode}`,
    text: `A viagem abaixo foi aprovada e aguarda a definição dos dados pelo Administrativo.\n\n${tripSummary(context)}\n\nPendências a definir: ${flags.length ? flags.join(', ') : 'nenhuma exigida na solicitação'}.\n`,
  });
}

async function notifyTripReleasedNow(tripId: number) {
  const context = await loadTripContext(tripId);
  if (!context) return;
  const db = await requireDb();
  const [reservation] = await db.select({ plate: vehicles.plate, brand: vehicles.brand, model: vehicles.model }).from(fleetReservations).innerJoin(vehicles, eq(fleetReservations.vehicleId, vehicles.id)).where(eq(fleetReservations.tripId, tripId)).limit(1);
  const details = [
    ...(context.trip.requiresFleetVehicle ? [`Veículo: ${reservation ? `${reservation.brand} ${reservation.model} — placa ${reservation.plate}` : 'a definir'}`] : []),
    ...(context.trip.hasAdvance ? [`Adiantamento depositado: ${money(context.trip.advanceConfirmedAmount ?? context.trip.advanceAmount)}`] : []),
    ...(context.trip.needsHotel && context.trip.hotelNote ? [`Hotel:\n${context.trip.hotelNote.trim()}`] : []),
  ];
  await deliver({
    event: 'trip_released', tripId, to: context.travelerEmail ? parseRecipients(context.travelerEmail) : [],
    subject: `Sua viagem está liberada — ${context.trip.tripCode}`,
    text: `Olá, ${context.travelerName}.\n\nO Administrativo concluiu a definição da sua viagem. Ela está liberada.\n\n${tripSummary(context)}\n${details.length ? `\n${details.join('\n')}\n` : ''}`,
  });
}

async function notifyClosureSubmittedNow(tripId: number) {
  const context = await loadTripContext(tripId);
  if (!context) return;
  await deliver({
    event: 'closure_submitted', tripId, to: await adminRecipients(),
    subject: `Prestação de contas enviada — ${context.trip.tripCode}`,
    text: `${context.travelerName} enviou a prestação de contas da viagem abaixo para validação.\n\n${tripSummary(context)}\n`,
  });
}

function fireAndForget(label: string, task: Promise<unknown>) {
  task.catch((error) => console.error(`[email] aviso "${label}" não enviado:`, error instanceof Error ? error.message : error));
}

export const notifyTripRequested = (tripId: number) => fireAndForget('trip_requested', notifyTripRequestedNow(tripId));
export const notifyTripApproved = (tripId: number) => fireAndForget('trip_approved', notifyTripApprovedNow(tripId));
export const notifyTripReleased = (tripId: number) => fireAndForget('trip_released', notifyTripReleasedNow(tripId));
export const notifyClosureSubmitted = (tripId: number) => fireAndForget('closure_submitted', notifyClosureSubmittedNow(tripId));
