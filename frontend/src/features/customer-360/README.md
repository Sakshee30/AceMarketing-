# Customer 360 frontend feature

Owns the customer-facing canonical customer profile and stitched journey workspace.

The extraction preserves customer search and selection, stale-response protection, identity graph evidence, operational footprint, normalized attributes, audience membership and the unified activity timeline. Rendering is bounded for long-lived workspaces: the timeline remains capped and the directory renders at most 200 matching profiles while preserving the authoritative total. Refresh failures keep existing evidence visible instead of replacing it with fabricated or empty state.
