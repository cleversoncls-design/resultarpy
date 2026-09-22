CREATE TABLE "currency_rates" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"rate_date" date NOT NULL,
	"from_currency" varchar(3) NOT NULL,
	"to_currency" varchar(3) DEFAULT 'PYG' NOT NULL,
	"rate" numeric(20, 8) NOT NULL,
	"rate_type" varchar(20) DEFAULT 'venda' NOT NULL,
	"source" varchar(20) NOT NULL,
	"source_url" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursement_limit_profile_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" bigint NOT NULL,
	"expense_type_id" bigint NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reimbursement_limit_profiles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"city" varchar(120) DEFAULT '' NOT NULL,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reimbursement_limit_profile_items" ADD CONSTRAINT "reimbursement_limit_profile_items_profile_id_reimbursement_limit_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."reimbursement_limit_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reimbursement_limit_profile_items" ADD CONSTRAINT "reimbursement_limit_profile_items_expense_type_id_expense_types_id_fk" FOREIGN KEY ("expense_type_id") REFERENCES "public"."expense_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "currency_rates_date_from_to_unique" ON "currency_rates" USING btree ("rate_date","from_currency","to_currency");--> statement-breakpoint
CREATE INDEX "currency_rates_date_idx" ON "currency_rates" USING btree ("rate_date");--> statement-breakpoint
CREATE UNIQUE INDEX "reimbursement_limit_profile_items_profile_expense_unique" ON "reimbursement_limit_profile_items" USING btree ("profile_id","expense_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reimbursement_limit_profiles_city_currency_unique" ON "reimbursement_limit_profiles" USING btree ("city","currency");