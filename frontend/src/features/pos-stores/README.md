# POS & Stores frontend feature

Owns the customer-facing POS, walk-in and store-sale attribution workspace.

The feature preserves current location summaries, offline revenue, identity match coverage, CSV template download, transaction import and import-history behavior while moving them behind a feature-owned lazy boundary. The import dialog uses the shared accessible dialog and dirty-work protection. Import writes distinguish confirmed success from timeout/network uncertainty, CSV parsing validates required numeric/date fields, and recent import rendering is bounded for long-running workspaces.
