CREATE TABLE IF NOT EXISTS ace_forms (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  latest_version integer NOT NULL DEFAULT 0,
  published_version integer,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS ace_form_versions (
  form_id text NOT NULL REFERENCES ace_forms(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  version integer NOT NULL,
  schema_json jsonb NOT NULL,
  schema_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  PRIMARY KEY (form_id, version)
);

CREATE TABLE IF NOT EXISTS ace_form_submissions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  form_id text NOT NULL REFERENCES ace_forms(id) ON DELETE RESTRICT,
  form_version integer NOT NULL,
  submitted_by text,
  data_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, form_id, id)
);

CREATE INDEX IF NOT EXISTS ace_forms_workspace_status_idx ON ace_forms (workspace_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_form_versions_workspace_idx ON ace_form_versions (workspace_id, form_id, version DESC);
CREATE INDEX IF NOT EXISTS ace_form_submissions_workspace_time_idx ON ace_form_submissions (workspace_id, form_id, created_at DESC);

ALTER TABLE ace_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_forms FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_forms_workspace_policy ON ace_forms;
CREATE POLICY ace_forms_workspace_policy ON ace_forms
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_form_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_form_versions_workspace_policy ON ace_form_versions;
CREATE POLICY ace_form_versions_workspace_policy ON ace_form_versions
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);

ALTER TABLE ace_form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_form_submissions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_form_submissions_workspace_policy ON ace_form_submissions;
CREATE POLICY ace_form_submissions_workspace_policy ON ace_form_submissions
USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
)
WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'')
  OR current_setting('app.system_worker', true) = 'true'
);
