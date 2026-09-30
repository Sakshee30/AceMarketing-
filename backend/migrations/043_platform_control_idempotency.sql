CREATE TABLE IF NOT EXISTS ace_platform_control_commands (
  id text PRIMARY KEY,
  idempotency_key text NOT NULL,
  actor text NOT NULL,
  operation text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing','completed','failed')),
  response_status integer,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  UNIQUE (actor,idempotency_key)
);

CREATE INDEX IF NOT EXISTS ace_platform_control_commands_expiry_idx
  ON ace_platform_control_commands(status,expires_at);
