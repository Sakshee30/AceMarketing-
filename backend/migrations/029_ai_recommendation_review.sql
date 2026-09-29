-- Immutable recommendation review and separation-of-duties metadata.
ALTER TABLE ace_ai_activation_proposals
  ADD COLUMN IF NOT EXISTS created_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_job_id TEXT REFERENCES ace_jobs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_result_id TEXT REFERENCES ace_ai_results(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewer_status TEXT NOT NULL DEFAULT 'not_requested'
    CHECK (reviewer_status IN ('not_requested','queued','completed','blocked','failed')),
  ADD COLUMN IF NOT EXISTS reviewer_summary TEXT,
  ADD COLUMN IF NOT EXISTS reviewer_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_note TEXT;

CREATE INDEX IF NOT EXISTS ace_ai_activation_proposals_review_idx
  ON ace_ai_activation_proposals (workspace_id,reviewer_status,status,expires_at);
