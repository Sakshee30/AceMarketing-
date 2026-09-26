ALTER TABLE ace_report_schedules
  DROP CONSTRAINT IF EXISTS ace_report_schedules_report_type_check;

ALTER TABLE ace_report_schedules
  ADD CONSTRAINT ace_report_schedules_report_type_check
  CHECK (report_type IN ('cohort','executive_brief'));

ALTER TABLE ace_report_schedules
  ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS ace_report_schedules_type_idx
  ON ace_report_schedules (workspace_id,report_type,created_at DESC);
