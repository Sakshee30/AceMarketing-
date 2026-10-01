# Authorization backend module

Owns permission evaluation contracts and authorization application queries. Existing route behavior remains compatible while authorization use cases move behind this module boundary.

Canonical operations:
- `evaluate-access` resolves the permission through the centralized policy and returns an explicit allow/deny decision.
- Policy publication remains mapped to the existing policy engine until its migration slice is completed.

Security enforcement is never disabled by feature configuration.
