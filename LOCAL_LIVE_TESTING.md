# Local application with a continuous data feed

The application runs without Docker. The feed generates realistic **synthetic** customer activity and sends actual HTTP requests to the existing APIs. Customer IDs, click IDs, campaign names, timestamps, stages, consent, product values, and interaction records remain linked across a journey. This exercises backend validation, persistence, attribution, automation, audiences, reporting, and the ML queue. It does not insert invented successful provider responses into the database.

## Python data feed and feature-wise test

For three initial calendar months followed by daily replay of a full year and continuous live activity, see [the daily year-feed guide](YEAR_DATA_FEED.md). Start the complete stack with `npm run dev:live -- --year-feed --customers-per-day=4`. The year feed has its own checkpoint and a live dashboard linking inputs to the corresponding application panels.

`scripts/live/ace_feed.py` (Python 3.9+, standard library only) is the continuous feed. The launcher starts it when a native interpreter is available: `ACE_FEED_PYTHON` in `.env.live.local`, or `PYTHON_BIN` in native mode. With `ACE_LIVE_WSL=true` and no `ACE_FEED_PYTHON`, the launcher falls back to the original `generator.mjs` feed, because WSL's Python cannot reach the Windows-hosted API.

It runs until stopped and never exhausts: every cycle creates a new synthetic customer with a realistic name, city, device, campaign, product and price, and moves customers already in flight through consent, visits, enquiry, qualification, calls, WhatsApp, consultation, purchase or abandonment. Lead-quality mix is about 30% low quality, 30% nurture, 22% strong fit and 18% high intent; the backend still computes every grade. It also works the follow-up queue the way a sales team would, so the open queue does not grow forever. Contacts use reserved `example.com` addresses and fictional `+1555` numbers.

| Command | Purpose |
|---|---|
| `npm run dev:live` | Application plus the continuous feed. Dashboard: http://127.0.0.1:5174, feature report: http://127.0.0.1:5174/report |
| `npm run live:verify:features` | Full test of the running stack: one complete journey per grade, every feature's write and read APIs, refusal checks, local ML, a browser visit to every page, and a merged report |
| `npm run live:verify:features -- --out=artifacts/testing-YYYYMMDD` | Same, keeping the report and screenshots in a dated folder |

The report (`feature-report.html` and `.json`) has one row per product feature with its backend checks and its browser result. **Blocked** marks a capability that needs a real third-party test account; it is never reported as passing. Replace the feed with real integrations by starting the launcher with `--no-feed`; nothing in the application depends on the feed.

### AI Intelligence in the local stack

The feed takes the local models through the governed lifecycle on the real APIs: it declares an evaluation policy per task, creates a point-in-time dataset, trains from that dataset, qualifies the resulting evaluation against the policy, then approves and deploys the model. Six routes become active this way (lead qualification, paid conversion, churn, future customer value, forecast challenger, offer ranking). A model that misses its thresholds is reported as failed, not deployed.

