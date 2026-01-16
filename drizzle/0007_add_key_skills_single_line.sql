-- Add key_skills_single_line column to resumes table
ALTER TABLE "resumes" ADD COLUMN "key_skills_single_line" boolean DEFAULT false NOT NULL;
