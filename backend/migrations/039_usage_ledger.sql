CREATE TABLE IF NOT EXISTS ace_usage_ledger (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  event_id text NOT NULL,
  metric text NOT NULL,
  quantity bigint NOT NULL CHECK (quantity > 0),
  request_id text,
  reservation_id text,
  source text NOT NULL DEFAULT 'api',
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, event_id)
);

CREATE INDEX IF NOT EXISTS ace_usage_ledger_workspace_metric_idx
  ON ace_usage_ledger (workspace_id, usage_date, metric, created_at DESC);

CREATE INDEX IF NOT EXISTS ace_usage_ledger_request_idx
  ON ace_usage_ledger (workspace_id, request_id, metric)
  WHERE request_id IS NOT NULL;

ALTER TABLE ace_usage_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_usage_ledger FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_usage_ledger_workspace_policy ON ace_usage_ledger;
CREATE POLICY ace_usage_ledger_workspace_policy ON ace_usage_ledger
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_usage_reservations
  DROP CONSTRAINT IF EXISTS ace_usage_reservations_status_check;

ALTER TABLE ace_usage_reservations
  ADD CONSTRAINT ace_usage_reservations_status_check
  CHECK (status IN ('reserved','committed','accounted','released'));
