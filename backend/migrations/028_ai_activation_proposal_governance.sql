-- Additive governance fields for immutable AI activation proposals.
ALTER TABLE ace_ai_activation_proposals
  ADD COLUMN IF NOT EXISTS task TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_by TEXT,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'ai-activation.v1';

CREATE INDEX IF NOT EXISTS ace_ai_activation_proposals_task_idx
  ON ace_ai_activation_proposals (workspace_id,task,status,created_at DESC);
