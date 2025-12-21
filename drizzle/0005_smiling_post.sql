CREATE TYPE "public"."language_preference" AS ENUM('system', 'en', 'zh');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "preferred_language" "language_preference" DEFAULT 'system' NOT NULL;