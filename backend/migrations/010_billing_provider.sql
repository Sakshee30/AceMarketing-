ALTER TABLE ace_workspace_subscriptions
  ADD COLUMN IF NOT EXISTS provider_price_id TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS ace_billing_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  workspace_id TEXT,
  event_type TEXT NOT NULL,
  payload_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received','processed','ignored','failed')),
  error TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  UNIQUE (provider,provider_event_id)
);

CREATE INDEX IF NOT EXISTS ace_billing_events_workspace_idx
  ON ace_billing_events (workspace_id,received_at DESC);
