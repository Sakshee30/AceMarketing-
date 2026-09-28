# Feed frontend feature

Owns governed first-party payload attributes, destination mappings, schema guardrails and payload previews.

The feature preserves the existing Feed customer workflow while moving it behind a feature-owned lazy boundary. Reads expose explicit loading and retry states while preserving previously loaded evidence on transient failure. Attribute and mapping builders use the shared accessible dialog and participate in dirty-work protection. Write operations distinguish confirmed backend success from timeout/network outcomes whose final state is unknown, requiring an authoritative refresh before repeating the mutation.