- `AI_LOCAL_ML_CAPABILITY_VERIFIED=true` in `.env.live.local` permits deployment of local models. It defaults to `false`; set it only after `GET /api/ai/ml/capabilities` confirms the estimators run on that machine.
- Chronos-2 forecasting needs `pip install "chronos-forecasting==2.3.2"` (CPU PyTorch is sufficient), a provisioned snapshot directory in `CHRONOS2_SNAPSHOT_DIR`, and its pinned revision in `CHRONOS2_REVISION`. Incrementality needs `pip install "econml>=0.16,<1"`. Pin the installed core packages with a constraints file so these installs cannot change them.
- Marketing mix (`google-meridian 2.1.0`) requires numpy below 2.4 and is not installed alongside the core stack; run it as a separate service via `ML_MMM_SERVICE_URL`.
- **Grounded analyst** can run on an OpenAI-compatible NVIDIA endpoint: set `AI_ANALYST_PROVIDER=nvidia`, `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `AI_LIVE_PROVIDER_CALLS=true` and `AI_PROVIDER_TESTS_ENABLED=true` in `.env.live.local`. On start the feed verifies model access, runs a five-case grounding evaluation (`POST /api/ai/evaluations/run`), qualifies it against a predeclared gate, then approves and deploys the route. Each question sends the workspace evidence snapshot (aggregates, about 350 KB) to that provider and takes roughly one minute. The feed asks one question about every fifteen minutes.
- The other hosted routes (reviewer, extraction, embeddings, reranking, transcription, live voice, creative image) need Anthropic, Google and Voyage API keys.

Use **http://127.0.0.1:5173**, not `localhost`, if another local project is running a dev server: a second Vite process can own the IPv6 `localhost:5173` listener and show a different application.

## 1. Open the running application

### First run on another machine (without Docker)

Clone this repository and check out `qa/prelive-qualification-20261003`. Install Node.js 22 or newer, Python 3.11-3.13, and native PostgreSQL. Start PostgreSQL and create a dedicated local role/database using psql or pgAdmin:

```sql
CREATE ROLE ace_live LOGIN PASSWORD 'choose-a-local-password';
CREATE DATABASE ace_live OWNER ace_live;
```

From the repository root, run in PowerShell:

```powershell
npm ci
Copy-Item .env.live.example .env.live.local
```

In `.env.live.local`, replace `CHANGE_ME` in `DATABASE_URL` with your local database password (URL-encode special characters), and set the correct database port. Set `PYTHON_BIN` to your Python 3.11-3.13 executable. Then run:

```powershell
npm run live:setup -- --native
npm run dev:live
```

On macOS/Linux use `cp .env.live.example .env.live.local` instead of `Copy-Item`, and typically `PYTHON_BIN=python3`. Native ML libraries may need the OS OpenMP runtime (libgomp on Linux or libomp on macOS). Setup creates `.venv-live`, installs the declared core ML dependencies, generates missing local secrets, and sets an artifact directory inside ignored `.tmp-tools`. The launcher applies database migrations, then runs frontend, API, worker, ML, and continuous inbound data. Leave the terminal open; Ctrl+C stops the stack. Keep ports 3001, 5173, 5174, and 8000 available.

This portable route does not need WSL, Docker, the `aceqa` user, or this PC's Python installation. The original `npm run live:setup` without `--native` remains the existing PC-specific WSL bootstrap. The WSL route has been exercised here; other operating systems still require their own first-run verification. After startup, run `node scripts/live/verify-grading.mjs` and `npm run live:verify` to validate your environment. Every machine generates its own records and secrets; existing database contents are not distributed.

The demo uses production ingestion/scoring handlers with local PostgreSQL and local ML. Synthetic inputs exercise those handlers; real third-party delivery is disabled and requires separate test-account integration verification. Known unimplemented workflows are listed below.

1. Open **http://localhost:5173**.
2. Sign in with **owner@example.com** and password **demo123**. These are local development credentials.
3. Open **http://localhost:5174** in a second tab. This shows continuously updated requests, payloads, responses, feature coverage, workflow checks, and ML job outcomes.
4. Keep the application in the foreground to observe refreshing data. Most workspace queries refresh every five seconds in development; pages with their own polling interval can take up to thirty seconds. Saving frontend files updates the UI through Vite. Saving backend source/module files restarts the API and worker. Python ML source changes reload the ML service. PostgreSQL retains business records across those restarts.

The services started for this session run in the background. Their logs are in `.tmp-tools/live/runtime.stdout.log` and `.tmp-tools/live/runtime.stderr.log`.

## 2. Restart or stop the full local test environment

Run these commands from the repository directory in PowerShell:

```powershell
npm run live:stop
npm run dev:live
```

`dev:live` launches the API, Vite, background worker, ML service, and continuous feed together. Leave that terminal open. **Ctrl+C** stops processes started by that launcher. `live:stop` also stops a background launch, after checking the recorded process identity. PostgreSQL and its test database remain available so data persists.

The initial setup is already complete on this machine. To repeat it:

```powershell
npm run live:setup
npm run dev:live
```

`live:setup` uses this machine's Ubuntu WSL installation, native PostgreSQL 18, and Python 3.13 runtime at `/opt/ace-qa-python-runtime`. It creates a separate `18/ace-live` PostgreSQL cluster on port **5435**, database **ace_live**, and a Python environment at `/home/aceqa/.venvs/ace-live`. It installs the ML service's declared core dependencies. It creates ignored `.env.live.local` with local secrets; it does not load `backend/.env` or change production settings. The launcher discovers the WSL address each time it starts. This bootstrap is specific to the native dependencies found on this PC.

On another machine, use the native first-run steps above. Both API and ML must use the same internal token. Migrations run before services start. Newly added SQL migrations require restarting the full launcher so `migrate` applies them; an API watcher restart alone does not apply native PostgreSQL migrations. Dependency changes require installing packages and restarting the launcher.

## 3. Follow one customer's complete workflow

The feed creates a customer roughly every three seconds, subject to processing time. Customers advance over several cycles. Intent ranges generate low-quality (D), nurture (C), strong-fit (B), and high-intent (A) journeys. D leads have shallow browsing and unanswered calls; C leads browse and engage through messaging without a qualified call; B leads have qualified sales context but no meeting or two-way messaging evidence; A leads progress through calls, messaging, meetings, and conversion. Only the high-intent group converts automatically. Others remain at their appropriate grade and receive follow-ups. Grades are computed by the real backend from these inputs, never assigned directly by the generator. Forced verification journeys use high intent to exercise purchases. Existing historical demo records keep their stored grades.

| Step | Actual input/API | Where to inspect the result |
|---|---|---|
| Consent | `POST /api/consent` with customer identity and explicit categories | Compliance, consent statistics |
| Acquisition | `POST /api/track`: page view with visitor/device/customer IDs, campaign, click IDs and event time | Live Sync, Data Hub, Fingerprinting, Behavior |
| Lead capture | `POST /api/track`: `lead`; `POST /api/enrich/upsert`; published form submission | Enrich, Lead Grading, Forms, Customer 360 |
| Automatic follow-up | Lead event matches a local `follow_up` activation rule | Real-time Activation, Follow-ups, audit log |
| Qualification | Explainable lead score, profile update, routing request | Lead Grading, Routing, Journeys |
| Calls and WhatsApp | HMAC-signed inbound call webhook and WhatsApp-format message webhook | Calls, CTWA/Offline Attribution, Customer 360 |
| Consultation | Persisted meeting with `syncCalendar:false`; personalization decision and impression | Meetings, Personalization, Journey timeline |
| Conversion | `purchase` event with actual product value; CRM assisted event matched to acquired identity | Events, Attribution, Funnel, Reports, Grouped Performance |
| Downstream operations | Audience materialization, converted-customer exclusions, POS import, feedback, cost data | Audiences, Exclusions, POS Stores, Feedback, Planner |
| Local AI | ML input → durable job → worker → Python computation → stored result/evaluation | Live feed jobs, Models, `/api/ai/results`, `/api/ai/evaluations` |

Use **Latest requests and responses** on port 5174 and search for a `customerId` starting with `live_`. Expand the request to copy its exact JSON. Find the same identity in Enrich, Journeys, Customer 360, and attribution. Follow the generated `eventId`, `leadProfileId`, `clickSessionId`, `jobId`, and result IDs to compare the stages. Synthetic click IDs have the local API's expected string shape but are not valid Google/Meta advertising clicks.

The feed also rotates through local scenarios for conversion-adjustment previews, diagnostics, reconciliation, matchback, offline attribution, custom-agent approval and sales routing, fraud-review records, leak recovery, model scoring, policies, form/custom-object records, deep links, report configuration, privacy exports, and grounded Ask Ace answers. Creating a fraud review checks review storage; it does not prove fraud detection. An adjustment preview does not send an adjustment to an ad provider. HTTP success is recorded separately from queued/completed background work.

## 4. Inspect exact request formats and errors

- **http://localhost:5174/samples**: latest generated request body for each exercised write API.
- **http://localhost:5174/status**: counters, coverage, checks, jobs, and AI prerequisites.
- `.tmp-tools/live/samples.json`: the same reusable JSON request examples.
- `.tmp-tools/live/requests.jsonl`: request/response history. It rotates at approximately 5 MB, retaining one previous file. Authorization headers, login passwords, and webhook signing secrets are omitted.
- `.tmp-tools/live/status.json`: current snapshot. Status and in-memory request/job history are bounded; business data in the test database continues to accumulate.

Counters and customer/job progress survive feed restarts. Brief API reload interruptions and earlier failed test attempts remain in the history; compare timestamps and current job IDs when assessing a new change. The application also contains development seed records. Use the `live_` customer IDs, synthetic markers, and recorded HTTP requests to distinguish this feed's actual processing from those baseline records.

For a manual public tracking request, grant consent first:

```powershell
$headers = @{ 'X-Workspace-ID' = 'ws_default' }
$consent = @{subjectType='customer'; subjectId='manual_customer_1'; analytics=$true; marketing=$true; personalization=$true; source='manual_local_test'} | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/api/consent -Method Post -Headers $headers -ContentType 'application/json' -Body $consent

