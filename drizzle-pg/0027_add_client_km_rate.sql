ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "km_rate" numeric(14, 4);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "km_rate_currency" varchar(3) DEFAULT 'USD' NOT NULL;
