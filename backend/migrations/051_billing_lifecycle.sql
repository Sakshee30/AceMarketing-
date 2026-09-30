ALTER TABLE ace_workspace_subscriptions
  DROP CONSTRAINT IF EXISTS ace_workspace_subscriptions_status_check;

ALTER TABLE ace_workspace_subscriptions
  ADD CONSTRAINT ace_workspace_subscriptions_status_check
  CHECK (status IN ('trial','active','grace','past_due','suspended','cancelled','expired'));

ALTER TABLE ace_workspace_subscriptions
  ADD COLUMN IF NOT EXISTS entitlements_version BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS grace_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS billing_state_reason TEXT;

CREATE TABLE IF NOT EXISTS ace_entitlement_versions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  version BIGINT NOT NULL,
  plan_code TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL,
  reason TEXT,
  provider_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, version)
);

CREATE INDEX IF NOT EXISTS ace_entitlement_versions_workspace_idx
  ON ace_entitlement_versions (workspace_id, version DESC);

CREATE TABLE IF NOT EXISTS ace_billing_reconciliation_records (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT,
  source TEXT NOT NULL,
  previous_status TEXT,
  next_status TEXT,
  previous_plan_code TEXT,
  next_plan_code TEXT,
  entitlements_version BIGINT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'applied'
    CHECK (outcome IN ('applied','duplicate','ignored','failed')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_billing_reconciliation_workspace_idx
  ON ace_billing_reconciliation_records (workspace_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ace_billing_reconciliation_provider_event_idx
  ON ace_billing_reconciliation_records (provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;
