# Identity frontend feature

Owns the customer-facing identity-resolution workspace.

The feature preserves current identity metrics, profile graph, deterministic match rules, review-queue export and Fingerprinting navigation while moving them behind a feature-owned lazy boundary. Reads have explicit loading/error states, existing identity evidence remains visible during transient failures, recent resolved-identity rendering is bounded for long-lived workspaces, and CSV object URLs are released immediately after export.
