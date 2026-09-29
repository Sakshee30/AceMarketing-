-- Atomic dispatch reservation for approved AI activation proposals.
-- The lease/fence authorizes a bounded provider dispatch window without keeping
-- a database transaction open across the external request.

ALTER TABLE ace_ai_activation_proposals
  ADD COLUMN IF NOT EXISTS execution_fence_token TEXT,
  ADD COLUMN IF NOT EXISTS execution_lease_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS ace_ai_activation_dispatch_lease_idx
  ON ace_ai_activation_proposals (workspace_id,task,execution_status,execution_lease_until)
  WHERE execution_status='running';
