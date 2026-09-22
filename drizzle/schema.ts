import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const organizationSettings = pgTable("organization_settings", {
  id: integer("id").primaryKey().default(1),
  globalCurrency: varchar("global_currency", { length: 3 }).default("BRL").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authRoleEnum = pgEnum("auth_role", ["user", "admin"]);
export const tripStatusEnum = pgEnum("trip_status", [
  "Rascunho",
  "Aguardando aprovação",
  "Aprovada",
  "Em preparação",
  "Liberada para viagem",
  "Em prestação",
  "Finalizada",
  "Rejeitada",
  "Devolvida",
]);
export const approvalDecisionEnum = pgEnum("approval_decision", ["Aprovada", "Rejeitada", "Devolvida"]);
export const maintenanceCategoryEnum = pgEnum("maintenance_category", ["Preventiva", "Corretiva"]);
export const vehicleStatusEnum = pgEnum("vehicle_status", [
  "Disponível",
  "Reservado",
  "Em viagem",
  "Realizar Manutenção",
  "Em manutenção",
  "Extintor próximo do vencimento",
  "Avaria registrada",
]);
export const reservationStatusEnum = pgEnum("reservation_status", [
  "Aguardando veículo",
  "Reservado",
  "Reservada",
  "Em viagem",
  "Finalizada",
  "Cancelada",
]);
export const fleetWorkOrderStatusEnum = pgEnum("fleet_work_order_status", ["Em andamento", "Concluída", "Cancelada"]);
export const fleetEventTypeEnum = pgEnum("fleet_event_type", ["Multa", "Avaria", "Outro"]);

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    openId: varchar("openId", { length: 64 }).notNull(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: authRoleEnum("role").default("user").notNull(),
    profile: varchar("profile", { length: 32 }).default("traveler_approver").notNull(),
    birthDate: date("birth_date"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    openIdUnique: uniqueIndex("users_open_id_unique").on(table.openId),
  }),
);

export const localAuthCredentials = pgTable(
  "local_auth_credentials",
  {
    userId: bigint("user_id", { mode: "number" })
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    normalizedEmail: varchar("normalized_email", { length: 320 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ emailUnique: uniqueIndex("local_auth_credentials_email_unique").on(table.normalizedEmail) }),
);

export const localAuthSessions = pgTable(
  "local_auth_sessions",
  {
    tokenHash: varchar("token_hash", { length: 128 }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({ userExpiryIndex: index("local_auth_sessions_user_expiry_idx").on(table.userId, table.expiresAt) }),
);

export const units = pgTable(
  "units",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ codeUnique: uniqueIndex("units_code_unique").on(table.code) }),
);

// Cadastro independente de cidades, usado como "Ciudad de atención" no
// lançamento de despesas — nem toda cidade onde há gasto tem uma Unidade
// própria cadastrada (ex.: atendimentos comerciais em várias cidades).
export const cities = pgTable(
  "cities",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ nameUnique: uniqueIndex("cities_name_unique").on(table.name) }),
);

export const travelers = pgTable(
  "travelers",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" }).references(() => users.id),
    unitId: bigint("unit_id", { mode: "number" }).references(() => units.id),
    name: varchar("name", { length: 160 }).notNull(),
    documentNumber: varchar("document_number", { length: 40 }),
    canDrive: boolean("can_drive").default(false).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameIndex: index("travelers_name_idx").on(table.name),
    activeIndex: index("travelers_active_idx").on(table.active),
  }),
);

export const clients = pgTable(
  "clients",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 180 }).notNull(),
    billingCurrency: varchar("billing_currency", { length: 3 }).default("BRL").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex("clients_name_unique").on(table.name),
    activeIndex: index("clients_active_idx").on(table.active),
  }),
);

export const expenseTypes = pgTable(
  "expense_types",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex("expense_types_name_unique").on(table.name),
    activeIndex: index("expense_types_active_idx").on(table.active),
  }),
);

export const clientBillingLimits = pgTable(
  "client_billing_limits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    clientId: bigint("client_id", { mode: "number" }).notNull().references(() => clients.id, { onDelete: "cascade" }),
    expenseTypeId: bigint("expense_type_id", { mode: "number" }).notNull().references(() => expenseTypes.id),
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
  },
  (table) => ({
    clientExpenseUnique: uniqueIndex("client_billing_limits_client_expense_unique").on(
      table.clientId,
      table.expenseTypeId,
    ),
  }),
);

export const clientBillingProfiles = pgTable(
  "client_billing_profiles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    clientId: bigint("client_id", { mode: "number" }).notNull().references(() => clients.id, { onDelete: "cascade" }),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ clientUnique: uniqueIndex("client_billing_profiles_client_unique").on(table.clientId) }),
);

export const clientBillingProfileItems = pgTable(
  "client_billing_profile_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" }).notNull().references(() => clientBillingProfiles.id, { onDelete: "cascade" }),
    expenseTypeId: bigint("expense_type_id", { mode: "number" }).notNull().references(() => expenseTypes.id),
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ profileExpenseUnique: uniqueIndex("client_billing_profile_items_profile_expense_unique").on(table.profileId, table.expenseTypeId) }),
);

