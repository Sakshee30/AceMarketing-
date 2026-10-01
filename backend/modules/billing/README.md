# Billing backend module

Owns subscription lifecycle changes and provider-event reconciliation application commands.

Canonical operations:
- `change-subscription`
- `reconcile-payment`

Existing entitlement validation, versioned entitlement history, Stripe signature verification, provider-event deduplication and reconciliation records remain intact behind compatibility adapters. Provider-specific transport details stay outside customer-facing business routes.
