CREATE TABLE IF NOT EXISTS ace_mcp_tokens (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  actor_id TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  prefix TEXT NOT NULL,
  role_snapshot TEXT NOT NULL,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  source TEXT NOT NULL DEFAULT 'api'
);
CREATE INDEX IF NOT EXISTS ace_mcp_tokens_workspace_idx ON ace_mcp_tokens(workspace_id,status);

CREATE TABLE IF NOT EXISTS ace_mcp_action_previews (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  actor_id TEXT,
  action_type TEXT NOT NULL,
  input_fingerprint TEXT NOT NULL,
  sanitized_input JSONB NOT NULL DEFAULT '{}'::jsonb,
  required_permission TEXT NOT NULL,
  required_scope TEXT NOT NULL,
  risk TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_confirmation',
  idempotency_key TEXT,
  job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  confirmed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS ace_mcp_action_previews_workspace_idx ON ace_mcp_action_previews(workspace_id,status);

CREATE TABLE IF NOT EXISTS ace_mcp_policies (
  workspace_id TEXT PRIMARY KEY,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
