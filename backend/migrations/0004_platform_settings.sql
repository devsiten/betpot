-- Create platform_settings table for admin settings persistence
CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY,
  ticket_price REAL DEFAULT 10,
  platform_fee REAL DEFAULT 0.01,
  max_events_per_day INTEGER DEFAULT 3,
  claim_delay_hours INTEGER DEFAULT 0,
  maintenance_mode INTEGER DEFAULT 0,
  updated_at INTEGER
);
