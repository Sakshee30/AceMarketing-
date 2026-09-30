CREATE TABLE IF NOT EXISTS ace_recovery_exercises (
  id text PRIMARY KEY,
  environment text NOT NULL,
  scenario text NOT NULL
    CHECK (scenario IN (
      'process_loss','availability_zone_loss','database_failover','regional_disaster',
      'data_corruption','tenant_restore','object_recovery','queue_reconciliation','credential_recovery'
    )),
  state text NOT NULL DEFAULT 'planned'
    CHECK (state IN ('planned','running','passed','failed','manual_recovery_required')),
  declared_rpo_minutes integer CHECK (declared_rpo_minutes IS NULL OR declared_rpo_minutes>=0),
  declared_rto_minutes integer CHECK (declared_rto_minutes IS NULL OR declared_rto_minutes>=0),
  measured_rpo_minutes integer CHECK (measured_rpo_minutes IS NULL OR measured_rpo_minutes>=0),
  measured_rto_minutes integer CHECK (measured_rto_minutes IS NULL OR measured_rto_minutes>=0),
  integrity_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  reconciliation jsonb NOT NULL DEFAULT '{}'::jsonb,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  remediation_owner text,
  next_exercise_at timestamptz,
  incident_commander text,
  started_at timestamptz,
  completed_at timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS ace_backup_evidence (
  id text PRIMARY KEY,
  environment text NOT NULL,
  resource_type text NOT NULL,
  resource_ref text NOT NULL,
  backup_mode text NOT NULL,
  retention_days integer CHECK (retention_days IS NULL OR retention_days>=0),
  pitr_enabled boolean NOT NULL DEFAULT false,
  object_versioning_enabled boolean NOT NULL DEFAULT false,
  encryption_verified boolean NOT NULL DEFAULT false,
  deletion_protection_verified boolean NOT NULL DEFAULT false,
  independent_copy_verified boolean NOT NULL DEFAULT false,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  observed_at timestamptz NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_recovery_exercises_env_idx
  ON ace_recovery_exercises(environment,state,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_backup_evidence_env_idx
  ON ace_backup_evidence(environment,observed_at DESC);
