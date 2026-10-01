# Documents backend module

Owns upload authorization, quarantine, scanning, approval, immutable download and document lifecycle contracts.

The canonical `authorize-upload` command preserves the existing upload-intent validation, workspace quota checks, quarantine state, access policy and durable-object-storage behavior.
