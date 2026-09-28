# Calls frontend feature

Owns voice qualification runs, signed telephony evidence, retry operations and consultation handoff.

The feature preserves the current Calls workflow behind a feature-owned lazy boundary. Read failures preserve already-loaded run/event evidence. Qualification queueing, retry and consultation scheduling distinguish confirmed backend outcomes from timeout/network ambiguity. The qualification builder uses the shared accessible dialog and dirty-work protection, and customer-facing activity rendering is bounded for long-running workspaces.
