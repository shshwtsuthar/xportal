-- Add home_phone to applications table
ALTER TABLE applications ADD COLUMN IF NOT EXISTS home_phone text;

-- Add home_phone to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS home_phone text;
