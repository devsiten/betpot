-- Create failed_transactions table for admin payment resolution
CREATE TABLE IF NOT EXISTS failed_transactions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  transaction_signature TEXT NOT NULL,
  event_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  option_label TEXT,
  quantity INTEGER NOT NULL,
  amount REAL NOT NULL,
  chain TEXT DEFAULT 'SOL',
  error_message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  resolved_by TEXT,
  resolved_at INTEGER,
  resolution_note TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- Indexes
CREATE INDEX IF NOT EXISTS failed_tx_wallet_idx ON failed_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS failed_tx_status_idx ON failed_transactions(status);
CREATE INDEX IF NOT EXISTS failed_tx_created_idx ON failed_transactions(created_at);
