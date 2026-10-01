# Organizations backend module

Owns organization-profile mutation commands.

The canonical `update-organization` command deliberately narrows the current workspace-settings compatibility path to the organization field, preserving the existing persistence and audit behavior while establishing explicit ownership.
