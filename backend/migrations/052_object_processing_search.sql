ALTER TABLE ace_objects
  ADD COLUMN IF NOT EXISTS approved_storage_version TEXT,
  ADD COLUMN IF NOT EXISTS approved_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS extraction_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS indexing_status TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS searchable_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_error TEXT;

ALTER TABLE ace_objects
  DROP CONSTRAINT IF EXISTS ace_objects_extraction_status_check;
ALTER TABLE ace_objects
  ADD CONSTRAINT ace_objects_extraction_status_check
  CHECK (extraction_status IN ('not_started','pending','running','completed','failed','deleted'));

ALTER TABLE ace_objects
  DROP CONSTRAINT IF EXISTS ace_objects_indexing_status_check;
ALTER TABLE ace_objects
  ADD CONSTRAINT ace_objects_indexing_status_check
  CHECK (indexing_status IN ('not_started','pending','running','completed','failed','deleted'));

CREATE TABLE IF NOT EXISTS ace_object_processing_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  object_id TEXT NOT NULL REFERENCES ace_objects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('scan','extract','index','retention','delete')),
  status TEXT NOT NULL CHECK (status IN ('pending','running','completed','failed','skipped')),
  object_sha256 TEXT,
  storage_version TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_object_processing_events_object_idx
  ON ace_object_processing_events (workspace_id,object_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_search_documents (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  source_version TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  access_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_sha256 TEXT NOT NULL,
  indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE (workspace_id,source_type,source_id,source_version)
);

CREATE INDEX IF NOT EXISTS ace_search_documents_workspace_idx
  ON ace_search_documents (workspace_id,source_type,indexed_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ace_search_documents_fts_idx
  ON ace_search_documents
  USING GIN (to_tsvector('english',coalesce(title,'')||' '||coalesce(body,'')))
  WHERE deleted_at IS NULL;

ALTER TABLE ace_object_processing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_object_processing_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_object_processing_events_workspace_policy ON ace_object_processing_events;
CREATE POLICY ace_object_processing_events_workspace_policy ON ace_object_processing_events
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_search_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_search_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_search_documents_workspace_policy ON ace_search_documents;
CREATE POLICY ace_search_documents_workspace_policy ON ace_search_documents
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
);
