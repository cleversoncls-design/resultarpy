import {
  bigint,
  bigserial,
  boolean,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const authRoleEnum = pgEnum("auth_role", ["user", "admin"]);
export const tripStatusEnum = pgEnum("trip_status", [
  "Rascunho",
  "Aguardando aprovação",
  "Aprovada",
  "Em preparação",
  "Em prestação",
  "Finalizada",
  "Rejeitada",
]);
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
  "Reservado",
  "Em viagem",
  "Finalizada",
  "Cancelada",
]);
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
    createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    openIdUnique: uniqueIndex("users_open_id_unique").on(table.openId),
  }),
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

export const trips = pgTable(
  "trips",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    tripCode: varchar("trip_code", { length: 40 }).notNull(),
    travelerId: bigint("traveler_id", { mode: "number" }).notNull().references(() => travelers.id),
    approverId: bigint("approver_id", { mode: "number" }).references(() => users.id),
    clientId: bigint("client_id", { mode: "number" }).references(() => clients.id),
    origin: varchar("origin", { length: 120 }).notNull(),
    destination: varchar("destination", { length: 120 }).notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    status: tripStatusEnum("status").notNull(),
    requiresFleetVehicle: boolean("requires_fleet_vehicle").default(false).notNull(),
    advanceAmount: numeric("advance_amount", { precision: 14, scale: 2 }).default("0").notNull(),
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
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    receiptUri: text("receipt_uri"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tripDateIndex: index("trip_expenses_trip_date_idx").on(table.tripId, table.occurredOn),
  }),
);

export const maintenanceReasons = pgTable(
  "maintenance_reasons",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
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
    vehicleId: bigint("vehicle_id", { mode: "number" }).notNull().references(() => vehicles.id),
    driverId: bigint("driver_id", { mode: "number" }).notNull().references(() => travelers.id),
    status: reservationStatusEnum("status").default("Reservado").notNull(),
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
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    vehicleDateIndex: index("fleet_work_orders_vehicle_date_idx").on(table.vehicleId, table.maintenanceDate),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;
export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;
export type Traveler = typeof travelers.$inferSelect;
export type InsertTraveler = typeof travelers.$inferInsert;
export type ExpenseType = typeof expenseTypes.$inferSelect;
export type InsertExpenseType = typeof expenseTypes.$inferInsert;
