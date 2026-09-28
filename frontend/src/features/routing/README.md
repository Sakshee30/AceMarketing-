# Routing frontend feature

Owns customer-facing lead-routing rules, routing tests, destination load evidence and recent routing decisions.

The feature preserves existing routing functionality while moving it behind a feature-owned lazy boundary. Reads preserve previously loaded routing evidence when refreshes fail. Rule creation, rule enable/pause and routing tests distinguish confirmed backend outcomes from timeout/network ambiguity. The builder uses the shared accessible dialog and participates in dirty-work protection.
