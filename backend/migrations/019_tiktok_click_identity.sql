ALTER TABLE ace_click_sessions
  ADD COLUMN IF NOT EXISTS ttclid TEXT;

CREATE INDEX IF NOT EXISTS ace_click_sessions_ttclid_idx
  ON ace_click_sessions (workspace_id,ttclid)
  WHERE ttclid IS NOT NULL;

ALTER TABLE ace_assisted_events
  ADD COLUMN IF NOT EXISTS ttclid TEXT;

CREATE INDEX IF NOT EXISTS ace_assisted_events_ttclid_idx
  ON ace_assisted_events (workspace_id,ttclid)
  WHERE ttclid IS NOT NULL;
