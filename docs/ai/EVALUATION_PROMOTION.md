# Evaluation and promotion policy

Implementation does not imply qualification.

Classification evidence includes precision, recall, PR-AUC, log loss and Brier score. Future-value regression reports MAE, RMSE and bias. Forecast candidates must be compared against seasonal naive using rolling-origin evaluation and horizon-specific criteria. Ranking evaluation is group-aware and exposure-aware.

Promotion thresholds must be declared for the tenant/task before final evaluation. The final test period stays untouched during fitting, tuning and calibration. Synthetic fixtures may test code but cannot qualify a production model.

Required progression is: untrained -> evaluating -> shadow -> approved -> active. Failed candidates preserve the existing deterministic baseline.

Drift/freshness issues may trigger evaluation or retraining but cannot automatically promote a replacement.
