# Evaluation and promotion policy

No universal accuracy percentage qualifies all tasks. Policies are tenant/task scoped and versioned before qualification.

## Classification
Precision, recall, PR-AUC, lift at capacity, log loss, Brier score and reliability/calibration evidence.

## Regression/value
MAE/RMSE or other declared target-appropriate errors, bias, baseline comparison and interval evaluation when intervals exist.

## Forecasting
Rolling-origin, horizon-specific error, seasonal-baseline comparison, quantile loss and measured coverage. Unknown observations are distinct from zero.

## Causal
Treatment overlap, estimand definition, nuisance/cross-fitting configuration, assumption records, uncertainty and experiment comparison where available. Failed prerequisites produce unsupported/insufficient-evidence.

## Retrieval/analyst/reviewer
Relevance, leakage, tool correctness, numerical consistency, source support, abstention and prompt-injection/adversarial cases.

## Promotion
1. Save versioned evaluation policy.
2. Produce evaluation evidence on versioned data.
3. Qualify explicitly.
4. Preserve baseline on failure.
5. Promote only qualified evidence with authorized actor.
6. Deploy separately.
7. Keep rollback predecessor.

Synthetic fixtures may test code but cannot qualify production models.
