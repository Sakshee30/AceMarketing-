CREATE TABLE IF NOT EXISTS ace_policy_rules (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  latest_version integer NOT NULL DEFAULT 1,
  published_version integer,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ace_policy_rule_versions (
  rule_id text NOT NULL REFERENCES ace_policy_rules(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  version integer NOT NULL,
  input_schema_version integer NOT NULL DEFAULT 1,
  expression jsonb NOT NULL,
  expression_hash text NOT NULL,
  evaluator_version text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  PRIMARY KEY (rule_id, version)
);

CREATE TABLE IF NOT EXISTS ace_policy_rule_decisions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  rule_id text NOT NULL,
  rule_version integer NOT NULL,
  decision boolean NOT NULL,
  reason_code text NOT NULL,
  evaluator_version text NOT NULL,
  input_schema_version integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_policy_rules_workspace_idx ON ace_policy_rules(workspace_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_policy_decisions_workspace_idx ON ace_policy_rule_decisions(workspace_id,rule_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_workflows (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  latest_version integer NOT NULL DEFAULT 1,
  published_version integer,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ace_workflow_versions (
  workflow_id text NOT NULL REFERENCES ace_workflows(id) ON DELETE CASCADE,
  workspace_id text NOT NULL,
  version integer NOT NULL,
  definition jsonb NOT NULL,
  definition_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','retired')),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  PRIMARY KEY (workflow_id, version)
);

CREATE TABLE IF NOT EXISTS ace_workflow_executions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  workflow_id text NOT NULL,
  workflow_version integer NOT NULL,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','waiting','completed','failed','cancelled','compensating')),
  current_node_id text,
  trigger_type text NOT NULL,
  trigger_ref text,
  correlation_id text,
  causation_id text,
  started_by text,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts integer NOT NULL DEFAULT 0,
  deadline_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS ace_workflow_approvals (
  id text PRIMARY KEY,
  workspace_id text NOT NULL,
  execution_id text NOT NULL REFERENCES ace_workflow_executions(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  requested_by text,
  approver_scope text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired')),
  decided_by text,
  decision_comment text,
  policy_version text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE INDEX IF NOT EXISTS ace_workflow_exec_workspace_idx ON ace_workflow_executions(workspace_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS ace_workflow_approval_workspace_idx ON ace_workflow_approvals(workspace_id,status,requested_at DESC);

ALTER TABLE ace_policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_policy_rules FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_policy_rules_workspace_policy ON ace_policy_rules;
CREATE POLICY ace_policy_rules_workspace_policy ON ace_policy_rules USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
) WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_policy_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_policy_rule_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_policy_rule_versions_workspace_policy ON ace_policy_rule_versions;
CREATE POLICY ace_policy_rule_versions_workspace_policy ON ace_policy_rule_versions USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
) WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_policy_rule_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_policy_rule_decisions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_policy_rule_decisions_workspace_policy ON ace_policy_rule_decisions;
CREATE POLICY ace_policy_rule_decisions_workspace_policy ON ace_policy_rule_decisions USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
) WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_workflows_workspace_policy ON ace_workflows;
CREATE POLICY ace_workflows_workspace_policy ON ace_workflows USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
) WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_workflow_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_workflow_versions_workspace_policy ON ace_workflow_versions;
CREATE POLICY ace_workflow_versions_workspace_policy ON ace_workflow_versions USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
) WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_workflow_executions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_workflow_executions_workspace_policy ON ace_workflow_executions;
CREATE POLICY ace_workflow_executions_workspace_policy ON ace_workflow_executions USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
) WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
);

ALTER TABLE ace_workflow_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ace_workflow_approvals FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ace_workflow_approvals_workspace_policy ON ace_workflow_approvals;
CREATE POLICY ace_workflow_approvals_workspace_policy ON ace_workflow_approvals USING (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
) WITH CHECK (
  workspace_id = NULLIF(current_setting('app.workspace_id', true),'') OR current_setting('app.system_worker', true)='true'
);
