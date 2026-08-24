ALTER TABLE "trip_expenses" ADD COLUMN "unit_value" numeric(14, 2);--> statement-breakpoint
UPDATE "trip_expenses" SET "unit_value" = CASE WHEN "quantity" = 0 THEN "amount" ELSE "amount" / "quantity" END WHERE "unit_value" IS NULL;--> statement-breakpoint
ALTER TABLE "trip_expenses" ALTER COLUMN "unit_value" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD COLUMN "expense_group" varchar(120);--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD COLUMN "prepaid" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD COLUMN "billable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trip_expenses" ADD COLUMN "review_note" text;
