CREATE TABLE IF NOT EXISTS "email_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"smtp_host" varchar(255) DEFAULT '' NOT NULL,
	"smtp_port" integer DEFAULT 465 NOT NULL,
	"smtp_security" varchar(16) DEFAULT 'ssl' NOT NULL,
	"smtp_user" varchar(255) DEFAULT '' NOT NULL,
	"smtp_password_enc" text,
	"from_email" varchar(320) DEFAULT '' NOT NULL,
	"from_name" varchar(160) DEFAULT '' NOT NULL,
	"admin_recipients" text DEFAULT '' NOT NULL,
	"last_test_at" timestamp with time zone,
	"last_test_ok" boolean,
	"last_test_message" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"event" varchar(40) NOT NULL,
	"to_email" varchar(1000) NOT NULL,
	"subject" varchar(300) NOT NULL,
	"status" varchar(16) NOT NULL,
	"error" text,
	"trip_id" bigint
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "email_log_created_at_idx" ON "email_log" USING btree ("created_at");
