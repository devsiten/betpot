-- Add referral fields to users table (one at a time, without UNIQUE constraints inline)
ALTER TABLE users ADD COLUMN display_name TEXT;
