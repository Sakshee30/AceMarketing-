CREATE TABLE IF NOT EXISTS ace_ai_knowledge_sources (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_location TEXT,
  content_hash TEXT NOT NULL,
  document_version TEXT NOT NULL,
  access_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_classification TEXT NOT NULL DEFAULT 'workspace_document',
  status TEXT NOT NULL DEFAULT 'pending_embedding',
  embedding_model TEXT,
  embedding_dimensions INTEGER,
  index_version TEXT,
  revoked_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,content_hash,document_version)
);

CREATE TABLE IF NOT EXISTS ace_ai_knowledge_chunks (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES ace_ai_knowledge_sources(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  section TEXT,
  source_offset JSONB NOT NULL DEFAULT '{}'::jsonb,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  access_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding JSONB,
  embedding_model TEXT,
  embedding_dimensions INTEGER,
  index_version TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id,source_id,ordinal)
);

CREATE INDEX IF NOT EXISTS ace_ai_knowledge_chunks_source_idx
  ON ace_ai_knowledge_chunks (workspace_id,source_id,ordinal);

CREATE INDEX IF NOT EXISTS ace_ai_knowledge_chunks_fts_idx
  ON ace_ai_knowledge_chunks
  USING gin (to_tsvector('english',content))
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS ace_ai_knowledge_sources_status_idx
  ON ace_ai_knowledge_sources (workspace_id,status,created_at DESC)
  WHERE deleted_at IS NULL;
