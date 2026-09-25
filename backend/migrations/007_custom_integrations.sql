CREATE TABLE IF NOT EXISTS ace_custom_integrations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  connector_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  base_url TEXT NOT NULL,
  auth_type TEXT NOT NULL,
  encrypted_auth JSONB,
  identity_field TEXT,
  stage_field TEXT,
  revenue_field TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','testing','healthy','degraded','error','disabled')),
  last_status_code INTEGER,
  last_latency_ms INTEGER,
  last_error TEXT,
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,name)
);

CREATE INDEX IF NOT EXISTS ace_custom_integrations_workspace_idx
  ON ace_custom_integrations (workspace_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS ace_custom_integration_tests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  integration_id TEXT REFERENCES ace_custom_integrations(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  status_code INTEGER,
  latency_ms INTEGER,
  ok BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  resolved_ips JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_custom_integration_tests_workspace_idx
  ON ace_custom_integration_tests (workspace_id,created_at DESC);
