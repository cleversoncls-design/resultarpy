CREATE TABLE "client_billing_profile_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"expense_type_id" bigint NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_billing_profiles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"client_id" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_billing_profile_items" ADD CONSTRAINT "client_billing_profile_items_profile_id_client_billing_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."client_billing_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_billing_profile_items" ADD CONSTRAINT "client_billing_profile_items_expense_type_id_expense_types_id_fk" FOREIGN KEY ("expense_type_id") REFERENCES "public"."expense_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_billing_profiles" ADD CONSTRAINT "client_billing_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_billing_profile_items_profile_expense_unique" ON "client_billing_profile_items" USING btree ("profile_id","expense_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_billing_profiles_client_unique" ON "client_billing_profiles" USING btree ("client_id");
--> statement-breakpoint
INSERT INTO "client_billing_profiles" ("client_id", "currency")
SELECT c."client_id", COALESCE(MAX(cl."billing_currency"), 'BRL')
FROM "client_billing_limits" c
INNER JOIN "clients" cl ON cl."id" = c."client_id"
GROUP BY c."client_id"
ON CONFLICT ("client_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "client_billing_profile_items" ("profile_id", "expense_type_id", "limit_amount")
SELECT p."id", c."expense_type_id", c."limit_amount"
FROM "client_billing_limits" c
INNER JOIN "client_billing_profiles" p ON p."client_id" = c."client_id"
ON CONFLICT ("profile_id", "expense_type_id") DO NOTHING;
