CREATE TABLE IF NOT EXISTS ace_request_idempotency (
  workspace_id text NOT NULL,
  operation_id text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  response_status integer,
  response_body jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  PRIMARY KEY (workspace_id, operation_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS ace_request_idempotency_expiry_idx
  ON ace_request_idempotency (expires_at);

CREATE TABLE IF NOT EXISTS ace_outbox_events (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  event_type text NOT NULL,
  aggregate_type text,
  aggregate_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','leased','published','dead_letter')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_owner text,
  leased_until timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX IF NOT EXISTS ace_outbox_events_delivery_idx
  ON ace_outbox_events (status, available_at, created_at);

CREATE TABLE IF NOT EXISTS ace_inbox_events (
  source text NOT NULL,
  event_id text NOT NULL,
  workspace_id text NOT NULL,
  payload_hash text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  result jsonb,
  PRIMARY KEY (source, event_id)
);

CREATE INDEX IF NOT EXISTS ace_inbox_events_workspace_idx
  ON ace_inbox_events (workspace_id, received_at);
