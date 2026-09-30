CREATE TABLE IF NOT EXISTS ace_provider_migrations (
  id text PRIMARY KEY,
  capability text NOT NULL,
  environment text NOT NULL,
  from_provider text NOT NULL,
  to_provider text NOT NULL,
  strategy text NOT NULL DEFAULT 'shadow'
    CHECK (strategy IN ('shadow','canary','dual_route','cutover')),
  state text NOT NULL DEFAULT 'draft'
    CHECK (state IN (
      'draft','validating','shadowing','canary','cutover','verifying','stabilizing','completed',
      'failed','rollback_requested','rolling_back','rolled_back','manual_recovery_required'
    )),
  traffic_percent integer NOT NULL DEFAULT 0 CHECK (traffic_percent>=0 AND traffic_percent<=100),
  compatibility_report jsonb NOT NULL DEFAULT '{}'::jsonb,
  cutover_boundary jsonb NOT NULL DEFAULT '{}'::jsonb,
  rollback_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by text NOT NULL,
  source_change_id text REFERENCES ace_platform_changes(id),
  failure_reason text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS ace_provider_migrations_active_idx
  ON ace_provider_migrations(environment,capability,state,updated_at DESC);
