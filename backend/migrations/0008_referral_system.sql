-- Add referral fields to users table (run these one at a time if needed)
ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN referral_code TEXT;
ALTER TABLE users ADD COLUMN referred_by TEXT;
ALTER TABLE users ADD COLUMN discord_id TEXT;
ALTER TABLE users ADD COLUMN discord_username TEXT;
ALTER TABLE users ADD COLUMN discord_role TEXT;
ALTER TABLE users ADD COLUMN twitter_handle TEXT;
ALTER TABLE users ADD COLUMN twitter_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN volume_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN referral_points INTEGER DEFAULT 0;

-- Create indexes for referral code lookups
CREATE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);
CREATE INDEX IF NOT EXISTS users_discord_id_idx ON users(discord_id);

-- Referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL,
  referral_code TEXT NOT NULL,
  discord_verified INTEGER DEFAULT 0,
  twitter_verified INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  created_at INTEGER,
  verified_at INTEGER
);

CREATE INDEX IF NOT EXISTS referrals_referrer_idx ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_idx ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals(referral_code);

-- Twitter verification queue for admin manual review
CREATE TABLE IF NOT EXISTS twitter_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  twitter_handle TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at INTEGER,
  admin_note TEXT,
  created_at INTEGER
);

CREATE INDEX IF NOT EXISTS twitter_verifications_user_idx ON twitter_verifications(user_id);
CREATE INDEX IF NOT EXISTS twitter_verifications_status_idx ON twitter_verifications(status);
