-- Tenant-scoped shadow/canary deployment controls and bounded operational observations.
-- Additive only. No route is activated by this migration.

CREATE TABLE IF NOT EXISTS ace_ai_deployment_controls (
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'active'
    CHECK (mode IN ('off','shadow','canary','active')),
  canary_percent NUMERIC NOT NULL DEFAULT 100
    CHECK (canary_percent >= 0 AND canary_percent <= 100),
  auto_rollback BOOLEAN NOT NULL DEFAULT false,
  max_error_rate_pct NUMERIC NOT NULL DEFAULT 5
    CHECK (max_error_rate_pct >= 0 AND max_error_rate_pct <= 100),
  max_p95_latency_ms INTEGER NOT NULL DEFAULT 5000
    CHECK (max_p95_latency_ms > 0),
  min_observations INTEGER NOT NULL DEFAULT 20
    CHECK (min_observations > 0),
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,task)
);

CREATE TABLE IF NOT EXISTS ace_ai_deployment_observations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  deployment_mode TEXT NOT NULL,
  traffic_bucket NUMERIC,
  served_candidate BOOLEAN NOT NULL DEFAULT true,
  outcome TEXT NOT NULL
    CHECK (outcome IN ('succeeded','failed','unknown','cancelled')),
  latency_ms INTEGER,
  job_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_ai_deployment_observations_recent_idx
  ON ace_ai_deployment_observations (workspace_id,task,created_at DESC);
