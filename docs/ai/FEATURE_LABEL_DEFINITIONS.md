# Feature and label definitions

All historical training rows carry feature availability time, prediction cutoff and label observation time. A feature is rejected when it became available after the simulated prediction cutoff.

Classification targets are distinct artifacts:
- `lead_qualification`: explicit qualification outcome.
- `paid_conversion`: confirmed payment/conversion outcome.
- `customer_churn`: documented churn definition and horizon.

Future customer value is separate by horizon (`90d`, `180d`) and is not historical realized revenue.

Mature labels only are eligible for supervised fitting. Missing or not-yet-observed outcomes are censored, not silently labelled negative.

The current Python service uses chronological train/tune/calibration/final-test partitions. Calibration is fitted separately from model fitting/tuning. Existing heuristic scores remain heuristics and are never reinterpreted as probabilities.

Forecast observations distinguish missing/unknown from true zero. Seasonal-naive validates regular timestamps and is explicitly a baseline, not a causal estimate.
