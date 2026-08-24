ALTER TABLE "trips" ADD COLUMN "unit_id" bigint;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "country" varchar(80);--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "area" varchar(120);--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "transport" varchar(120);--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "has_advance" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "needs_hotel" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "trips" ADD CONSTRAINT "trips_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;