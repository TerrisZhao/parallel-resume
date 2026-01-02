CREATE TYPE "public"."ai_config_mode" AS ENUM('credits', 'subscription', 'custom');--> statement-breakpoint
CREATE TYPE "public"."ai_provider" AS ENUM('openai', 'deepseek', 'claude', 'gemini', 'custom');--> statement-breakpoint
CREATE TYPE "public"."credit_transaction_type" AS ENUM('purchase', 'usage', 'refund', 'bonus', 'subscription_grant');--> statement-breakpoint
CREATE TYPE "public"."interview_stage" AS ENUM('applied', 'screening', 'technical', 'onsite', 'offer', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."interview_type" AS ENUM('online', 'offline', 'phone', 'other');--> statement-breakpoint
CREATE TYPE "public"."language_preference" AS ENUM('system', 'en', 'zh');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."plan_type" AS ENUM('free', 'credits', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."theme_mode" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'user');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_account_id" varchar(255) NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" timestamp,
	"token_type" varchar(50),
	"scope" varchar(255),
	"id_token" text,
	"session_state" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"model" varchar(100) NOT NULL,
	"credits_per_request" integer,
	"credits_per_1k_tokens" integer,
	"pricing_type" varchar(20) DEFAULT 'token' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"type" "credit_transaction_type" NOT NULL,
	"description" text,
	"related_id" integer,
	"related_type" varchar(50),
	"balance_after" integer NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_preparation_materials" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_specific_preparations" (
	"id" serial PRIMARY KEY NOT NULL,
	"interview_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"resume_id" integer,
	"company" varchar(255) NOT NULL,
	"type" "interview_type" NOT NULL,
	"location" varchar(500),
	"video_link" varchar(500),
	"interview_time" timestamp NOT NULL,
	"stage" "interview_stage" DEFAULT 'applied' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_type" varchar(50),
	"browser" varchar(100),
	"os" varchar(100),
	"location" varchar(255),
	"is_successful" boolean DEFAULT true NOT NULL,
	"failure_reason" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer,
	"stripe_payment_intent_id" varchar(255),
	"stripe_charge_id" varchar(255),
	"stripe_invoice_id" varchar(255),
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'nzd' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"credits_granted" integer,
	"description" text,
	"metadata" json,
	"failure_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_education" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"school" varchar(255),
	"degree" varchar(255),
	"major" varchar(255),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"current" boolean DEFAULT false NOT NULL,
	"gpa" varchar(50),
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"name" varchar(255),
	"role" varchar(255),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"current" boolean DEFAULT false NOT NULL,
	"description" text,
	"technologies" json DEFAULT '[]'::json,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_work_experiences" (
	"id" serial PRIMARY KEY NOT NULL,
	"resume_id" integer NOT NULL,
	"company" varchar(255),
	"position" varchar(255),
	"start_date" varchar(50),
	"end_date" varchar(50),
	"current" boolean DEFAULT false NOT NULL,
	"description" text,
	"responsibilities" json DEFAULT '[]'::json,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"preferred_name" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"location" varchar(255),
	"linkedin" varchar(255),
	"github" varchar(255),
	"website" varchar(255),
	"summary" text,
	"key_skills" json DEFAULT '[]'::json,
	"additional_info" text,
	"theme_color" varchar(20) DEFAULT '#000000',
	"preferred_language" varchar(5) DEFAULT 'en',
	"ai_optimization_enabled" boolean DEFAULT false NOT NULL,
	"job_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"user_id" integer NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_en" varchar(100) NOT NULL,
	"name_zh" varchar(100) NOT NULL,
	"type" "plan_type" NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"credits" integer,
	"interval" varchar(20),
	"interval_count" integer DEFAULT 1,
	"features_en" json DEFAULT '[]'::json,
	"features_zh" json DEFAULT '[]'::json,
	"stripe_price_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"description_en" text,
	"description_zh" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"stripe_subscription_id" varchar(255),
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"canceled_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "user_credits" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_spent" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_credits_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"password_hash" text,
	"provider" varchar(50),
	"provider_id" varchar(255),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"first_login_completed" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"theme_mode" "theme_mode" DEFAULT 'system' NOT NULL,
	"preferred_language" "language_preference" DEFAULT 'system' NOT NULL,
	"ai_config_mode" "ai_config_mode",
	"ai_provider" "ai_provider",
	"ai_model" varchar(100),
	"ai_api_key" text,
	"ai_api_endpoint" varchar(500),
	"ai_custom_provider_name" varchar(100),
	"ai_config_updated_at" timestamp,
	"stripe_customer_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_pricing_rules_provider_model_idx" ON "ai_pricing_rules" USING btree ("provider","model");--> statement-breakpoint
CREATE INDEX "ai_pricing_rules_is_active_idx" ON "ai_pricing_rules" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "interview_prep_materials_user_id_idx" ON "interview_preparation_materials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interview_prep_materials_category_idx" ON "interview_preparation_materials" USING btree ("category");--> statement-breakpoint
CREATE INDEX "interview_prep_materials_user_id_category_idx" ON "interview_preparation_materials" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "interview_specific_prep_interview_id_idx" ON "interview_specific_preparations" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_specific_prep_interview_id_order_idx" ON "interview_specific_preparations" USING btree ("interview_id","order");--> statement-breakpoint
CREATE INDEX "interviews_user_id_idx" ON "interviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interviews_resume_id_idx" ON "interviews" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "interviews_stage_idx" ON "interviews" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "interviews_interview_time_idx" ON "interviews" USING btree ("interview_time");--> statement-breakpoint
CREATE INDEX "login_history_user_id_idx" ON "login_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_history_created_at_idx" ON "login_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payments_stripe_payment_intent_id_idx" ON "payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resume_education_resume_id_idx" ON "resume_education" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_education_resume_id_order_idx" ON "resume_education" USING btree ("resume_id","order");--> statement-breakpoint
CREATE INDEX "resume_projects_resume_id_idx" ON "resume_projects" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_projects_resume_id_order_idx" ON "resume_projects" USING btree ("resume_id","order");--> statement-breakpoint
CREATE INDEX "resume_work_experiences_resume_id_idx" ON "resume_work_experiences" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "resume_work_experiences_resume_id_order_idx" ON "resume_work_experiences" USING btree ("resume_id","order");--> statement-breakpoint
CREATE INDEX "resumes_user_id_idx" ON "resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resumes_user_id_created_at_idx" ON "resumes" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "user_credits_user_id_idx" ON "user_credits" USING btree ("user_id");