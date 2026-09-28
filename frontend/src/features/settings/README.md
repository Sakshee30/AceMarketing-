# Settings frontend feature

Settings owns tenant-scoped workspace configuration, member/role management, tracking defaults, governance/privacy operations, API-key creation, approval boundaries, notifications and billing/usage presentation.

The extraction preserves all existing endpoints, CSS classes, section names and the existing direct workspace route. Unsaved workspace edits remain protected by the shared dirty-work registry. Network/timeout ambiguity on settings saves and API-key creation is surfaced as an unknown authoritative outcome instead of a false confirmed failure.
