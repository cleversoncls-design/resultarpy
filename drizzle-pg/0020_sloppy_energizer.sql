ALTER TABLE "trips" ADD COLUMN "closure_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "receipts_validated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "billed_at" timestamp with time zone;