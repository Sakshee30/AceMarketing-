# AI security

## Tenant and authorization boundary
All reads, datasets, jobs, artifacts, results, retrieval and model selection are tenant scoped. Backend permissions are rechecked at execution/side-effect boundaries.

## Secrets and network
Provider credentials remain server-side and are injected from environment/secret management. Provider URLs are fixed/allowlisted by adapters; browser callers cannot supply arbitrary provider endpoints.

## Prompt/retrieval safety
Uploaded/retrieved text is data, never instruction authority. Analyst tools are typed and read-only; no unrestricted SQL/Mongo, shell or arbitrary network access is exposed.

## Model/artifact safety
Only approved registry artifacts with expected provenance/hash may be loaded. Unsafe serialized/executable uploads are not accepted. Cross-tenant training is disabled unless explicitly governed.

## Activation
AI reviewer output is not authorization. High-risk activation requires deterministic policy, immutable proposal/evidence snapshot, authorized approver, expiry, current consent/limits and provider-specific idempotent execution.

## Privacy
Prompts, embeddings, transcripts, features and artifacts are sensitive. Revocation/deletion propagates to eligible derived retrieval state; historical model retraining obligations are tracked rather than claiming instantaneous unlearning.

## High-risk activation proposals
AI-originated recommendations that could affect spend, campaigns or audiences are stored as immutable proposal snapshots with evidence references, model/evaluation identity, deterministic policy result, hash and expiry. The proposal creator cannot approve the same proposal. Approval fails if the model/evaluation/artifact changed or the snapshot hash no longer matches. Approval does not itself call an advertising provider; provider-specific execution remains a separate adapter boundary that must recheck consent, limits and current authorization.
