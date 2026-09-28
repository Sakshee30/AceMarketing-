ALTER TABLE ace_jobs
  ADD COLUMN IF NOT EXISTS fencing_token BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deadline_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS unknown_outcome_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS external_request_id TEXT,
  ADD COLUMN IF NOT EXISTS input_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS result_schema_version TEXT;

CREATE INDEX IF NOT EXISTS ace_jobs_workspace_status_idx
  ON ace_jobs (workspace_id,status,created_at DESC);

CREATE INDEX IF NOT EXISTS ace_jobs_lease_recovery_idx
  ON ace_jobs (leased_until,heartbeat_at)
  WHERE status='leased';

CREATE TABLE IF NOT EXISTS ace_ai_model_registry (
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  artifact_revision TEXT,
  artifact_hash TEXT,
  input_schema_version TEXT,
  output_schema_version TEXT,
  runtime_requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  permitted_regions JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_classifications JSONB NOT NULL DEFAULT '[]'::jsonb,
  configuration_status TEXT NOT NULL DEFAULT 'unconfigured',
  implementation_status TEXT NOT NULL DEFAULT 'implemented',
  training_status TEXT NOT NULL DEFAULT 'not_applicable',
  evaluation_status TEXT NOT NULL DEFAULT 'not_evaluated',
  approval_status TEXT NOT NULL DEFAULT 'not_approved',
  deployment_status TEXT NOT NULL DEFAULT 'not_deployed',
  documentation_verified BOOLEAN NOT NULL DEFAULT false,
  access_verified BOOLEAN NOT NULL DEFAULT false,
  documentation_source TEXT,
  documentation_verified_at TIMESTAMPTZ,
  evaluation_reference TEXT,
  rollback_predecessor TEXT,
  promoted_by TEXT,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,task)
);

CREATE TABLE IF NOT EXISTS ace_ai_evaluations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  model_ref TEXT NOT NULL,
  dataset_ref TEXT,
  split_definition JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_size INTEGER,
  qualified BOOLEAN,
  status TEXT NOT NULL DEFAULT 'pending',
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ace_ai_evaluations_task_idx
  ON ace_ai_evaluations (workspace_id,task,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_ai_results (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT,
  task TEXT NOT NULL,
  status TEXT NOT NULL,
  result_type TEXT NOT NULL,
  requested_model TEXT,
  resolved_model TEXT,
  artifact_version TEXT,
  schema_version TEXT NOT NULL,
  source_snapshot JSONB,
  cutoff_at TIMESTAMPTZ,
  target TEXT,
  horizon TEXT,
  units TEXT,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB,
  usage JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_ai_results_task_idx
  ON ace_ai_results (workspace_id,task,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_ai_usage_reservations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  task TEXT NOT NULL,
  provider TEXT,
  requested_model TEXT,
  reserved_units NUMERIC NOT NULL DEFAULT 0,
  actual_units NUMERIC,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reconciled_at TIMESTAMPTZ,
  UNIQUE (workspace_id,job_id)
);

CREATE TABLE IF NOT EXISTS ace_ai_provider_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  task TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  provider_request_id TEXT,
  outcome TEXT NOT NULL DEFAULT 'not_started',
  request_fingerprint TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (workspace_id,job_id,provider)
);

CREATE INDEX IF NOT EXISTS ace_ai_provider_requests_reconcile_idx
  ON ace_ai_provider_requests (workspace_id,outcome,started_at)
  WHERE outcome IN ('submitted','unknown');
