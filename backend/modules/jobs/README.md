# Jobs backend module

Owns durable job admission through a canonical application command.

The `submit-job` handler preserves the existing PostgreSQL-backed job state, idempotency key, deadlines, retries, AI usage reservations and outbox intent. Existing queue leasing, fencing and worker completion remain infrastructure/runtime adapters.
