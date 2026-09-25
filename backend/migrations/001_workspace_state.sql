CREATE TABLE IF NOT EXISTS ace_workspace_state (
  workspace_id TEXT PRIMARY KEY,
  state JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (workspace_id ~ '^[A-Za-z0-9_-]{1,64}$')
);

CREATE INDEX IF NOT EXISTS ace_workspace_state_updated_at_idx
  ON ace_workspace_state (updated_at DESC);
