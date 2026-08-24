ALTER TABLE "fleet_reservations" ALTER COLUMN "vehicle_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "fleet_reservations" ADD COLUMN "planned_start_on" date;--> statement-breakpoint
ALTER TABLE "fleet_reservations" ADD COLUMN "planned_end_on" date;--> statement-breakpoint
UPDATE "fleet_reservations" AS reservations SET "planned_start_on" = trips."starts_on", "planned_end_on" = trips."ends_on" FROM "trips" WHERE reservations."trip_id" = trips."id" AND (reservations."planned_start_on" IS NULL OR reservations."planned_end_on" IS NULL);--> statement-breakpoint
ALTER TABLE "fleet_reservations" ALTER COLUMN "planned_start_on" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "fleet_reservations" ALTER COLUMN "planned_end_on" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "fleet_work_orders" ADD COLUMN "status" "fleet_work_order_status" DEFAULT 'Concluída' NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_reasons" ADD COLUMN "description" text;
