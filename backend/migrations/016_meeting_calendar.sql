ALTER TABLE ace_meeting_records
  ADD COLUMN IF NOT EXISTS attendee_email TEXT,
  ADD COLUMN IF NOT EXISTS attendee_phone TEXT,
  ADD COLUMN IF NOT EXISTS meeting_link TEXT,
  ADD COLUMN IF NOT EXISTS calendar_html_link TEXT;

CREATE INDEX IF NOT EXISTS ace_meeting_records_external_calendar_idx
  ON ace_meeting_records (workspace_id,external_calendar_id)
  WHERE external_calendar_id IS NOT NULL AND external_calendar_id <> '';
