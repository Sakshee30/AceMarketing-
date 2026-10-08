-- The workspace state document is rewritten in full on every change. With the default
-- pglz TOAST compression, recompressing a multi-megabyte value dominates the write time
-- (about 3 s for 24 MB); lz4 does the same in well under a second. Existing values are
-- recompressed the next time they are written.
DO $$
BEGIN
  ALTER TABLE ace_workspace_state ALTER COLUMN state SET COMPRESSION lz4;
EXCEPTION WHEN feature_not_supported OR invalid_parameter_value THEN
  RAISE NOTICE 'lz4 TOAST compression is unavailable on this server; keeping the default';
END $$;
