ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "companion_id" bigint REFERENCES "travelers"("id");--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD COLUMN IF NOT EXISTS "people" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD COLUMN IF NOT EXISTS "guests" varchar(500);
