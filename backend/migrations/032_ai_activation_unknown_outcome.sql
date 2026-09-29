-- Preserve explicit unknown external outcomes after an activation dispatch lease expires.
-- Unknown provider outcomes continue to block model lifecycle changes until reconciled.

ALTER TABLE ace_ai_activation_proposals
  ADD COLUMN IF NOT EXISTS execution_outcome_state TEXT NOT NULL DEFAULT 'none'
    CHECK (execution_outcome_state IN ('none','known','unknown','reconciled')),
  ADD COLUMN IF NOT EXISTS execution_outcome_recorded_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ace_ai_activation_outcome_idx
  ON ace_ai_activation_proposals (workspace_id,task,execution_outcome_state,updated_at DESC);
