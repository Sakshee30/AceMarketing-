-- Typed persisted forecast, causal and marketing-mix evidence.
CREATE TABLE IF NOT EXISTS ace_ai_forecast_records (
  workspace_id TEXT NOT NULL,
  result_id TEXT NOT NULL REFERENCES ace_ai_results(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  series_id TEXT,
  horizon INTEGER,
  frequency TEXT,
  model_revision TEXT,
  point_forecast JSONB,
  quantiles JSONB,
  intervals JSONB,
  metrics JSONB,
  baseline_comparison JSONB,
  interval_method TEXT,
  nominal_coverage NUMERIC,
  measured_coverage NUMERIC,
  data_cutoff TIMESTAMPTZ,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,result_id)
);
CREATE INDEX IF NOT EXISTS ace_ai_forecast_records_series_idx
  ON ace_ai_forecast_records (workspace_id,series_id,created_at DESC);

CREATE TABLE IF NOT EXISTS ace_ai_causal_records (
  workspace_id TEXT NOT NULL,
  result_id TEXT NOT NULL REFERENCES ace_ai_results(id) ON DELETE CASCADE,
  task TEXT NOT NULL,
  estimand TEXT,
  treatment_name TEXT,
  outcome_name TEXT,
  supported BOOLEAN NOT NULL DEFAULT false,
  estimate NUMERIC,
  interval JSONB,
  overlap JSONB,
  diagnostics JSONB,
  assumptions JSONB,
  sample_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,result_id)
);

CREATE TABLE IF NOT EXISTS ace_ai_marketing_mix_records (
  workspace_id TEXT NOT NULL,
  result_id TEXT NOT NULL REFERENCES ace_ai_results(id) ON DELETE CASCADE,
  task TEXT NOT NULL DEFAULT 'marketing_mix',
  supported BOOLEAN NOT NULL DEFAULT false,
  health_status TEXT,
  artifact_id TEXT,
  artifact_hash TEXT,
  media_channels JSONB,
  sampling JSONB,
  diagnostics JSONB,
  assumptions JSONB,
  scenario_status TEXT NOT NULL DEFAULT 'not_created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id,result_id)
);
CREATE INDEX IF NOT EXISTS ace_ai_marketing_mix_health_idx
  ON ace_ai_marketing_mix_records (workspace_id,supported,health_status,created_at DESC);
