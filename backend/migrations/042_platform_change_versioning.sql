ALTER TABLE ace_platform_changes
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS ace_platform_changes_version_idx
  ON ace_platform_changes(id,version);
