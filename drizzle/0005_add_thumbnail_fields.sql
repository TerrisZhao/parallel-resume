-- Add thumbnail fields to resumes table
ALTER TABLE "resumes" ADD COLUMN "thumbnail_url" varchar(500);
ALTER TABLE "resumes" ADD COLUMN "thumbnail_generated_at" timestamp;
