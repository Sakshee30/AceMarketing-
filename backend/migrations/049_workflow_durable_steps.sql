CREATE TABLE IF NOT EXISTS ace_workflow_execution_steps (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  execution_id text NOT NULL REFERENCES ace_workflow_executions(id) ON DELETE CASCADE,
  workflow_id text NOT NULL,
  workflow_version integer NOT NULL,
  node_id text NOT NULL,
  node_type text NOT NULL,
  action_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','leased','waiting','succeeded','failed','cancelled','compensating','compensated')),
  attempt integer NOT NULL DEFAULT 0,
  idempotency_key text,
  input_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_json jsonb,
  error_code text,
  error_message text,
  lease_owner text,
  lease_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, execution_id, node_id)
);

CREATE INDEX IF NOT EXISTS ace_workflow_steps_execution_idx
  ON ace_workflow_execution_steps(workspace_id,execution_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_workflow_steps_lease_idx
  ON ace_workflow_execution_steps(status,lease_expires_at);

ALTER TABLE ace_workflow_execution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_workflow_execution_steps FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_workflow_execution_steps_workspace_policy ON ace_workflow_execution_steps;
CREATE POLICY ace_workflow_execution_steps_workspace_policy ON ace_workflow_execution_steps
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);
