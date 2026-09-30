# AceMarketing backend deployment profile

Status: implemented architecture profile; production qualification remains evidence-gated.

## Runtime boundaries

The staging reference profile composes separate tenant API, platform-control API, and background worker ECS/Fargate services. Tenant API traffic enters through a public ALB protected by AWS WAF. Platform-control traffic uses a separate internal ALB and separate task role. Workloads run in private application subnets; PostgreSQL runs in isolated data subnets.

## Durable dependencies

PostgreSQL is the authoritative transactional store. S3 is the durable object store. SQS plus dead-letter queue is the durable queue profile. Secrets Manager and KMS hold runtime secret containers and encryption policy. AWS Backup owns governed backup selection. CloudWatch log groups own service and audit log destinations.

## Network profile

The reference staging VPC spans three configured Availability Zones with public ingress, private application, and isolated data subnets. Application route tables can use one NAT gateway per Availability Zone and private VPC endpoints for S3, ECR, CloudWatch Logs, Secrets Manager, KMS, SQS and SSM-related services.

## Release profile

Backend and frontend container releases are immutable commit-addressed artifacts. Release workflow evidence records image digests plus SBOM/provenance metadata. Database migration version and runtime configuration version are tracked separately from the image digest.

## Capacity status

The architecture targets are not benchmark claims. CI smoke tests verify representative behavior only. The manual k6 qualification workflow is the controlled open-model load entry point; production capacity may be claimed only after a representative environment, dataset, tenant skew, quotas, failure exercises and actual p95/p99/error/saturation evidence are recorded.

## Recovery status

The repository contains declared recovery objectives and recovery-evidence persistence. Actual RPO/RTO remains unmeasured until an isolated restore/failover exercise is completed and recorded.
