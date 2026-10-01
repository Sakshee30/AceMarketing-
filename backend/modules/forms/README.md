# Forms backend module

Owns versioned form definitions, publication and bounded submissions. Persistence remains in the existing tenant-aware forms store through compatibility adapters while application handlers are migrated incrementally.

Canonical operations:
- `publish-form`
- `submit-form`

Both handlers preserve existing API behavior and tenant scope. Submission idempotency keys continue to flow to the durable store.
