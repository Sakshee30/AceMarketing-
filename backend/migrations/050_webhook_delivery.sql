CREATE TABLE IF NOT EXISTS ace_webhook_subscriptions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  name text NOT NULL,
  destination_url text NOT NULL,
  event_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','disabled')),
  encrypted_signing_secret jsonb NOT NULL,
  signing_key_id text NOT NULL,
  max_attempts integer NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 20),
  retry_window_seconds integer NOT NULL DEFAULT 86400 CHECK (retry_window_seconds BETWEEN 60 AND 604800),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,name)
);

CREATE TABLE IF NOT EXISTS ace_webhook_deliveries (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  subscription_id text NOT NULL REFERENCES ace_webhook_subscriptions(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','queued','delivering','retrying','delivered','dead_letter','paused','unknown_outcome','cancelled')),
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  next_retry_at timestamptz,
  signing_key_id text,
  correlation_id text,
  last_status_code integer,
  last_error_code text,
  last_error text,
  response_summary text,
  replay_of text,
  delivered_at timestamptz,
  deadline_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,subscription_id,event_id)
);

CREATE TABLE IF NOT EXISTS ace_webhook_delivery_attempts (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  delivery_id text NOT NULL REFERENCES ace_webhook_deliveries(id) ON DELETE CASCADE,
  attempt_no integer NOT NULL,
  status text NOT NULL CHECK (status IN ('delivered','retryable_failure','permanent_failure','unknown_outcome')),
  http_status integer,
  latency_ms integer,
  response_summary text,
  error_code text,
  error_message text,
  signing_key_id text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,delivery_id,attempt_no)
);

CREATE INDEX IF NOT EXISTS ace_webhook_subscriptions_workspace_idx
  ON ace_webhook_subscriptions(workspace_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_webhook_deliveries_workspace_idx
  ON ace_webhook_deliveries(workspace_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_webhook_deliveries_retry_idx
  ON ace_webhook_deliveries(status,next_retry_at);
CREATE INDEX IF NOT EXISTS ace_webhook_attempts_delivery_idx
  ON ace_webhook_delivery_attempts(workspace_id,delivery_id,attempt_no DESC);

ALTER TABLE ace_webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_webhook_subscriptions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_webhook_subscriptions_workspace_policy ON ace_webhook_subscriptions;
CREATE POLICY ace_webhook_subscriptions_workspace_policy ON ace_webhook_subscriptions
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_webhook_deliveries FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_webhook_deliveries_workspace_policy ON ace_webhook_deliveries;
CREATE POLICY ace_webhook_deliveries_workspace_policy ON ace_webhook_deliveries
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_webhook_delivery_attempts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_webhook_delivery_attempts_workspace_policy ON ace_webhook_delivery_attempts;
CREATE POLICY ace_webhook_delivery_attempts_workspace_policy ON ace_webhook_delivery_attempts
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);
