# Approvals backend module

Owns approval decisions and separation-of-duties behavior for durable workflows.

The canonical `decide-approval` command validates the decision contract before delegating to the existing workflow store, which continues to enforce requester/approver separation and durable approval state.
