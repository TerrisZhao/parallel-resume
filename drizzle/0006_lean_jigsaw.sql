CREATE TYPE "public"."interview_stage" AS ENUM('applied', 'screening', 'technical', 'onsite', 'offer', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."interview_type" AS ENUM('online', 'offline', 'phone', 'other');--> statement-breakpoint
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
CREATE INDEX "interviews_user_id_idx" ON "interviews" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interviews_resume_id_idx" ON "interviews" USING btree ("resume_id");--> statement-breakpoint
CREATE INDEX "interviews_stage_idx" ON "interviews" USING btree ("stage");--> statement-breakpoint
CREATE INDEX "interviews_interview_time_idx" ON "interviews" USING btree ("interview_time");