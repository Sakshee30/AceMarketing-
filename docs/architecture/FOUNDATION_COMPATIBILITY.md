# Foundation compatibility and deprecation policy

AceMarketing consumes the reusable SaaS foundation as a versioned platform contract rather than copying private business modules into shared packages.

## Compatibility rules

- Foundation contracts are versioned and remain compatible within the declared support window.
- HTTP, event and generated-client contracts are changed through compatibility checks rather than direct consumer breakage.
- Database migrations use expand/contract or explicit forward-repair strategies during rolling releases.
- Optional providers remain behind capability contracts; provider substitution must preserve the documented application semantics.
- Frontend customer, public-site and platform-control release artifacts are independently built and budgeted.
- A breaking foundation change requires an upgrade guide, compatibility evidence and an explicit deprecation period.

## Deprecation window

The project policy is a minimum 90-day notice for ordinary breaking removals. Urgent security removals may use an emergency exception when continued compatibility would create unacceptable security risk; the exception still requires owner, evidence, migration guidance and release communication.

## Reference product

This repository is the reference product for the current foundation profile. "Reference product" means the repository exercises the shared contracts and CI gates; it is not a claim that environment-specific production qualification has passed.

## Evidence

The machine-readable policy is `config/foundation-compatibility.json`. CI validates the policy, required contract paths and upgrade/deprecation invariants through `scripts/reuse-governance-check.mjs` and `tests/architecture/reuse-governance.test.mjs`.
