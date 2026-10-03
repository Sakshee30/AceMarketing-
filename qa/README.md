# AceMarketing pre-live qualification implementation

This is executable supporting evidence, **not completion of all 356 source scenarios**.
Do not merge or deploy based solely on the workflow color. Main remains unchanged.

## Run
Use a dedicated non-root Linux QA agent with Node 24, Python 3, PostgreSQL server tools,
`ip`, `sudo`, `unshare`, `setpriv`, browser system libraries and scoped sudo permission
for the isolation launcher. Install locked npm dependencies and Playwright's Chromium,
Firefox and WebKit outside the test namespace. Then run:

```sh
npm ci
npx playwright install --with-deps chromium firefox webkit
bash qa/run-isolated.sh
```

The runner creates a fresh loopback-only network namespace, drops root, starts its own
PostgreSQL cluster, creates databases it owns, and does not inherit caller DB/provider
credentials. It does not contact live customers/providers, publish images, deploy, or
modify any existing external database. The whole temporary cluster is removed afterward.
Use qa/Jenkinsfile on a disposable trusted agent. No Jenkins run is claimed from
GitHub Actions evidence. Untrusted PR code must not receive credentials or this privileged
agent. Artifact retention and access should follow the team's reviewed policy.

## Data and roles
Compressed fixture inputs preserve the supplied source records. Core data supplies 8
workspaces. Four exact personas map to actual supported roles: owner, administrator→admin,
marketing_operator→operator, analyst. The other four persona roles have no approved
mapping and remain explicitly unmapped, never promoted for convenience. Provisioning
through store functions is test setup, not evidence of onboarding UI or suspended-tenant
behavior. Fresh passwords are generated per run and never committed. Golden metric
fixtures retain major INR units, distinct from bulk minor-unit fields. Clock windows
come from fixtures, not wall-clock last-30-days filters.

Full functional/scale fixtures may be generated with the original supplied
`scripts/generate_profiles.py` in the dummy-data package. Generation does not import them into the application.
Only actual executed data loads may be counted as application scale tests.

## Evidence contract
`artifacts/prelive/execution-summary.json` records candidate SHA, stages, failures and
unqualified areas. Native tests each get their own real PostgreSQL database under a
bootstrap role; many pre-existing tests inject mocks. They are NOT automatically
restricted-role integration or E2E evidence. The authenticated API lane separately
runs NODE_ENV=production, AUTH_REQUIRED=true and a non-superuser/non-BYPASSRLS role.
Browser tests use production-built assets and real login/API; no mocked app success
responses. Worker tests observe completed persisted work, not just a 202 response.

Reports are collected after failures. Failed type checking is not hidden by an
independent Vite bundle success. Backup/restore smoke covers the created cluster,
not fresh-host/object/key restoration or every deployment mode. Plan fixtures under
qa/fixtures/plan.json.gz retain all 356 source IDs and scenario names; original detailed cases remain in the supplied plan; test-name references identify
supporting checks, not blanket scenario completion. Native skips remain visible in JUnit.

Remaining required scope includes full fixture adapters/business journeys, all provider
native simulations/test-account qualification, actual model evaluation, all file lifecycles,
complete performance/soak/chaos and deployment/recovery matrices, manual accessibility,
human UAT, complete route/operation reconciliation and final sign-off. Runtime/test
failures remain blockers; never replace missing evidence with passing placeholder tests.
