# Jenkins real-world qualification

This branch adds a Jenkins release-qualification pipeline for AceMarketing. It reuses the repository's existing unit, architecture, security, Playwright, AI and ML checks and adds deterministic synthetic marketing data plus production-like orchestration.

## Jenkins agent requirements

- Linux agent
- Node.js 20+
- npm
- Python 3.11-3.13 with venv support
- Docker Engine + Docker Compose v2 for Docker acceptance
- Chrome dependencies can be installed by Playwright
- Optional: k6 for the load stage
- Jenkins plugins: Pipeline, JUnit, Workspace Cleanup, AnsiColor

## Default release gate

The default Jenkins run performs toolchain preflight, npm clean install, deterministic dummy-data generation and consistency tests, backend contracts/architecture/type checks, all frontend builds and budgets, dependency security audit, backend foundation tests, AI backend tests, operational-registry tests, ML pytest qualification, Chromium desktop/mobile Playwright E2E, and a Docker production-like smoke test.

The Docker acceptance stage uses only synthetic CI credentials and starts PostgreSQL, migration, preflight, API, worker and web services. It waits for the health endpoint, runs the repository smoke suite, captures Compose state/logs, then removes the stack and volumes.

## Dummy data coverage

`scripts/ci/generate-real-world-fixtures.mjs` creates a deterministic 30-day dataset under `test-data/generated/` covering:

- Google Ads-style search and Performance Max campaigns
- Meta prospecting and retargeting campaigns
- spend, impressions, clicks, conversions and revenue
- GA4-like sessions, engagement, users, purchases and revenue
- lead lifecycle from lead to qualified to customer
- cross-channel attribution
- call events including campaign/keyword/creative/ad group and gclid
- WhatsApp-style inbound/outbound delivery states
- multiple geographic markets and workspaces

All identities are synthetic. Email addresses use `example.test`; phone values are artificial QA values.

## Optional qualification

Enable `RUN_LOAD` to execute `tests/load/core-traffic.js` through k6. Set Jenkins environment variables `TARGET_RPS` and `TEST_DURATION` to tune the workload.

Enable `RUN_SOAK` for the long Playwright session suite.

Choose `DEPLOYMENT_MODE=core|standard|full` to exercise the desired runtime profile.

## Evidence

Every build archives generated QA data, Playwright failure evidence, Docker Compose resolution/state/logs, ML JUnit, Playwright JUnit, doctor output, provider version output and the tested Git SHA.

## Release rule

A release candidate should not be finalized when any mandatory Jenkins stage fails. External provider production verification (Google Ads, Meta Ads, GA4, WhatsApp, email, billing, etc.) should remain a separate staging checklist using provider-owned test/sandbox accounts; synthetic CI must never use real customer credentials or PII.