export const reimbursementLimits = pgTable(
  "reimbursement_limits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    expenseTypeId: bigint("expense_type_id", { mode: "number" }).notNull().references(() => expenseTypes.id),
    city: varchar("city", { length: 120 }).notNull(),
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
  },
  (table) => ({
    expenseCityUnique: uniqueIndex("reimbursement_limits_expense_city_unique").on(table.expenseTypeId, table.city),
  }),
);

export const reimbursementLimitProfiles = pgTable(
  "reimbursement_limit_profiles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    city: varchar("city", { length: 120 }).default("").notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ cityCurrencyUnique: uniqueIndex("reimbursement_limit_profiles_city_currency_unique").on(table.city, table.currency) }),
);

export const reimbursementLimitProfileItems = pgTable(
  "reimbursement_limit_profile_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: bigint("profile_id", { mode: "number" }).notNull().references(() => reimbursementLimitProfiles.id, { onDelete: "cascade" }),
    expenseTypeId: bigint("expense_type_id", { mode: "number" }).notNull().references(() => expenseTypes.id),
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ profileExpenseUnique: uniqueIndex("reimbursement_limit_profile_items_profile_expense_unique").on(table.profileId, table.expenseTypeId) }),
);

export const currencyRates = pgTable(
  "currency_rates",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    rateDate: date("rate_date").notNull(),
    fromCurrency: varchar("from_currency", { length: 3 }).notNull(),
    toCurrency: varchar("to_currency", { length: 3 }).default("PYG").notNull(),
    rate: numeric("rate", { precision: 20, scale: 8 }).notNull(),
    rateType: varchar("rate_type", { length: 20 }).default("venda").notNull(),
    source: varchar("source", { length: 20 }).notNull(),
    sourceUrl: text("source_url"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ rateDateCurrencyUnique: uniqueIndex("currency_rates_date_from_to_unique").on(table.rateDate, table.fromCurrency, table.toCurrency), rateDateIndex: index("currency_rates_date_idx").on(table.rateDate) }),
);

export const translationEntries = pgTable(
  "translation_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    translationKey: varchar("translation_key", { length: 240 }).notNull(),
    spanish: text("spanish").notNull(),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ keyUnique: uniqueIndex("translation_entries_key_unique").on(table.translationKey) }),
);

export const trips = pgTable(
  "trips",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tripCode: varchar("trip_code", { length: 40 }).notNull(),
    travelerId: bigint("traveler_id", { mode: "number" }).notNull().references(() => travelers.id),
    approverId: bigint("approver_id", { mode: "number" }).references(() => users.id),
    clientId: bigint("client_id", { mode: "number" }).references(() => clients.id),
    unitId: bigint("unit_id", { mode: "number" }).references(() => units.id),
    origin: varchar("origin", { length: 120 }).notNull(),
    destination: varchar("destination", { length: 120 }).notNull(),
    country: varchar("country", { length: 80 }),
    area: varchar("area", { length: 120 }),
    transport: varchar("transport", { length: 120 }),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: tripStatusEnum("status").notNull(),
    requiresFleetVehicle: boolean("requires_fleet_vehicle").default(false).notNull(),
    hasAdvance: boolean("has_advance").default(false).notNull(),
    needsHotel: boolean("needs_hotel").default(false).notNull(),
    advanceAmount: numeric("advance_amount", { precision: 14, scale: 2 }).default("0").notNull(),
    advanceConfirmedAt: timestamp("advance_confirmed_at", { withTimezone: true }),
    advanceConfirmedAmount: numeric("advance_confirmed_amount", { precision: 14, scale: 2 }),
    hotelNote: text("hotel_note"),
    // Fluxo de fechamento da prestação de contas: o viajante envia, o
    // Administrativo valida os comprovantes e depois fatura — só então a
    // viagem vira "Finalizada". Sem enum novo: cada etapa é marcada pela
    // data em que aconteceu (null = ainda não aconteceu).
    closureSubmittedAt: timestamp("closure_submitted_at", { withTimezone: true }),
    receiptsValidatedAt: timestamp("receipts_validated_at", { withTimezone: true }),
    billedAt: timestamp("billed_at", { withTimezone: true }),
    flightDetails: jsonb("flight_details").$type<{ passengerName?: string; passengerDocument?: string; passengerBirthDate?: string; airline?: string; flightNumber?: string; departureAirport?: string; arrivalAirport?: string } | null>(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tripCodeUnique: uniqueIndex("trips_trip_code_unique").on(table.tripCode),
    statusIndex: index("trips_status_idx").on(table.status),
  }),
);

