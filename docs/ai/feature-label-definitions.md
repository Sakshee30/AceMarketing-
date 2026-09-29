# Feature and label definitions

## Point-in-time contract

Every supervised dataset row must preserve prediction cutoff and label availability. A feature is eligible only if it was available at the simulated prediction time.

Dataset schema versions:
- point-in-time dataset: `point-in-time.v1`
- feature definition: `features.v1`
- label definition: `labels.v1`

## Classification labels

- `lead_qualification`: future qualification outcome under the declared observation window.
- `paid_conversion`: future confirmed payment/conversion outcome; later non-purchase activity cannot erase historical conversion.
- `customer_churn`: horizon-specific churn definition supplied by the tenant policy.

Immature rows are censored rather than labelled negative.

## Value labels

`future_customer_value` uses horizon-specific future net revenue/value (for example 90d or 180d). Realized historical revenue remains separate. Refunds may produce signed values.

## Feature rules

- Hashed identifiers remain sensitive identifiers and are not automatically model features.
- Preprocessing is fitted only on permitted training partitions.
- Categorical/null/unit semantics are shared between training and serving.
- Future purchases, later qualification states and later transcripts are prohibited leakage.
