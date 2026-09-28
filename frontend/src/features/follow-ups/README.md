# Follow-ups frontend feature

Owns the persisted follow-up queue, manual next-action creation, completion, journey context and lead-reactivation workflow.

The feature preserves the existing workflow while moving it behind a feature-owned lazy boundary. Queue and reactivation refresh failures keep already-loaded evidence visible. Create, complete and reactivate mutations distinguish confirmed backend outcomes from timeout/network ambiguity. The manual builder and journey context use the shared accessible dialog boundary, drafts participate in dirty-work protection, and rendered queue/candidate collections are bounded for long-running workspaces.
