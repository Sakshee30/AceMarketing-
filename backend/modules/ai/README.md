# AI backend module

Owns governed AI inference admission and activation execution commands.

Canonical operations:
- `request-inference`
- `activate-model-result`

Existing provider admission, data-policy checks, immutable evidence snapshots, idempotency, budgets, reviewer/approval gates and durable activation execution remain behind the current AI runtime adapters.
