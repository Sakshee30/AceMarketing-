-- Tenant AI policy, usage and media-review persistence.
-- Additive only; no existing model/job/result records are modified.

CREATE TABLE IF NOT EXISTS ace_ai_task_policies (
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  approved_requested_model TEXT,
  max_concurrent_jobs INTEGER NOT NULL DEFAULT 4 CHECK (max_concurrent_jobs BETWEEN 1 AND 1000),
  monthly_unit_budget NUMERIC,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy_version TEXT NOT NULL DEFAULT 'v1',
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,task)
);

CREATE INDEX IF NOT EXISTS ace_ai_task_policies_enabled_idx
  ON ace_ai_task_policies (workspace_id,enabled,task);

ALTER TABLE ace_ai_transcripts
  ADD COLUMN IF NOT EXISTS transcript_text TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'unreviewed',
  ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE ace_ai_creative_assets
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS ace_ai_creative_assets_parent_idx
  ON ace_ai_creative_assets (workspace_id,parent_asset_id,version);

CREATE INDEX IF NOT EXISTS ace_ai_usage_reservations_task_month_idx
  ON ace_ai_usage_reservations (workspace_id,task,created_at DESC);
