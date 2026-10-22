CREATE TABLE "job_leases" (
	"id" text PRIMARY KEY NOT NULL,
	"held_at" timestamp with time zone DEFAULT now() NOT NULL
);
