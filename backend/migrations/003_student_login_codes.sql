-- Migration 003: Add student login codes
-- Adds login_code and user_id columns to students table

-- Add login_code column (unique 8-character code for student login)
ALTER TABLE students ADD COLUMN IF NOT EXISTS login_code VARCHAR(20) UNIQUE;

-- Add user_id column (links to users table when student logs in)
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster login_code lookups
CREATE INDEX IF NOT EXISTS idx_students_login_code ON students(login_code) WHERE login_code IS NOT NULL;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id) WHERE user_id IS NOT NULL;

-- Generate login codes for existing students
UPDATE students SET login_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8)) WHERE login_code IS NULL;
