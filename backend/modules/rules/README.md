# Rules backend module

Owns bounded policy/rule simulation and publication contracts. Rule expressions remain typed, bounded and non-executable.

Canonical operation:
- `simulate-rule`

Policy publication remains mapped to the existing policy engine until the write path is migrated with audit and recovery evidence.
