# Enrich frontend feature

Owns the customer-facing CRM enrichment workspace.

The feature preserves current enriched lead search, lead selection, score evidence, journey/call/WhatsApp context, grade distribution, CRM writeback actions and persisted writeback evidence while moving them behind a feature-owned lazy boundary. Reads expose explicit loading/retry states and preserve visible evidence on transient failures. CRM writeback mutations distinguish confirmed success from timeout/network uncertainty, and browser rendering is bounded for large lead/writeback collections.
