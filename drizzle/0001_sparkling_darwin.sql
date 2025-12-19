CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'deepseek', 'claude', 'gemini', 'custom');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_provider" "ai_provider";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_model" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_api_key" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_api_endpoint" varchar(500);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_custom_provider_name" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ai_config_updated_at" timestamp;