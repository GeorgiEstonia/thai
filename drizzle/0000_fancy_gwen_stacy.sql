CREATE TABLE "item_notes" (
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"mnemonic" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_notes_item_type_item_id_pk" PRIMARY KEY("item_type","item_id")
);
--> statement-breakpoint
CREATE TABLE "item_progress" (
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"direction" text NOT NULL,
	"interval_days" integer DEFAULT 0 NOT NULL,
	"due_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reps" integer DEFAULT 0 NOT NULL,
	"lapses" integer DEFAULT 0 NOT NULL,
	"introduced_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_progress_item_type_item_id_direction_pk" PRIMARY KEY("item_type","item_id","direction")
);
--> statement-breakpoint
CREATE TABLE "review_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_type" text NOT NULL,
	"item_id" text NOT NULL,
	"direction" text NOT NULL,
	"grade" text NOT NULL,
	"reinforcement" boolean DEFAULT false NOT NULL,
	"interval_before" integer NOT NULL,
	"interval_after" integer NOT NULL,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thai" text NOT NULL,
	"ipa" text NOT NULL,
	"english" text NOT NULL,
	"kind" text DEFAULT 'word' NOT NULL,
	"pack" text,
	"notes" text,
	"source" text NOT NULL,
	"worksheet_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "worksheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"images" jsonb NOT NULL,
	"pack" text,
	"status" text DEFAULT 'uploading' NOT NULL,
	"auto_added" integer DEFAULT 0 NOT NULL,
	"extracted" jsonb,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
