# Continuous daily application data

The Python runner is `scripts/live/year_feed.py` (Python 3.9+, no additional packages). It submits synthetic customers through the actual local application APIs. The application, persistent PostgreSQL, worker and ML service must be running. It never inserts fabricated successful provider results.

## Start the whole application

After the existing `npm run live:setup` setup, run:

```powershell
npm run dev:live -- --year-feed --customers-per-day=4
```

This starts the frontend, API, worker, ML service and Python daily feed. Set `ACE_FEED_PYTHON` in `.env.live.local` to a native Python executable. Do not run two generators on port 5174. Stop an existing live stack with `npm run live:stop` before starting this command.

If the application is already running without a feed, start just Python:

```powershell
npm run live:year -- --customers-per-day=4
```

Or invoke Python directly:

```powershell
python scripts/live/year_feed.py --customers-per-day=4
```

Leave the process running. Ctrl+C stops it; starting the same command resumes its calendar checkpoint. Stopping the generator does not remove generated business records.

## Calendar behavior

The default start is one calendar year before the first run, using Asia/Kolkata business days. First the runner generates **three calendar months**, one day at a time. It then replays the remaining days toward today and continues producing current-day journeys every five seconds plus processing time. At midnight it rolls to the next actual business day. It continues beyond the first year while running.

For an initial run on 8 October 2026, the seed is 8 October 2025 through 7 January 2026. Replay starts on 8 January 2026 and catches up through 7 October 2026. Live activity uses 8 October 2026 and rolls forward each midnight. Backfill takes real processing time; watch its progress rather than assuming that the initial history appears instantly.

To start with just the preceding three months instead, use a new checkpoint directory:

```powershell
npm run live:year -- --start-date=2026-07-08 --output=.tmp-tools/three-month-feed
```

To slow annual replay to at least five seconds per day after the initial seed:

```powershell
npm run live:year -- --day-seconds=5
```

`--customers-per-day` controls the historical baseline (minimum 4, default 8). Four initial customers per day cover low-quality, nurture, strong-fit and high-intent journeys. Higher volumes vary with weekends and seasonality. Live generation remains continuous and is controlled by `--interval` in seconds. No events are dated into the future to simulate a year; this keeps normal report windows meaningful.

## Inspect input and output live

- Application: **http://127.0.0.1:5173/#/workspace**
- Daily dashboard: **http://127.0.0.1:5174**
- Calendar progress: **http://127.0.0.1:5174/calendar**
- Exact API requests and responses: expand entries on the dashboard; latest inputs are also at `/samples`.
- Feature evidence and prerequisites: dashboard feature table and `/report`.

The dashboard includes links to each output panel. Copy its latest customer ID into Enrich or use Customer 360 to inspect the same identity. In **Reports**, select **Past year + current month** in Report period; **Grouped Performance** has the same period selector. Both default to this 13-bucket window so the starting partial month of a rolling year is included. During backfill, older records appear in their historical acquisition cohorts; live requests remain visible by actual receipt time. The frontend refreshes visible pages automatically; editing a form or opening a dialog pauses background refresh to protect the draft.

| Input | Real processing and output |
|---|---|
| Consent + visits + lead form | Compliance, identity, click sessions, Live Sync, Enrich, Behavior, Data Hub and Customer 360 |
| Qualification and grade evidence | Backend-computed Lead Grading, routing and automatic follow-ups |
| Signed synthetic call and WhatsApp webhooks | Calls, offline/click-to-chat attribution and stitched journeys |
| Consultation and personalization feedback | Meetings, decision records and impressions |
| Purchase and assisted CRM milestone | Event transformation, identity matching, attribution, funnel and cohort revenue |
| Operational scenarios | Audiences, exclusions, POS, planner costs, custom agents, approvals, diagnostics, reconciliation, fraud reviews, reports, governance and audit |
| ML and analyst requests | Actual durable jobs, worker processing and stored model outputs/evaluations when dependencies are available |

Historical journeys exercise business event time. Operational configuration, audit, security, schedules and job receipts retain their real processing time. Configuration pages are exercised using their supported write APIs, not by inventing daily rows for settings. After the first historical day, scenarios rotate after each historical day and continuously in live mode. A complete operational write/read sweep repeats every five minutes (at the next cycle boundary), including new approval proposals and a customer input-to-output check. Use `--feature-interval=60` to repeat the complete sweep every minute. Every feature’s read API is checked at startup and during processing.

The dashboard shows successful write checks and read checks for each feature, complete sweep count, completed ML jobs, and the latest verified customer output. These are observed API checks, not invented counts of provider deliveries. Customer, event and purchase counters are restored before retrying a journaled journey so confirmed operations do not inflate them on restart. Keep `--live-cycles=0` (the default) for an unlimited run.

External ad/CRM delivery, calendar integration, mail, billing, object storage and hosted AI depend on configured test providers. Unsupported operations and missing prerequisites are explicitly reported as blocked. A successful read does not establish that a write or provider dispatch completed. Actual failures remain in the report and request log.

## Resume and evidence

`.tmp-tools/year-feed/calendar.json` records completed dates and the current customer slot. `journey.json` journals confirmed calls for an interrupted journey. Stable identities, timestamps and idempotency headers let retries skip confirmed writes. Operations without server-side idempotency cannot promise exactly-once delivery after an ambiguous network failure; their actual HTTP failures remain visible.

The directory also contains `status.json`, redacted `requests.jsonl`, `samples.json` and `feature-report.html`. Request history rotates at approximately 5 MB. These checkpoints require the same persistent application database; if you replace the database, choose a new output directory so old acknowledgements are not reused.

Tests:

```powershell
npm run test:year-feed
```

To independently verify that the running generator keeps producing customers and events across another complete feature sweep:

```powershell
npm run live:verify:continuity -- --seconds=420
```

This records measured counter changes, per-feature activity, the new persisted customer output, failures and blocked prerequisites in `artifacts/year-feed/continuity.json`. It exits early when all continuity checks pass. Use `npm run live:verify:features` for the full API, negative-input, ML and browser test across every panel.

For a bounded smoke run against a stack that has no other feed:

```powershell
npm run live:year -- --start-date=2026-10-07 --customers-per-day=4 --live-cycles=1 --output=.tmp-tools/year-smoke
```
