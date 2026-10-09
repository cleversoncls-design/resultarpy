ALTER TYPE "public"."trip_status" ADD VALUE IF NOT EXISTS 'Cancelada';--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "cancel_reason" text;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN IF NOT EXISTS "cancelled_by_user_id" bigint REFERENCES "users"("id");
