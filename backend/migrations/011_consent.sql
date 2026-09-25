CREATE TABLE IF NOT EXISTS ace_consent_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('visitor','customer')),
  subject_id TEXT NOT NULL,
  essential BOOLEAN NOT NULL DEFAULT true,
  analytics BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  personalization BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'web',
  policy_version TEXT NOT NULL DEFAULT 'v1',
  ip_hash TEXT,
  user_agent_hash TEXT,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,subject_type,subject_id)
);

CREATE INDEX IF NOT EXISTS ace_consent_records_workspace_idx
  ON ace_consent_records (workspace_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS ace_consent_audit (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  consent_id TEXT REFERENCES ace_consent_records(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created','updated','revoked')),
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_consent_audit_workspace_idx
  ON ace_consent_audit (workspace_id,created_at DESC);
