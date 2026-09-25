CREATE TABLE IF NOT EXISTS ace_privacy_requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export','delete','retention_purge')),
  selector_type TEXT,
  selector_hash TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('received','processing','completed','failed')),
  result_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ace_privacy_requests_workspace_idx
  ON ace_privacy_requests (workspace_id,created_at DESC);
