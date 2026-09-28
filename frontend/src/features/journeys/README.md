# Journeys frontend feature

Owns the customer-facing stitched journey explorer.

The feature preserves current source/stage filtering, search, lead selection, journey metadata and stitched chronology while moving them behind a feature-owned lazy boundary. Reads have explicit loading/error states, previously loaded evidence remains visible during transient failures, request sequencing prevents stale refreshes from replacing newer data, and timeline rendering is bounded for long-lived journeys.
