# Behavior frontend feature

Owns the customer-facing first-party behavior analysis workspace.

The feature preserves current event/source/campaign/device analysis, signal selection, related-activity evidence and latest first-party sequence while moving them behind a feature-owned lazy boundary. Reads expose explicit loading/retry states and preserve visible evidence during transient failures. Browser rendering is bounded for large signal and activity collections, and refresh interaction is disabled while data is loading.
