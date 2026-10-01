# Entitlements backend module

Owns tenant subscription/entitlement evaluation contracts.

The canonical `evaluate-entitlement` query delegates to the existing subscription summary and usage ledger so current plan limits, reservation accounting, billing access policy and tenant scoping remain unchanged during migration.
