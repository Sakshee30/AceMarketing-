CREATE TABLE IF NOT EXISTS ace_objects (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  object_key text NOT NULL,
  original_name text NOT NULL,
  declared_mime text NOT NULL,
  detected_mime text,
  expected_size bigint NOT NULL CHECK (expected_size >= 0),
  actual_size bigint,
  expected_sha256 text NOT NULL,
  actual_sha256 text,
  storage_provider text NOT NULL DEFAULT 'quarantine',
  storage_version text,
  status text NOT NULL DEFAULT 'upload_pending'
    CHECK (status IN ('upload_pending','quarantined','verifying','approved','rejected','deleted')),
  scan_status text NOT NULL DEFAULT 'pending'
    CHECK (scan_status IN ('pending','clean','infected','error')),
  scan_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  access_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  retention_until timestamptz,
  legal_hold boolean NOT NULL DEFAULT false,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  deleted_at timestamptz,
  UNIQUE (workspace_id, object_key)
);

CREATE TABLE IF NOT EXISTS ace_object_access_grants (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  object_id text NOT NULL REFERENCES ace_objects(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('upload','download')),
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, token_hash)
);

CREATE INDEX IF NOT EXISTS ace_objects_workspace_status_idx
  ON ace_objects(workspace_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_object_grants_workspace_expiry_idx
  ON ace_object_access_grants(workspace_id,object_id,expires_at DESC);

ALTER TABLE ace_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_objects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_objects_workspace_policy ON ace_objects;
CREATE POLICY ace_objects_workspace_policy ON ace_objects
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_object_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_object_access_grants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_object_access_grants_workspace_policy ON ace_object_access_grants;
CREATE POLICY ace_object_access_grants_workspace_policy ON ace_object_access_grants
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true)='true'
);
