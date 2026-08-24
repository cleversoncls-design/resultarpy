CREATE TYPE "public"."auth_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."fleet_event_type" AS ENUM('Multa', 'Avaria', 'Outro');--> statement-breakpoint
CREATE TYPE "public"."maintenance_category" AS ENUM('Preventiva', 'Corretiva');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('Reservado', 'Em viagem', 'Finalizada', 'Cancelada');--> statement-breakpoint
CREATE TYPE "public"."trip_status" AS ENUM('Rascunho', 'Aguardando aprovação', 'Aprovada', 'Em preparação', 'Em prestação', 'Finalizada', 'Rejeitada');--> statement-breakpoint
CREATE TYPE "public"."vehicle_status" AS ENUM('Disponível', 'Reservado', 'Em viagem', 'Realizar Manutenção', 'Em manutenção', 'Extintor próximo do vencimento', 'Avaria registrada');--> statement-breakpoint
CREATE TABLE "client_billing_limits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_id" bigint NOT NULL,
	"expense_type_id" bigint NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(180) NOT NULL,
	"billing_currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense_types" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"reservation_id" bigint NOT NULL,
	"event_type" "fleet_event_type" NOT NULL,
	"description" text NOT NULL,
	"photo_uri" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_reservations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"trip_id" bigint NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"driver_id" bigint NOT NULL,
	"status" "reservation_status" DEFAULT 'Reservado' NOT NULL,
	"departure_at" timestamp with time zone,
	"departure_km" integer,
	"return_at" timestamp with time zone,
	"return_km" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fleet_work_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"vehicle_id" bigint NOT NULL,
	"reason_id" bigint,
	"maintenance_type" "maintenance_category" NOT NULL,
	"maintenance_date" date NOT NULL,
	"vehicle_km" integer NOT NULL,
	"observation" text,
	"cost_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_reasons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(160) NOT NULL,
	"category" "maintenance_category" NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursement_limits" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"expense_type_id" bigint NOT NULL,
	"city" varchar(120) NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travelers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"unit_id" bigint,
	"name" varchar(160) NOT NULL,
	"document_number" varchar(40),
	"can_drive" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_expenses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"trip_id" bigint NOT NULL,
	"expense_type_id" bigint NOT NULL,
	"occurred_on" date NOT NULL,
	"city" varchar(120) NOT NULL,
	"quantity" numeric(12, 2) DEFAULT '1' NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"receipt_uri" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"trip_code" varchar(40) NOT NULL,
	"traveler_id" bigint NOT NULL,
	"approver_id" bigint,
	"client_id" bigint,
	"origin" varchar(120) NOT NULL,
	"destination" varchar(120) NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date NOT NULL,
	"status" "trip_status" NOT NULL,
	"requires_fleet_vehicle" boolean DEFAULT false NOT NULL,
	"advance_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(160) NOT NULL,
	"city" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "auth_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"plate" varchar(16) NOT NULL,
	"brand" varchar(80) NOT NULL,
	"model" varchar(100) NOT NULL,
	"model_year" integer NOT NULL,
	"color" varchar(60),
	"unit_id" bigint NOT NULL,
	"current_km" integer DEFAULT 0 NOT NULL,
	"last_maintenance_km" integer DEFAULT 0 NOT NULL,
	"maintenance_interval_km" integer NOT NULL,
	"fire_extinguisher_expires_on" date,
	"status" "vehicle_status" DEFAULT 'Disponível' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_billing_limits" ADD CONSTRAINT "client_billing_limits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_billing_limits" ADD CONSTRAINT "client_billing_limits_expense_type_id_expense_types_id_fk" FOREIGN KEY ("expense_type_id") REFERENCES "public"."expense_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_events" ADD CONSTRAINT "fleet_events_reservation_id_fleet_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."fleet_reservations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_reservations" ADD CONSTRAINT "fleet_reservations_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_reservations" ADD CONSTRAINT "fleet_reservations_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_reservations" ADD CONSTRAINT "fleet_reservations_driver_id_travelers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."travelers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_work_orders" ADD CONSTRAINT "fleet_work_orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fleet_work_orders" ADD CONSTRAINT "fleet_work_orders_reason_id_maintenance_reasons_id_fk" FOREIGN KEY ("reason_id") REFERENCES "public"."maintenance_reasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_limits" ADD CONSTRAINT "reimbursement_limits_expense_type_id_expense_types_id_fk" FOREIGN KEY ("expense_type_id") REFERENCES "public"."expense_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_expense_type_id_expense_types_id_fk" FOREIGN KEY ("expense_type_id") REFERENCES "public"."expense_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_traveler_id_travelers_id_fk" FOREIGN KEY ("traveler_id") REFERENCES "public"."travelers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_approver_id_users_id_fk" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_billing_limits_client_expense_unique" ON "client_billing_limits" USING btree ("client_id","expense_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_name_unique" ON "clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_active_idx" ON "clients" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "expense_types_name_unique" ON "expense_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "expense_types_active_idx" ON "expense_types" USING btree ("active");--> statement-breakpoint
CREATE INDEX "fleet_work_orders_vehicle_date_idx" ON "fleet_work_orders" USING btree ("vehicle_id","maintenance_date");--> statement-breakpoint
CREATE UNIQUE INDEX "maintenance_reasons_name_unique" ON "maintenance_reasons" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "reimbursement_limits_expense_city_unique" ON "reimbursement_limits" USING btree ("expense_type_id","city");--> statement-breakpoint
CREATE INDEX "travelers_name_idx" ON "travelers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "travelers_active_idx" ON "travelers" USING btree ("active");--> statement-breakpoint
CREATE INDEX "trip_expenses_trip_date_idx" ON "trip_expenses" USING btree ("trip_id","occurred_on");--> statement-breakpoint
CREATE UNIQUE INDEX "trips_trip_code_unique" ON "trips" USING btree ("trip_code");--> statement-breakpoint
CREATE INDEX "trips_status_idx" ON "trips" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "units_code_unique" ON "units" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_open_id_unique" ON "users" USING btree ("openId");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicles_plate_unique" ON "vehicles" USING btree ("plate");--> statement-breakpoint
CREATE INDEX "vehicles_status_idx" ON "vehicles" USING btree ("status");