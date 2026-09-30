CREATE TABLE IF NOT EXISTS ace_tenant_placements (
  workspace_id TEXT PRIMARY KEY,
  home_cell TEXT NOT NULL,
  home_region TEXT NOT NULL,
  routing_epoch BIGINT NOT NULL DEFAULT 1 CHECK (routing_epoch > 0),
  state TEXT NOT NULL DEFAULT 'active' CHECK (state IN ('active','moving','read_only','suspended')),
  dedicated BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ace_tenant_placements_cell_idx
  ON ace_tenant_placements (home_region,home_cell,state,updated_at DESC);
