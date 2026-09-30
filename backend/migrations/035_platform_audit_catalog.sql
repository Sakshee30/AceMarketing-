CREATE TABLE IF NOT EXISTS ace_platform_audit (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  actor_id text,
  actor_type text NOT NULL DEFAULT 'user',
  action text NOT NULL,
  entity_type text,
  entity_id text,
  request_id text,
  trace_id text,
  outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success','denied','failed','unknown')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_platform_audit_workspace_time_idx
  ON ace_platform_audit (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ace_platform_audit_action_time_idx
  ON ace_platform_audit (action, created_at DESC);
