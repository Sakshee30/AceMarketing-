CREATE TABLE IF NOT EXISTS ace_click_sessions (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  visitor_id TEXT,
  customer_id TEXT,
  email_sha256 TEXT,
  phone_sha256 TEXT,
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  fbclid TEXT,
  msclkid TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  landing_url TEXT,
  referrer TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ace_click_sessions_workspace_time_idx
  ON ace_click_sessions (workspace_id,last_seen_at DESC);
CREATE INDEX IF NOT EXISTS ace_click_sessions_customer_idx
  ON ace_click_sessions (workspace_id,customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ace_click_sessions_email_idx
  ON ace_click_sessions (workspace_id,email_sha256) WHERE email_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS ace_click_sessions_phone_idx
  ON ace_click_sessions (workspace_id,phone_sha256) WHERE phone_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS ace_click_sessions_gclid_idx
  ON ace_click_sessions (workspace_id,gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS ace_click_sessions_fbclid_idx
  ON ace_click_sessions (workspace_id,fbclid) WHERE fbclid IS NOT NULL;

CREATE TABLE IF NOT EXISTS ace_assisted_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  customer_id TEXT,
  visitor_id TEXT,
  email_sha256 TEXT,
  phone_sha256 TEXT,
  gclid TEXT,
  gbraid TEXT,
  wbraid TEXT,
  fbclid TEXT,
  msclkid TEXT,
  value NUMERIC(18,2),
  currency TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  matched_session_id TEXT REFERENCES ace_click_sessions(id) ON DELETE SET NULL,
  match_method TEXT,
  match_confidence NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('unmatched','matched','held','returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,idempotency_key)
);

CREATE INDEX IF NOT EXISTS ace_assisted_events_workspace_time_idx
  ON ace_assisted_events (workspace_id,occurred_at DESC);
CREATE INDEX IF NOT EXISTS ace_assisted_events_unmatched_idx
  ON ace_assisted_events (workspace_id,status,occurred_at)
  WHERE status='unmatched';
