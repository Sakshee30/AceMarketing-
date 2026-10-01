# Workflows backend module

Owns versioned workflow definitions and durable execution lifecycle.

Canonical operations in this migration slice:
- `publish-workflow`
- `retry-step` / workflow execution retry

The existing workflow store remains the persistence compatibility adapter. Validation, durable state, retry semantics and existing routes are preserved.
