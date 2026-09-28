# Customer application composition

This directory owns the authenticated AceMarketing customer workspace composition.

It is intentionally separate from the public marketing composition. Business features remain feature-owned lazy chunks under `frontend/src/features/*`; this composition owns workspace navigation, workspace switching, section orchestration, global search, customer-app route recovery and the customer-facing error boundary.

Current migration status:
- customer workspace composition extracted from `AcePlatform.tsx`;
- existing feature routes and behavior preserved;
- public website remains in the legacy root composition for the next incremental migration;
- independent build/deployment output remains a frontend completion gate before backend restructuring begins.
