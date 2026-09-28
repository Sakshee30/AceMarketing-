ALTER TABLE ace_click_sessions
  ADD COLUMN IF NOT EXISTS twclid TEXT;

CREATE INDEX IF NOT EXISTS ace_click_sessions_twclid_idx
  ON ace_click_sessions (workspace_id,twclid)
  WHERE twclid IS NOT NULL;

ALTER TABLE ace_assisted_events
  ADD COLUMN IF NOT EXISTS twclid TEXT;

CREATE INDEX IF NOT EXISTS ace_assisted_events_twclid_idx
  ON ace_assisted_events (workspace_id,twclid)
  WHERE twclid IS NOT NULL;
