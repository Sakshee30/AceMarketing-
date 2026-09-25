CREATE TABLE IF NOT EXISTS ace_event_rules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_event TEXT NOT NULL,
  output_event TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
  destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  value_mode TEXT NOT NULL DEFAULT 'copy'
    CHECK (value_mode IN ('copy','fixed','field')),
  value_field TEXT,
  fixed_value NUMERIC(18,2),
  currency TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_event_rules_workspace_idx
  ON ace_event_rules (workspace_id,enabled,source_event);

CREATE TABLE IF NOT EXISTS ace_event_rule_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  rule_id TEXT NOT NULL REFERENCES ace_event_rules(id) ON DELETE CASCADE,
  source_event_id TEXT,
  source_event TEXT NOT NULL,
  output_event TEXT NOT NULL,
  matched BOOLEAN NOT NULL DEFAULT true,
  assisted_event_id TEXT,
  destinations JSONB NOT NULL DEFAULT '[]'::jsonb,
  activation_queued INTEGER NOT NULL DEFAULT 0,
  evaluation JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_event_rule_runs_workspace_idx
  ON ace_event_rule_runs (workspace_id,created_at DESC);
