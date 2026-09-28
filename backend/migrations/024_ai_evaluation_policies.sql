CREATE TABLE IF NOT EXISTS ace_ai_evaluation_policies (
  workspace_id TEXT NOT NULL,
  task TEXT NOT NULL,
  version TEXT NOT NULL,
  thresholds JSONB NOT NULL,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,task,version)
);

CREATE UNIQUE INDEX IF NOT EXISTS ace_ai_evaluation_policy_active_idx
  ON ace_ai_evaluation_policies (workspace_id,task)
  WHERE active=true;

ALTER TABLE ace_ai_evaluations
  ADD COLUMN IF NOT EXISTS policy_version TEXT,
  ADD COLUMN IF NOT EXISTS qualification_details JSONB NOT NULL DEFAULT '{}'::jsonb;
