# Custom objects backend module

Owns versioned custom-object metadata and record contracts.

The canonical `define-object` command delegates to the existing tenant-aware store, preserving schema validation, field limits, versioning and current API behavior.
