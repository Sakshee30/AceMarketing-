# Live Sync frontend feature

Owns the customer-facing 24×7 event-transfer workspace.

The feature preserves current live-sync metrics, recent activity, destination throughput, alert creation and navigation while moving them behind a feature-owned lazy boundary. Polling is visibility-aware and bounded, alert creation uses the shared accessible dialog and dirty-work protection, transient refresh failures preserve already-visible evidence, and timeout/network loss during alert creation is treated as an unknown outcome until authoritative state is refreshed.
