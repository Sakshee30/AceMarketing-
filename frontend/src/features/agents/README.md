# Agents frontend feature

Owns built-in and custom agent operations inside the authenticated customer workspace.

The extraction preserves the existing agent catalog, prerequisites, custom-agent builder, approval handoff, test execution, trigger inspection and recent-run evidence. Reads preserve previously loaded data when refreshes fail. Custom-agent creation and agent tests distinguish confirmed success from timeout/network outcomes whose final state is unknown. Builder and test drafts use the shared accessible dialog and participate in dirty-work protection.
