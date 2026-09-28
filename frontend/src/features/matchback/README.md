# Matchback frontend feature

Owns closure matchback and revenue reconciliation.

The feature preserves existing matchback reads, rule creation, enable/pause, reconciliation, suggested templates, live identity coverage and unmatched-record review. It moves the workspace behind a feature-owned lazy boundary, uses accessible dialogs, protects in-progress rule drafts, preserves loaded evidence during transient failures, bounds unmatched rendering, and distinguishes confirmed success from timeout/network uncertainty for write operations.