$event = @{id=('manual_'+[guid]::NewGuid()); event='page_view'; eventCategory='analytics'; customerId='manual_customer_1'; visitorId='manual_visitor_1'; deviceId='manual_device_1'; source='google'; campaign='manual_search'; utm_source='google'; gclid='synthetic_manual_click'; occurredAt=[DateTime]::UtcNow.ToString('o'); currency='INR'; value=0; synthetic=$true} | ConvertTo-Json
Invoke-RestMethod http://localhost:3001/api/track -Method Post -Headers $headers -ContentType 'application/json' -Body $event
```

For authenticated operations, log in and reuse the returned bearer token:

```powershell
$login = @{email='owner@example.com'; password='demo123'} | ConvertTo-Json
$session = Invoke-RestMethod http://localhost:3001/api/auth/login -Method Post -Headers $headers -ContentType 'application/json' -Body $login
$headers.Authorization = 'Bearer '+$session.token
Invoke-RestMethod http://localhost:3001/api/enrich -Headers $headers
```

In browser developer tools, use the **Network** panel, filter `/api`, and inspect the request payload and response. A normal write can return 200, 201, or 202. **202 means accepted/queued**, so inspect the job until it reaches `succeeded`. A 400 identifies an input-contract problem, 401 a session/signature problem, 403 a permission/consent problem, 409 a prerequisite/conflict, 429 a policy/rate limit, and 503 an unavailable dependency. The dashboard shows failures instead of replacing them with successful-looking fixtures.

## 5. Check local AI processing

Nine core local task pipelines are exercised:

1. Lead qualification: calibrated CatBoost classification.
2. Paid conversion: separate calibrated classification.
3. Customer churn: separate calibrated classification.
4. Future customer value: CatBoost regression over a 90-day target.
5. Seasonal-naive forecast: explicitly labelled deterministic baseline.
6. CatBoost forecast challenger: fitted forecast/backtest.
7. Anomaly detection: Isolation Forest with an intentional unusual observation.
8. Behavioral segmentation: HDBSCAN.
9. Offer ranking: LightGBM ranking.

The feed submits training first, polls the real job state, captures the resulting artifact/hash, and subsequently scores new customer feature inputs. Forecasting/anomaly/segmentation/ranking requests run on the configured AI interval. Training datasets use historical prediction cutoffs and later observed labels, without feeding the target into the features. They are synthetic test datasets; their evaluation metrics do not establish performance on your real customers.

Inspect the job's `result`, `lifecycle.resultId`, and `lifecycle.evaluationId`. Completed training retains `evaluated_not_promoted`; the generator does not approve or deploy models automatically. ML prediction results are stored separately from the existing explainable lead-score field; they do not automatically replace that field or trigger paid-media activation. Ask Ace's local grounded baseline is also distinct from hosted LLM inference.

Chronos-2, causal incrementality, and Meridian marketing-mix modelling require the optional dependencies/checkpoints and appropriate datasets declared in `ml-service/pyproject.toml` and `contracts.py`. Chronos also requires a pinned `CHRONOS2_REVISION`. They appear as **blocked** when unavailable. Hosted AI, real ad/CRM delivery, outgoing WhatsApp/calls, SMTP delivery, calendar sync, Stripe payments, and object storage remain blocked until their test integrations are configured. This matches the requested local-ML-only mode.

The simulator reports two existing implementation gaps explicitly: boards can be created/read, but the backend has no public API to ingest new board cards; durable workflows can be published/started/cancelled, but the current worker does not advance their steps. The simulator exercises their available lifecycle APIs and does not claim that these workflows complete.

## 6. Verify after making changes

With `dev:live` running:

```powershell
npm run test:live-data
npm run check:frontend
npm run live:verify
```

`live:verify` performs two forced full customer journeys, all local write scenarios, 107 authenticated feature reads, real asynchronous ML training, and a second pass that scores new customers and offer candidates from those artifacts. It fails when a local scenario/check fails, an API request fails, or ML jobs do not finish. The verified run completed 496 requests and 18 ML jobs without errors. It writes an independent report to `.tmp-tools/live/verification/status.json`. It adds synthetic records to the same local test database; it does not reset your data. It can run while the continuous feed remains active; keep source files stable while verifying so a restart does not interrupt its requests.

After edits, check the feed for rising customer/event/purchase counters, passed workflow checks, successful feature reads, and terminal ML job outcomes. Compare actual records across the relevant pages, including deliberately abandoned customers and low-quality leads. Reference pages and unconfigured integration pages may remain unchanged; a successful read alone is not evidence of a data mutation or provider execution.

## 7. Adjust the rate

### Live grade distribution verification

Enrich and Lead Grading poll their authoritative APIs every five seconds in both development and production builds while visible. Editing, open modal dialogs, unsaved work, and active mutations pause refresh. The distribution covers the entire active workspace lead pool; the list shows only recent profiles. It includes older test records, not just the current generator run.

Partial lead updates preserve previously recorded journey and risk evidence before rescoring. Explicit zero/false values replace previous values. Native PostgreSQL serializes concurrent patches for the same workspace and lead identity. Both simulated and real inbound requests use this same backend behavior.

With the live stack running, execute:

```powershell
node --test backend/tests/lead-evidence.test.mjs
node scripts/live/verify-grading.mjs
```

The API verification adds one clearly labelled test lead, asserts D → C → B → A progression, verifies risk reduces its grade and can be cleared explicitly, confirms identity stability, exercises concurrent channel patches, and checks that the distribution adds up to the full active population. This verifies local ingestion, persistence, scoring, and reads; external provider delivery still needs separate integration testing.

Edit ignored `.env.live.local` and restart the launcher:

```dotenv
ACE_LIVE_INTERVAL_MS=3000
ACE_LIVE_AI_INTERVAL_MS=60000
ACE_LIVE_SEED=42
```

The seed repeats the random choices; each run still uses new customer/event IDs and current timestamps. A slower interval makes individual journeys easier to follow. This feed is sequential and intended for functional inspection, not a production load benchmark. To use the application without generated traffic, run `npm run dev:live -- --no-feed`. To resume a feed against those services, run `npm run live:generate` in another terminal. To use the original embedded-database development setup, stop the live stack and run `npm run dev`.
