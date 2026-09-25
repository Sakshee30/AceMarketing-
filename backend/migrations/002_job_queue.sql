CREATE TABLE IF NOT EXISTS ace_jobs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','leased','retry','succeeded','dead_letter')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 50),
  available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  leased_until TIMESTAMPTZ,
  lease_owner TEXT,
  idempotency_key TEXT NOT NULL,
  last_error TEXT,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (workspace_id,idempotency_key)
);

CREATE INDEX IF NOT EXISTS ace_jobs_ready_idx
  ON ace_jobs (status,available_at,created_at)
  WHERE status IN ('pending','retry');

CREATE INDEX IF NOT EXISTS ace_jobs_workspace_idx
  ON ace_jobs (workspace_id,created_at DESC);
