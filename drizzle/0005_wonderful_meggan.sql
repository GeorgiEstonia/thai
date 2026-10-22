CREATE TABLE "seed_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"items" integer DEFAULT 0 NOT NULL,
	"added" integer DEFAULT 0 NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL
);
