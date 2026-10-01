# Identity backend module

Owns session creation and account-recovery application commands.

Canonical operations in this migration slice:
- `start-login`
- `recover-account`

The handlers preserve the existing active-membership checks, password verification, development-only fallback behavior, token TTL, session records, reset-token expiry, enumeration-safe recovery response, password hashing, session revocation and audit records. Provider-specific OAuth flows remain separate adapters.
