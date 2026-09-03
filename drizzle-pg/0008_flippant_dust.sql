ALTER TABLE "users" ADD COLUMN "profile" varchar(32) DEFAULT 'traveler_approver' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
UPDATE "users" SET "profile" = 'admin' WHERE "role" = 'admin';
