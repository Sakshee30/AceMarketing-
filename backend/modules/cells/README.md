# Cells backend module

Owns tenant placement movement commands for the high-scale profile.

The canonical `move-tenant` command uses authoritative placement state, rejects stale routing epochs, increments the routing epoch for every move, and delegates durable placement persistence to the existing cell-placement adapter.
