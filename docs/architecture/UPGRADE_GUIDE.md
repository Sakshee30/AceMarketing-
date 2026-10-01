# Foundation upgrade guide

Use this process for a reusable-foundation version change.

## Before the change

1. Identify affected modules, public contracts, generated clients, provider adapters and migrations.
2. Review compatibility against `config/foundation-compatibility.json`.
3. Update authored contracts before generated outputs.
4. For persistence changes, update the migration review and preserve rolling-deploy compatibility.
5. For trust-boundary changes, update the threat model.
6. Record any deprecation, its replacement and the supported migration period.

## Implementation

- Preserve one canonical implementation path.
- Add adapters or compatibility shims only when needed for a bounded migration period.
- Keep tenant isolation, authorization, audit and durable acceptance authoritative during the transition.
- Do not make provider or storage migration equivalent to silent data loss.
- Keep old browser tabs and retained release assets compatible for the documented release window.

## Verification

Run architecture checks, contract checks, backend foundation tests, frontend builds/release checks, migrations, smoke/security tests and the applicable recovery tests. A provider, schema or runtime upgrade that changes capacity characteristics requires representative requalification.

## Rollback and forward repair

Rollback is allowed only while the old application and schema remain compatible. After an irreversible data transition, use the documented forward-repair path instead of pretending rollback is safe. Preserve release artifact digests and configuration/migration versions in release evidence.
