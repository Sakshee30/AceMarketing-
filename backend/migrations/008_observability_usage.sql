CREATE TABLE IF NOT EXISTS ace_api_metrics (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  latency_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_api_metrics_workspace_time_idx
  ON ace_api_metrics (workspace_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ace_api_metrics_status_time_idx
  ON ace_api_metrics (workspace_id,status_code,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_usage_daily (
  workspace_id TEXT NOT NULL,
  usage_date DATE NOT NULL,
  api_requests BIGINT NOT NULL DEFAULT 0,
  tracked_events BIGINT NOT NULL DEFAULT 0,
  assisted_events BIGINT NOT NULL DEFAULT 0,
  signal_dispatches BIGINT NOT NULL DEFAULT 0,
  agent_actions BIGINT NOT NULL DEFAULT 0,
  audience_syncs BIGINT NOT NULL DEFAULT 0,
  custom_integration_tests BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (workspace_id,usage_date)
);

CREATE TABLE IF NOT EXISTS ace_monitoring_rules (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('gt','gte','lt','lte')),
  threshold NUMERIC NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  window_minutes INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,metric)
);

CREATE TABLE IF NOT EXISTS ace_alert_incidents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  rule_id TEXT REFERENCES ace_monitoring_rules(id) ON DELETE SET NULL,
  metric TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  detail TEXT NOT NULL,
  metric_value NUMERIC,
  threshold NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_alert_incidents_workspace_idx
  ON ace_alert_incidents (workspace_id,status,detected_at DESC);
