-- Multi-model intelligence lifecycle expansion.
-- Additive only: preserves existing AI jobs/results/registry tables from migrations 021-024.

CREATE TABLE IF NOT EXISTS ace_ai_datasets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  source_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  feature_definition_version TEXT,
  label_definition_version TEXT,
  prediction_cutoff TIMESTAMPTZ,
  label_observation_cutoff TIMESTAMPTZ,
  row_count BIGINT NOT NULL DEFAULT 0,
  maturity_status TEXT NOT NULL DEFAULT 'pending',
  content_hash TEXT,
  object_ref TEXT,
  data_classification TEXT NOT NULL DEFAULT 'workspace_features',
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ace_ai_datasets_task_idx
  ON ace_ai_datasets (workspace_id,task,created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS ace_ai_feature_snapshots (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  dataset_id TEXT REFERENCES ace_ai_datasets(id) ON DELETE RESTRICT,
  task TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  feature_schema_version TEXT NOT NULL,
  event_time TIMESTAMPTZ,
  available_at TIMESTAMPTZ NOT NULL,
  prediction_cutoff TIMESTAMPTZ NOT NULL,
  features JSONB NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,task,entity_id,prediction_cutoff,feature_schema_version)
);

CREATE INDEX IF NOT EXISTS ace_ai_feature_snapshots_cutoff_idx
  ON ace_ai_feature_snapshots (workspace_id,task,prediction_cutoff DESC);

CREATE TABLE IF NOT EXISTS ace_ai_model_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  target TEXT,
  horizon TEXT,
  artifact_revision TEXT,
  artifact_hash TEXT,
  artifact_object_ref TEXT,
  training_dataset_id TEXT REFERENCES ace_ai_datasets(id) ON DELETE RESTRICT,
  feature_schema_version TEXT,
  input_schema_version TEXT,
  output_schema_version TEXT,
  code_commit TEXT,
  dependencies JSONB NOT NULL DEFAULT '{}'::jsonb,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  random_seed BIGINT,
  calibration_model_version_id TEXT,
  evaluation_id TEXT REFERENCES ace_ai_evaluations(id) ON DELETE SET NULL,
  lifecycle_state TEXT NOT NULL DEFAULT 'untrained',
  rollback_predecessor_id TEXT,
  promoted_by TEXT,
  promoted_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,task,id)
);

CREATE INDEX IF NOT EXISTS ace_ai_model_versions_task_idx
  ON ace_ai_model_versions (workspace_id,task,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_ai_metric_definitions (
  workspace_id TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  version TEXT NOT NULL,
  definition JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,metric_key,version)
);

CREATE UNIQUE INDEX IF NOT EXISTS ace_ai_metric_definitions_active_idx
  ON ace_ai_metric_definitions (workspace_id,metric_key)
  WHERE active=true;

CREATE TABLE IF NOT EXISTS ace_ai_activation_proposals (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  proposal_type TEXT NOT NULL,
  proposal_hash TEXT NOT NULL,
  evidence_snapshot JSONB NOT NULL,
  model_snapshot JSONB NOT NULL,
  policy_result JSONB NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  expires_at TIMESTAMPTZ NOT NULL,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  provider_request_id TEXT,
  execution_receipt JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,proposal_hash)
);

CREATE INDEX IF NOT EXISTS ace_ai_activation_proposals_status_idx
  ON ace_ai_activation_proposals (workspace_id,status,expires_at);

CREATE TABLE IF NOT EXISTS ace_ai_transcripts (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT REFERENCES ace_jobs(id) ON DELETE SET NULL,
  asset_ref TEXT NOT NULL,
  provider TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  language_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  speaker_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  timestamp_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  transcript_object_ref TEXT,
  redaction_status TEXT NOT NULL DEFAULT 'pending',
  retention_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_ai_transcripts_workspace_idx
  ON ace_ai_transcripts (workspace_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_ai_creative_assets (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  job_id TEXT REFERENCES ace_jobs(id) ON DELETE SET NULL,
  object_ref TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  prompt_version TEXT,
  provider TEXT NOT NULL,
  requested_model TEXT NOT NULL,
  resolved_model TEXT,
  brand_constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  review_status TEXT NOT NULL DEFAULT 'draft',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,content_hash)
);

CREATE INDEX IF NOT EXISTS ace_ai_creative_assets_review_idx
  ON ace_ai_creative_assets (workspace_id,review_status,created_at DESC);
