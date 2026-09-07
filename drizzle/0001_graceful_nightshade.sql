ALTER TABLE "words" ADD COLUMN "example_thai" text;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "example_ipa" text;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "example_english" text;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "words" ADD COLUMN "priority" integer DEFAULT 0 NOT NULL;