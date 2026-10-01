# Webhooks backend module

Owns durable outbound webhook delivery and replay application commands.

Canonical operations:
- `deliver-webhook`
- `replay-delivery`

The existing delivery store and worker remain the durable adapters. Signing, destination validation, retry/dead-letter behavior, unknown-outcome handling and replay lineage are preserved.
