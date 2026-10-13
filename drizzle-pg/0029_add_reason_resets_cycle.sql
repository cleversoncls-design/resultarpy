ALTER TABLE "maintenance_reasons" ADD COLUMN IF NOT EXISTS "resets_maintenance_cycle" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "maintenance_reasons" SET "resets_maintenance_cycle" = true WHERE "name" ILIKE '%revis%' OR "name" ILIKE '%óleo%' OR "name" ILIKE '%oleo%' OR "name" ILIKE '%aceite%';
