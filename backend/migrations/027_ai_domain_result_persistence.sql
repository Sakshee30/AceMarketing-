-- Domain persistence for anomaly triage, versioned segments and ranking results.

CREATE TABLE IF NOT EXISTS ace_ai_anomaly_items (
  workspace_id TEXT NOT NULL,
  result_id TEXT NOT NULL REFERENCES ace_ai_results(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  anomaly BOOLEAN NOT NULL,
  score DOUBLE PRECISION NOT NULL,
  triage_status TEXT NOT NULL DEFAULT 'open'
    CHECK (triage_status IN ('open','investigating','suppressed','resolved','false_positive')),
  feedback TEXT,
  suppressed_until TIMESTAMPTZ,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,result_id,entity_id)
);

CREATE INDEX IF NOT EXISTS ace_ai_anomaly_triage_idx
  ON ace_ai_anomaly_items (workspace_id,triage_status,created_at DESC)
  WHERE anomaly=true;

CREATE TABLE IF NOT EXISTS ace_ai_segment_snapshots (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  result_id TEXT NOT NULL REFERENCES ace_ai_results(id) ON DELETE CASCADE,
  snapshot_version TEXT NOT NULL,
  cluster_count INTEGER NOT NULL DEFAULT 0,
  noise_count INTEGER NOT NULL DEFAULT 0,
  warning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,result_id)
);

CREATE TABLE IF NOT EXISTS ace_ai_segment_memberships (
  workspace_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL REFERENCES ace_ai_segment_snapshots(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  cluster_id INTEGER NOT NULL,
  noise BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,snapshot_id,entity_id)
);

CREATE INDEX IF NOT EXISTS ace_ai_segment_memberships_cluster_idx
  ON ace_ai_segment_memberships (workspace_id,snapshot_id,cluster_id);

CREATE TABLE IF NOT EXISTS ace_ai_ranking_items (
  workspace_id TEXT NOT NULL,
  result_id TEXT NOT NULL REFERENCES ace_ai_results(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  rank INTEGER NOT NULL CHECK (rank>=1),
  score DOUBLE PRECISION NOT NULL,
  eligible BOOLEAN NOT NULL DEFAULT true,
  prediction_cutoff TIMESTAMPTZ,
  artifact_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,result_id,group_id,candidate_id)
);

CREATE INDEX IF NOT EXISTS ace_ai_ranking_items_group_idx
  ON ace_ai_ranking_items (workspace_id,result_id,group_id,rank);
