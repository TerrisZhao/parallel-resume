CREATE TYPE "public"."message_type" AS ENUM('system', 'notification', 'announcement', 'credits', 'subscription');--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "message_type" DEFAULT 'notification' NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" json,
	"related_id" integer,
	"related_type" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE INDEX "messages_user_id_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_is_read_idx" ON "messages" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "messages_type_idx" ON "messages" USING btree ("type");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");