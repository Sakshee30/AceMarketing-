ALTER TABLE ace_emergency_controls
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'production';

CREATE INDEX IF NOT EXISTS ace_emergency_controls_environment_idx
  ON ace_emergency_controls(environment,state,expires_at,scope_type,scope_id);
