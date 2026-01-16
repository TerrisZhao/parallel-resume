-- Add technologies field to resume_work_experiences table
ALTER TABLE "resume_work_experiences" ADD COLUMN "technologies" json DEFAULT '[]'::json;
