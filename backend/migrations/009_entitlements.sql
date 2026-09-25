CREATE TABLE IF NOT EXISTS ace_workspace_subscriptions (
  workspace_id TEXT PRIMARY KEY,
  plan_code TEXT NOT NULL DEFAULT 'usage',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('trial','active','past_due','suspended','cancelled')),
  entitlements JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_provider TEXT,
  external_customer_id TEXT,
  external_subscription_id TEXT,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month',now()),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month',now())+interval '1 month'),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ace_usage_reservations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 1,
  period_start DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved'
    CHECK (status IN ('reserved','committed','released')),
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_usage_reservations_workspace_idx
  ON ace_usage_reservations (workspace_id,period_start,metric,status);

CREATE UNIQUE INDEX IF NOT EXISTS ace_usage_reservations_request_idx
  ON ace_usage_reservations (workspace_id,request_id,metric)
  WHERE request_id IS NOT NULL;
