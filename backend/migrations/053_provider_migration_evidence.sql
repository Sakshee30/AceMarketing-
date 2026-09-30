ALTER TABLE ace_provider_migrations
  ADD COLUMN IF NOT EXISTS dependency_inventory JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS capacity_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS irreversible_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS point_of_no_return_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stabilization_started_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ace_provider_migrations_capability_state_idx
  ON ace_provider_migrations (environment, capability, state, updated_at DESC);
