CREATE TABLE IF NOT EXISTS ace_connector_sync_runs (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  connector text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('backfill','incremental','manual')),
  status text NOT NULL CHECK (status IN ('queued','running','succeeded','failed','partial')),
  requested_start timestamptz,
  requested_end timestamptz,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ace_connector_sync_runs_workspace_idx
  ON ace_connector_sync_runs(workspace_id,connector,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_connector_checkpoints (
  workspace_id text NOT NULL,
  connector text NOT NULL,
  stream text NOT NULL,
  cursor jsonb NOT NULL DEFAULT '{}'::jsonb,
  watermark timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,connector,stream)
);

CREATE TABLE IF NOT EXISTS ace_connector_raw_records (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  connector text NOT NULL,
  stream text NOT NULL,
  source_id text NOT NULL,
  observed_at timestamptz,
  payload_hash text NOT NULL,
  payload jsonb NOT NULL,
  sync_run_id text REFERENCES ace_connector_sync_runs(id) ON DELETE SET NULL,
  ingested_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,connector,stream,source_id,payload_hash)
);
CREATE INDEX IF NOT EXISTS ace_connector_raw_records_lookup_idx
  ON ace_connector_raw_records(workspace_id,connector,stream,observed_at DESC);

CREATE TABLE IF NOT EXISTS ace_campaign_daily (
  workspace_id text NOT NULL,
  connector text NOT NULL,
  account_id text NOT NULL DEFAULT '',
  campaign_id text NOT NULL,
  campaign_name text,
  day date NOT NULL,
  currency text,
  spend numeric NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  clicks bigint NOT NULL DEFAULT 0,
  conversions numeric NOT NULL DEFAULT 0,
  conversion_value numeric NOT NULL DEFAULT 0,
  sessions numeric NOT NULL DEFAULT 0,
  users numeric NOT NULL DEFAULT 0,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,connector,account_id,campaign_id,day)
);
CREATE INDEX IF NOT EXISTS ace_campaign_daily_day_idx
  ON ace_campaign_daily(workspace_id,day DESC,connector);

CREATE TABLE IF NOT EXISTS ace_crm_records (
  workspace_id text NOT NULL,
  connector text NOT NULL,
  object_type text NOT NULL,
  source_id text NOT NULL,
  source_updated_at timestamptz,
  normalized jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb NOT NULL,
  sync_run_id text REFERENCES ace_connector_sync_runs(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workspace_id,connector,object_type,source_id)
);
CREATE INDEX IF NOT EXISTS ace_crm_records_updated_idx
  ON ace_crm_records(workspace_id,connector,object_type,source_updated_at DESC);

ALTER TABLE ace_connector_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_connector_sync_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_connector_sync_runs_workspace_policy ON ace_connector_sync_runs;
CREATE POLICY ace_connector_sync_runs_workspace_policy ON ace_connector_sync_runs
USING (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true')
WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true');

ALTER TABLE ace_connector_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_connector_checkpoints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_connector_checkpoints_workspace_policy ON ace_connector_checkpoints;
CREATE POLICY ace_connector_checkpoints_workspace_policy ON ace_connector_checkpoints
USING (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true')
WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true');

ALTER TABLE ace_connector_raw_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_connector_raw_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_connector_raw_records_workspace_policy ON ace_connector_raw_records;
CREATE POLICY ace_connector_raw_records_workspace_policy ON ace_connector_raw_records
USING (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true')
WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true');

ALTER TABLE ace_campaign_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_campaign_daily FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_campaign_daily_workspace_policy ON ace_campaign_daily;
CREATE POLICY ace_campaign_daily_workspace_policy ON ace_campaign_daily
USING (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true')
WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true');

ALTER TABLE ace_crm_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_crm_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_crm_records_workspace_policy ON ace_crm_records;
CREATE POLICY ace_crm_records_workspace_policy ON ace_crm_records
USING (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true')
WITH CHECK (workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true) = 'true');

ALTER TABLE ace_connector_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_connector_raw_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_campaign_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_crm_records ENABLE ROW LEVEL SECURITY;
