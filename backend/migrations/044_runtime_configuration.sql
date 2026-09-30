CREATE TABLE IF NOT EXISTS ace_runtime_config_snapshots (
  version bigserial PRIMARY KEY,
  id text NOT NULL UNIQUE,
  environment text NOT NULL,
  payload jsonb NOT NULL,
  checksum text NOT NULL,
  signature text NOT NULL,
  signing_key_id text NOT NULL,
  state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('active','superseded','revoked')),
  lease_expires_at timestamptz NOT NULL,
  source_change_id text REFERENCES ace_platform_changes(id),
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ace_emergency_controls (
  id text PRIMARY KEY,
  scope_type text NOT NULL
    CHECK (scope_type IN ('platform','region','cell','tenant','workspace','service','feature')),
  scope_id text,
  control_type text NOT NULL
    CHECK (control_type IN ('stop_uploads','pause_integrations','suspend_ai','disable_signup','read_only')),
  reason text NOT NULL,
  state text NOT NULL DEFAULT 'active'
    CHECK (state IN ('active','revoked','expired')),
  created_by text NOT NULL,
  revoked_by text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  version integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS ace_runtime_config_environment_idx
  ON ace_runtime_config_snapshots(environment,state,version DESC);
CREATE INDEX IF NOT EXISTS ace_emergency_controls_active_idx
  ON ace_emergency_controls(state,expires_at,scope_type,scope_id);
