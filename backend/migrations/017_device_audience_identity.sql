ALTER TABLE ace_lead_profiles
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS device_platform TEXT,
  ADD COLUMN IF NOT EXISTS app_id TEXT;

CREATE INDEX IF NOT EXISTS ace_lead_profiles_device_idx
  ON ace_lead_profiles (workspace_id,device_id)
  WHERE device_id IS NOT NULL AND device_id <> '';

ALTER TABLE ace_audiences
  ADD COLUMN IF NOT EXISTS identity_mode TEXT NOT NULL DEFAULT 'contact'
  CHECK (identity_mode IN ('contact','device','auto'));
