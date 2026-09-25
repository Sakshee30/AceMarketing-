CREATE TABLE IF NOT EXISTS ace_report_schedules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'cohort'
    CHECK (report_type IN ('cohort')),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  cadence TEXT NOT NULL DEFAULT 'weekly'
    CHECK (cadence IN ('daily','weekly','monthly')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  lookback_months INTEGER NOT NULL DEFAULT 6 CHECK (lookback_months BETWEEN 1 AND 36),
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  last_status TEXT NOT NULL DEFAULT 'scheduled',
  last_error TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_report_schedules_due_idx
  ON ace_report_schedules (enabled,next_run_at)
  WHERE enabled=true;

CREATE TABLE IF NOT EXISTS ace_report_deliveries (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  schedule_id TEXT REFERENCES ace_report_schedules(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sending','sent','retrying','failed')),
  recipients TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_report_deliveries_workspace_idx
  ON ace_report_deliveries (workspace_id,queued_at DESC);
