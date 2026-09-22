CREATE TABLE "organization_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"global_currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
