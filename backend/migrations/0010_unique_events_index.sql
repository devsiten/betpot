-- Add unique index on events to prevent duplicate events with same title and time
-- This prevents race conditions where two admins could create duplicate events

CREATE UNIQUE INDEX IF NOT EXISTS events_title_time_unique 
  ON events(title, event_time);
