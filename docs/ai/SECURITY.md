# AI security boundaries

Tenant scope is derived from authenticated workspace context. Dedicated permissions cover analysis and training; owner remains the only wildcard role.

Provider credentials stay server-side. Internal ML calls require `X-Internal-Token`. Provider and ML URLs are configuration-owned, not user supplied.

Input snapshots and results are tenant scoped. Prompts, transcripts, embeddings, features and artifacts are treated as sensitive.

Production fitted artifacts require encrypted object storage. Generated artifacts are SHA-256 recorded and hash-verified before loading. S3-compatible storage uses server-side encryption and can use a configured endpoint/region.

Cross-tenant training is not implemented. External activation remains in existing governed approval/adapter flows; reviewer output is not authorization.
