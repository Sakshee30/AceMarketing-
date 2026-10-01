# Audit backend module

Owns tenant-scoped durable audit search and export admission.

Canonical operations:
- `search-audit`
- `export-audit`

Search delegates to the existing locked audit store with bounded pagination. Export is accepted as a durable idempotent background job; the worker reads only the tenant's durable audit records and stores the result on the job record.
