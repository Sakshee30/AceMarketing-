CREATE TABLE IF NOT EXISTS ace_custom_objects (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  object_key text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  latest_version integer NOT NULL DEFAULT 1,
  published_version integer,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, object_key)
);

CREATE TABLE IF NOT EXISTS ace_custom_object_versions (
  object_id text NOT NULL REFERENCES ace_custom_objects(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  version integer NOT NULL,
  schema_json jsonb NOT NULL,
  schema_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  PRIMARY KEY (object_id, version)
);

CREATE TABLE IF NOT EXISTS ace_custom_object_records (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  object_id text NOT NULL REFERENCES ace_custom_objects(id) ON DELETE RESTRICT,
  object_version integer NOT NULL,
  data_json jsonb NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, object_id, id)
);

CREATE INDEX IF NOT EXISTS ace_custom_objects_workspace_status_idx
  ON ace_custom_objects (workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_custom_object_versions_workspace_idx
  ON ace_custom_object_versions (workspace_id, object_id, version DESC);
CREATE INDEX IF NOT EXISTS ace_custom_object_records_workspace_time_idx
  ON ace_custom_object_records (workspace_id, object_id, created_at DESC);

ALTER TABLE ace_custom_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_custom_objects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_custom_objects_workspace_policy ON ace_custom_objects;
CREATE POLICY ace_custom_objects_workspace_policy ON ace_custom_objects
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_custom_object_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_custom_object_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_custom_object_versions_workspace_policy ON ace_custom_object_versions;
CREATE POLICY ace_custom_object_versions_workspace_policy ON ace_custom_object_versions
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_custom_object_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_custom_object_records FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_custom_object_records_workspace_policy ON ace_custom_object_records;
CREATE POLICY ace_custom_object_records_workspace_policy ON ace_custom_object_records
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);
