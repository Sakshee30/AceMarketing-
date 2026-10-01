# Integrations backend module

Owns provider connection and reconciliation application commands.

Canonical operations in this migration slice:
- `connect-provider`
- `reconcile-sync`

The existing custom integration implementation remains the compatibility adapter, preserving credential-vault usage, SSRF-safe destination validation, bounded request timeouts and current API behavior.
