# AceMarketing backend deployment profile

Status: implemented executable baseline plus separately qualified scale-out targets. Production qualification remains evidence-gated.

## Runtime boundaries

AceMarketing can run as a compact `core` deployment or expand into `standard` / `full` modes without changing application code. The executable baseline is PostgreSQL + API + durable worker + web. Platform control and AI specialist services are optional profiles.

The AWS/Terraform reference architecture may place tenant API, platform-control and worker services on ECS/Fargate behind separate ingress/trust boundaries, but that infrastructure shape is not required for a single-host deployment.

## Durable dependencies

PostgreSQL is the authoritative transactional store **and the current durable job authority**. Accepted asynchronous work is persisted in PostgreSQL with leasing, retries, idempotency and dead-letter state.

Redis is an optional non-authoritative cache contract and is not required for correctness.

S3-compatible durable object storage is required only when file/object workflows are enabled.

The repository contains an SQS profile contract, but the current `sqs/job-queue` adapter still persists durable intent and leasing in PostgreSQL; it must not be represented as a native SQS publisher/consumer until that transport is implemented and qualified.

## Search / analytics scale-out

The executable baseline uses PostgreSQL-limited search and PostgreSQL-backed canonical marketing facts. High-scale external search/OLAP systems are optional qualification targets, not hidden production requirements. See `config/profiles/production-high-scale.yaml`.

## Release profile

Backend/frontend/ML container releases are immutable commit-addressed artifacts. Release evidence records image digests, SBOM/provenance metadata, runtime configuration version and database migration head.

Docker Compose accepts either local builds or immutable image pins. Docker-free operation uses the same migrations, preflight, API and worker code through `scripts/run-local.mjs`.

## Downgrade profile

Optional capabilities can be disabled through deployment-mode overrides without weakening tenant/security/durability controls. Application rollback consumes a prior release manifest and refuses a database schema newer than the target release unless forward-schema compatibility is explicitly acknowledged.

Database migrations remain forward-only by default.

## Capacity status

Architecture targets are not benchmark claims. The manual k6 qualification workflow is the controlled load entry point. Production capacity may be claimed only after representative environment/data/tenant skew, provider quotas, failure exercises and actual p95/p99/error/saturation evidence are recorded.

## Recovery status

The repository contains declared recovery objectives, backup/restore tooling and recovery-evidence persistence. Actual RPO/RTO remains unmeasured until an isolated restore/failover exercise is completed and recorded.
