ALTER TABLE ace_request_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_request_idempotency FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_request_idempotency_workspace_policy ON ace_request_idempotency;
CREATE POLICY ace_request_idempotency_workspace_policy ON ace_request_idempotency
  USING (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  )
  WITH CHECK (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  );

ALTER TABLE ace_outbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_outbox_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_outbox_events_workspace_policy ON ace_outbox_events;
CREATE POLICY ace_outbox_events_workspace_policy ON ace_outbox_events
  USING (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  )
  WITH CHECK (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  );

ALTER TABLE ace_inbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_inbox_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_inbox_events_workspace_policy ON ace_inbox_events;
CREATE POLICY ace_inbox_events_workspace_policy ON ace_inbox_events
  USING (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  )
  WITH CHECK (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  );

ALTER TABLE ace_platform_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_platform_audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_platform_audit_workspace_policy ON ace_platform_audit;
CREATE POLICY ace_platform_audit_workspace_policy ON ace_platform_audit
  USING (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  )
  WITH CHECK (
    workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
    OR current_setting('app.system_worker', true) = 'true'
  );
