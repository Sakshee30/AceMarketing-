# Capabilities backend module

Owns governed runtime-configuration activation and provider migration commands.

Canonical operations:
- `activate-config`
- `migrate-provider`

The handlers preserve signed runtime snapshots, compatibility and capacity evidence, optimistic migration versions, canary/cutover rules, rollback restrictions, provider overrides and control-plane actor identity.
