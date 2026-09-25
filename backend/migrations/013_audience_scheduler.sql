ALTER TABLE ace_audiences
  ADD COLUMN IF NOT EXISTS cadence_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS max_staleness_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS membership_hash TEXT;

CREATE TABLE IF NOT EXISTS ace_audience_schedules (
  audience_id TEXT PRIMARY KEY REFERENCES ace_audiences(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  cadence_seconds INTEGER NOT NULL CHECK (cadence_seconds BETWEEN 60 AND 604800),
  max_staleness_seconds INTEGER NOT NULL DEFAULT 86400 CHECK (max_staleness_seconds BETWEEN 300 AND 2592000),
  enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_run_at TIMESTAMPTZ,
  last_change_at TIMESTAMPTZ,
  last_membership_hash TEXT,
  last_member_count INTEGER NOT NULL DEFAULT 0,
  last_added INTEGER NOT NULL DEFAULT 0,
  last_removed INTEGER NOT NULL DEFAULT 0,
  last_status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (last_status IN ('scheduled','running','unchanged','queued','error','paused')),
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_audience_schedules_due_idx
  ON ace_audience_schedules (enabled,next_run_at)
  WHERE enabled=true;

CREATE TABLE IF NOT EXISTS ace_audience_refresh_runs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  audience_id TEXT NOT NULL REFERENCES ace_audiences(id) ON DELETE CASCADE,
  previous_count INTEGER NOT NULL DEFAULT 0,
  current_count INTEGER NOT NULL DEFAULT 0,
  added_count INTEGER NOT NULL DEFAULT 0,
  removed_count INTEGER NOT NULL DEFAULT 0,
  membership_changed BOOLEAN NOT NULL DEFAULT false,
  sync_queued BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_audience_refresh_runs_workspace_idx
  ON ace_audience_refresh_runs (workspace_id,audience_id,created_at DESC);
