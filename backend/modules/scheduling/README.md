# Scheduling backend module

Owns due-schedule evaluation and durable dispatch orchestration.

The canonical `evaluate-due-schedule` command invokes the existing audience and report schedule evaluators with bounded batches. Existing claim/lease and next-run persistence remains in the scheduler adapters.
