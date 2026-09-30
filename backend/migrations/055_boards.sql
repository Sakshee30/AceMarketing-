CREATE TABLE IF NOT EXISTS ace_boards (
  id text NOT NULL,
  workspace_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  policy_version bigint NOT NULL DEFAULT 1 CHECK (policy_version > 0),
  ordering_revision bigint NOT NULL DEFAULT 1 CHECK (ordering_revision > 0),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,id)
);

CREATE TABLE IF NOT EXISTS ace_board_columns (
  id text NOT NULL,
  workspace_id text NOT NULL,
  board_id text NOT NULL,
  state_key text NOT NULL,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  wip_limit integer CHECK (wip_limit IS NULL OR wip_limit > 0),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,board_id,id),
  UNIQUE (workspace_id,board_id,state_key),
  FOREIGN KEY (workspace_id,board_id) REFERENCES ace_boards(workspace_id,id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ace_board_items (
  workspace_id text NOT NULL,
  board_id text NOT NULL,
  item_id text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  column_id text NOT NULL,
  rank numeric(38,0) NOT NULL,
  item_version bigint NOT NULL DEFAULT 1 CHECK (item_version > 0),
  policy_version bigint NOT NULL DEFAULT 1 CHECK (policy_version > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,board_id,item_id),
  FOREIGN KEY (workspace_id,board_id) REFERENCES ace_boards(workspace_id,id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id,board_id,column_id) REFERENCES ace_board_columns(workspace_id,board_id,id)
);

CREATE INDEX IF NOT EXISTS ace_board_items_column_rank_idx
  ON ace_board_items (workspace_id,board_id,column_id,rank,item_id);

CREATE TABLE IF NOT EXISTS ace_board_operations (
  workspace_id text NOT NULL,
  board_id text NOT NULL,
  operation_id text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  result jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,board_id,operation_id),
  FOREIGN KEY (workspace_id,board_id) REFERENCES ace_boards(workspace_id,id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ace_board_operations_time_idx
  ON ace_board_operations (workspace_id,board_id,updated_at DESC);
