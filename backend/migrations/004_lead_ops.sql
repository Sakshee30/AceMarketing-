CREATE TABLE IF NOT EXISTS ace_lead_profiles (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  external_lead_id TEXT NOT NULL,
  name TEXT,
  email_sha256 TEXT,
  phone_sha256 TEXT,
  source TEXT,
  campaign TEXT,
  crm_stage TEXT,
  intent TEXT,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  grade TEXT NOT NULL DEFAULT 'D' CHECK (grade IN ('A','B','C','D')),
  score_version TEXT NOT NULL DEFAULT 'v2.0',
  score_drivers JSONB NOT NULL DEFAULT '[]'::jsonb,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  journey JSONB NOT NULL DEFAULT '{}'::jsonb,
  call_summary TEXT,
  whatsapp_summary TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,external_lead_id)
);

CREATE INDEX IF NOT EXISTS ace_lead_profiles_workspace_grade_idx
  ON ace_lead_profiles (workspace_id,grade,score DESC);
CREATE INDEX IF NOT EXISTS ace_lead_profiles_workspace_stage_idx
  ON ace_lead_profiles (workspace_id,crm_stage);
CREATE INDEX IF NOT EXISTS ace_lead_profiles_email_idx
  ON ace_lead_profiles (workspace_id,email_sha256) WHERE email_sha256 IS NOT NULL;
CREATE INDEX IF NOT EXISTS ace_lead_profiles_phone_idx
  ON ace_lead_profiles (workspace_id,phone_sha256) WHERE phone_sha256 IS NOT NULL;

CREATE TABLE IF NOT EXISTS ace_audiences (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mode TEXT NOT NULL,
  destination TEXT NOT NULL,
  definition JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'materialized'
    CHECK (status IN ('draft','materialized','ready_for_sync','syncing','active','paused','error')),
  estimated_size INTEGER NOT NULL DEFAULT 0,
  matched_size INTEGER NOT NULL DEFAULT 0,
  last_materialized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_audiences_workspace_idx
  ON ace_audiences (workspace_id,updated_at DESC);

CREATE TABLE IF NOT EXISTS ace_audience_members (
  audience_id TEXT NOT NULL REFERENCES ace_audiences(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  lead_profile_id TEXT NOT NULL REFERENCES ace_lead_profiles(id) ON DELETE CASCADE,
  identity_key TEXT NOT NULL,
  action TEXT NOT NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (audience_id,identity_key)
);

CREATE INDEX IF NOT EXISTS ace_audience_members_workspace_idx
  ON ace_audience_members (workspace_id,audience_id);
