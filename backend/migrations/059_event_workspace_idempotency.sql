ALTER TABLE ace_events DROP CONSTRAINT IF EXISTS ace_events_pkey;
ALTER TABLE ace_events ADD CONSTRAINT ace_events_pkey PRIMARY KEY (workspace_id,id);
