ALTER TABLE ace_click_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_click_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_click_sessions_workspace_policy ON ace_click_sessions;
CREATE POLICY ace_click_sessions_workspace_policy ON ace_click_sessions
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_assisted_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_assisted_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_assisted_events_workspace_policy ON ace_assisted_events;
CREATE POLICY ace_assisted_events_workspace_policy ON ace_assisted_events
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);
