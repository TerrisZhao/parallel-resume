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
CREATE INDEX "interview_prep_materials_user_id_idx" ON "interview_preparation_materials" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interview_prep_materials_category_idx" ON "interview_preparation_materials" USING btree ("category");--> statement-breakpoint
CREATE INDEX "interview_prep_materials_user_id_category_idx" ON "interview_preparation_materials" USING btree ("user_id","category");--> statement-breakpoint
CREATE INDEX "interview_specific_prep_interview_id_idx" ON "interview_specific_preparations" USING btree ("interview_id");--> statement-breakpoint
CREATE INDEX "interview_specific_prep_interview_id_order_idx" ON "interview_specific_preparations" USING btree ("interview_id","order");