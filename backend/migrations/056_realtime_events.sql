CREATE TABLE IF NOT EXISTS ace_realtime_events (
  sequence bigserial PRIMARY KEY,
  id text NOT NULL UNIQUE,
  workspace_id text NOT NULL,
  event_type text NOT NULL,
  resource_type text,
  resource_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_realtime_events_workspace_sequence_idx
  ON ace_realtime_events (workspace_id, sequence);

CREATE INDEX IF NOT EXISTS ace_realtime_events_workspace_type_sequence_idx
  ON ace_realtime_events (workspace_id, event_type, sequence);

ALTER TABLE ace_realtime_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_realtime_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_realtime_events_workspace_policy ON ace_realtime_events;
CREATE POLICY ace_realtime_events_workspace_policy ON ace_realtime_events
  USING (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  )
  WITH CHECK (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  );
