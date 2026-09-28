ALTER TABLE ace_jobs
  DROP CONSTRAINT IF EXISTS ace_jobs_status_check;

ALTER TABLE ace_jobs
  ADD CONSTRAINT ace_jobs_status_check
  CHECK (status IN ('pending','leased','retry','succeeded','dead_letter','cancelled','unknown_outcome'));

CREATE INDEX IF NOT EXISTS ace_jobs_cancel_idx
  ON ace_jobs (workspace_id,cancel_requested_at)
  WHERE cancel_requested_at IS NOT NULL;
