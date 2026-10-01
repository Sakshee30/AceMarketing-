# Workspaces backend module

Owns tenant-scoped workspace lifecycle and workspace configuration application commands.

The canonical `update-workspace` command preserves the existing settings API contract, filters unsupported fields, keeps audit evidence and delegates persistence through the existing store compatibility boundary. Existing customer behavior is retained during incremental migration.
