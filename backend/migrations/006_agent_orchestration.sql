CREATE TABLE IF NOT EXISTS ace_agent_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  entity_id TEXT,
  trigger_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','running','waiting','succeeded','retrying','failed','cancelled')),
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_agent_runs_workspace_idx
  ON ace_agent_runs (workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ace_agent_runs_status_idx
  ON ace_agent_runs (workspace_id,status,scheduled_for);

CREATE TABLE IF NOT EXISTS ace_routing_decisions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  lead_ref TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  reason TEXT,
  sla_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'routed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_routing_decisions_workspace_idx
  ON ace_routing_decisions (workspace_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_followup_tasks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  lead_ref TEXT NOT NULL,
  reason TEXT NOT NULL,
  channel TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','queued','running','completed','cancelled','failed')),
  due_at TIMESTAMPTZ,
  owner TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_followup_tasks_workspace_idx
  ON ace_followup_tasks (workspace_id,status,due_at);

CREATE TABLE IF NOT EXISTS ace_meeting_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  lead_ref TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  owner TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  reminder_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  reminders_sent INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  no_show_risk TEXT,
  external_calendar_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_meeting_records_workspace_idx
  ON ace_meeting_records (workspace_id,starts_at);

CREATE TABLE IF NOT EXISTS ace_feedback_responses (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  lead_ref TEXT NOT NULL,
  channel TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 1 AND 5),
  theme TEXT,
  response TEXT,
  source_agent_run_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_feedback_responses_workspace_idx
  ON ace_feedback_responses (workspace_id,created_at DESC);
