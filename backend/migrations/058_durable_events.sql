CREATE TABLE IF NOT EXISTS ace_events (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  event_type text NOT NULL,
  event_category text NOT NULL DEFAULT 'analytics',
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  source text,
  customer_id text,
  visitor_id text,
  device_id text,
  email_sha256 text,
  phone_sha256 text,
  campaign text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS ace_events_workspace_time_idx
  ON ace_events(workspace_id,received_at DESC);
CREATE INDEX IF NOT EXISTS ace_events_workspace_type_idx
  ON ace_events(workspace_id,event_type,occurred_at DESC);

ALTER TABLE ace_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_events_workspace_policy ON ace_events;
CREATE POLICY ace_events_workspace_policy ON ace_events
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);
