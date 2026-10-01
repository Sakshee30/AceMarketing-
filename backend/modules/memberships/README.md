# Memberships backend module

Owns membership lifecycle, invitation state and revocation freshness.

The canonical `remove-member` command maps to the existing deactivation behavior: the member becomes inactive, active sessions are revoked immediately, password hashes are never returned, and an audit entry is retained. Self-deactivation through this administrative command remains denied.
