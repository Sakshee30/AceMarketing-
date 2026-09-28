# Customer 360 frontend feature

Owns the customer-facing stitched customer record.

The feature preserves the current customer directory, search, identity graph, operational footprint, attributes, audience memberships, timeline and Journeys navigation while moving them behind a feature-owned lazy boundary. Reads are sequence-guarded so slower prior profile requests cannot overwrite a newer selection, loading/error states are explicit, and previously visible customer evidence is preserved during transient failures.
