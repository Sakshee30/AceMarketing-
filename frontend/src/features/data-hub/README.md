# Data Hub frontend feature

Owns the customer-facing unified customer data hub.

The feature preserves current source registry, canonical data model, data quality controls, lineage, source freshness, recent source activity, canonical-view rebuild and Integrations navigation while moving them behind a feature-owned lazy boundary. Reads have explicit loading and retry behavior, existing evidence remains visible during transient refresh failures, recent activity rendering is bounded, and rebuild writes distinguish confirmed success from timeout/network uncertainty.
