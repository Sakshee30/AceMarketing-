-- Durable, auditable execution lifecycle for approved AI activation proposals.
-- Additive only. Execution remains default-off at runtime.

ALTER TABLE ace_ai_activation_proposals
  ADD COLUMN IF NOT EXISTS execution_job_id TEXT REFERENCES ace_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS execution_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (execution_status IN ('not_requested','queued','running','succeeded','failed','blocked')),
  ADD COLUMN IF NOT EXISTS execution_requested_by TEXT,
  ADD COLUMN IF NOT EXISTS execution_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_error TEXT;

CREATE INDEX IF NOT EXISTS ace_ai_activation_proposals_execution_idx
  ON ace_ai_activation_proposals (workspace_id,execution_status,status,created_at DESC);
