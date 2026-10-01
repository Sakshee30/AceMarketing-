# Usage backend module

Owns authoritative usage-event recording and quota reservation application commands.

Canonical operations:
- `record-usage`
- `reserve-quota`

The existing usage ledger and entitlement services remain persistence/compatibility adapters. Request identity, reservation identity, tenant scope, atomic quota admission, committed/released reservation state and reconciliation behavior are preserved.
