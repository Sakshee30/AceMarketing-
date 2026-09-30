CREATE TABLE IF NOT EXISTS ace_platform_changes (
  id text PRIMARY KEY,
  environment text NOT NULL,
  scope_type text NOT NULL,
  scope_id text,
  requested_by text NOT NULL,
  requested_role text NOT NULL,
  reason text NOT NULL,
  ticket text,
  risk text NOT NULL DEFAULT 'medium'
    CHECK (risk IN ('low','medium','high','critical')),
  old_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  desired_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  impact_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_gates jsonb NOT NULL DEFAULT '[]'::jsonb,
  rollback_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'draft'
    CHECK (state IN (
      'draft','validating','impact_analysis','waiting_approval','approved',
      'provisioning','deploying','verifying','stabilizing','completed',
      'rejected','failed','rollback_requested','rolling_back','rolled_back',
      'manual_recovery_required'
    )),
  plan_digest text,
  approved_plan_digest text,
  execution_id text,
  failure_reason text,
  rollback_change_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS ace_platform_change_approvals (
  id text PRIMARY KEY,
  change_id text NOT NULL REFERENCES ace_platform_changes(id) ON DELETE CASCADE,
  approver text NOT NULL,
  approver_role text NOT NULL,
  decision text NOT NULL CHECK (decision IN ('approved','rejected')),
  comment text,
  plan_digest text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ace_platform_change_events (
  id text PRIMARY KEY,
  change_id text NOT NULL REFERENCES ace_platform_changes(id) ON DELETE CASCADE,
  actor text NOT NULL,
  actor_role text NOT NULL,
  event_type text NOT NULL,
  from_state text,
  to_state text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_platform_changes_state_idx
  ON ace_platform_changes(state,environment,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_platform_change_approvals_change_idx
  ON ace_platform_change_approvals(change_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ace_platform_change_events_change_idx
  ON ace_platform_change_events(change_id,created_at DESC);
