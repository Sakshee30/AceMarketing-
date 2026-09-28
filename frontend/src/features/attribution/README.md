# Attribution frontend feature

Owns the customer-facing full-path attribution workspace.

The feature preserves current period switching, channel/campaign/outcome/match-evidence views, customer-journey navigation and Matchback navigation while moving them behind a feature-owned lazy boundary. Attribution reads are sequence-guarded so slower previous period requests cannot overwrite newer evidence, transient failures preserve already-visible data, and browser rendering is bounded for large channel/campaign/outcome/match collections.
