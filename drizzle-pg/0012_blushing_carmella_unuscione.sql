CREATE TABLE "translation_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"translation_key" varchar(240) NOT NULL,
	"spanish" text NOT NULL,
	"updated_by" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "translation_entries" ADD CONSTRAINT "translation_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "translation_entries_key_unique" ON "translation_entries" USING btree ("translation_key");