export const tripExpenses = pgTable(
  "trip_expenses",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tripId: bigint("trip_id", { mode: "number" }).notNull().references(() => trips.id, { onDelete: "cascade" }),
    expenseTypeId: bigint("expense_type_id", { mode: "number" }).notNull().references(() => expenseTypes.id),
    occurredOn: date("occurred_on").notNull(),
    city: varchar("city", { length: 120 }).notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2 }).default("1").notNull(),
    unitValue: numeric("unit_value", { precision: 14, scale: 2 }).notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("BRL").notNull(),
    expenseGroup: varchar("expense_group", { length: 120 }),
    prepaid: boolean("prepaid").default(false).notNull(),
    billable: boolean("billable").default(true).notNull(),
    receiptUri: text("receipt_uri"),
    notes: text("notes"),
    reviewNote: text("review_note"),
    // Quando o Administrativo considera o comprovante inválido durante a
    // conferência do reembolso — o gasto passa a não contar mais no total
    // a reembolsar, e aparece como "Rejeitado" para o viajante.
    reimbursementRejectedAt: timestamp("reimbursement_rejected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tripDateIndex: index("trip_expenses_trip_date_idx").on(table.tripId, table.occurredOn),
  }),
);

export const tripApprovals = pgTable(
  "trip_approvals",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tripId: bigint("trip_id", { mode: "number" }).notNull().references(() => trips.id, { onDelete: "cascade" }),
    approverId: bigint("approver_id", { mode: "number" }).notNull().references(() => users.id),
    decision: approvalDecisionEnum("decision").notNull(),
    comment: text("comment"),
    decidedAt: timestamp("decided_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({ tripApproverUnique: uniqueIndex("trip_approvals_trip_approver_unique").on(table.tripId, table.approverId) }),
);

export const maintenanceReasons = pgTable(
  "maintenance_reasons",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    category: maintenanceCategoryEnum("category").notNull(),
    active: boolean("active").default(true).notNull(),
  },
  (table) => ({ nameUnique: uniqueIndex("maintenance_reasons_name_unique").on(table.name) }),
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    plate: varchar("plate", { length: 16 }).notNull(),
    brand: varchar("brand", { length: 80 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    modelYear: integer("model_year").notNull(),
    color: varchar("color", { length: 60 }),
    unitId: bigint("unit_id", { mode: "number" }).notNull().references(() => units.id),
    currentKm: integer("current_km").default(0).notNull(),
    lastMaintenanceKm: integer("last_maintenance_km").default(0).notNull(),
    maintenanceIntervalKm: integer("maintenance_interval_km").notNull(),
    fireExtinguisherExpiresOn: date("fire_extinguisher_expires_on"),
    status: vehicleStatusEnum("status").default("Disponível").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    plateUnique: uniqueIndex("vehicles_plate_unique").on(table.plate),
    statusIndex: index("vehicles_status_idx").on(table.status),
  }),
);

export const fleetReservations = pgTable(
  "fleet_reservations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tripId: bigint("trip_id", { mode: "number" }).notNull().references(() => trips.id, { onDelete: "cascade" }),
    vehicleId: bigint("vehicle_id", { mode: "number" }).references(() => vehicles.id),
    driverId: bigint("driver_id", { mode: "number" }).notNull().references(() => travelers.id),
    status: reservationStatusEnum("status").default("Reservado").notNull(),
    plannedStartOn: date("planned_start_on").notNull(),
    plannedEndOn: date("planned_end_on").notNull(),
    departureAt: timestamp("departure_at", { withTimezone: true }),
    departureKm: integer("departure_km"),
    returnAt: timestamp("return_at", { withTimezone: true }),
    returnKm: integer("return_km"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const fleetEvents = pgTable(
  "fleet_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    reservationId: bigint("reservation_id", { mode: "number" }).notNull().references(() => fleetReservations.id, { onDelete: "cascade" }),
    eventType: fleetEventTypeEnum("event_type").notNull(),
    description: text("description").notNull(),
    photoUri: text("photo_uri"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const fleetEventPhotos = pgTable(
  "fleet_event_photos",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventId: bigint("event_id", { mode: "number" }).notNull().references(() => fleetEvents.id, { onDelete: "cascade" }),
    photoUri: text("photo_uri").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
);

export const fleetWorkOrders = pgTable(
  "fleet_work_orders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    vehicleId: bigint("vehicle_id", { mode: "number" }).notNull().references(() => vehicles.id),
    reasonId: bigint("reason_id", { mode: "number" }).references(() => maintenanceReasons.id),
    maintenanceType: maintenanceCategoryEnum("maintenance_type").notNull(),
    maintenanceDate: date("maintenance_date").notNull(),
    vehicleKm: integer("vehicle_km").notNull(),
    observation: text("observation"),
    costAmount: numeric("cost_amount", { precision: 14, scale: 2 }).default("0").notNull(),
    status: fleetWorkOrderStatusEnum("status").default("Concluída").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    vehicleDateIndex: index("fleet_work_orders_vehicle_date_idx").on(table.vehicleId, table.maintenanceDate),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ClientBillingProfile = typeof clientBillingProfiles.$inferSelect;
export type ClientBillingProfileItem = typeof clientBillingProfileItems.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;
export type City = typeof cities.$inferSelect;
export type InsertCity = typeof cities.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Traveler = typeof travelers.$inferSelect;
export type InsertTraveler = typeof travelers.$inferInsert;
export type ExpenseType = typeof expenseTypes.$inferSelect;
export type InsertExpenseType = typeof expenseTypes.$inferInsert;
