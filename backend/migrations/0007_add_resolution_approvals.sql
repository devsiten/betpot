-- Add resolution_approvals table for two-admin approval workflow

CREATE TABLE IF NOT EXISTS resolution_approvals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  admin_id TEXT NOT NULL REFERENCES users(id),
  winning_option TEXT NOT NULL,
  approved INTEGER DEFAULT 1,
  created_at INTEGER,
  UNIQUE(event_id, admin_id)
);

CREATE INDEX IF NOT EXISTS resolution_approvals_event_idx ON resolution_approvals(event_id);
CREATE INDEX IF NOT EXISTS resolution_approvals_admin_idx ON resolution_approvals(admin_id);
