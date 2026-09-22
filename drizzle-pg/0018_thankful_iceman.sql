CREATE TABLE "cities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cities_name_unique" UNIQUE("name")
);
