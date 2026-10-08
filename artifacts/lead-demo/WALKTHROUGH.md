# Leads feature walkthrough

This demo uses the supplied D2 source: 10,000 leads, 2,500 per workspace. The generator validates the original five source-file hashes. Leads enter through real authenticated HTTP and are independently reconciled against PostgreSQL. The API uses a restricted, non-superuser database role. This local demo runs outside the no-egress qualification namespace so Windows can reach it.

Open `http://localhost:4173/demo-leads.html`, choose a workspace and open Lead Grading. The locally generated launcher signs into a disposable dummy account through the actual authentication API. It exists only in the local demo build and contains dummy credentials; do not publish that build.

1. Check **Profiles scored**: 2,500 in the chosen workspace.
2. Browse **Next / Previous**: 100 leads per page, 25 pages. Search by name, source lead ID, stage or campaign. All records are reachable; the page does not load 10,000 rows at once.
3. Select a lead to inspect its source ID, campaign, stage, score and stored score drivers.
4. Choose a manual grade. The change is displayed after backend confirmation. Refresh to check persisted state.
5. Choose **Use grade in activation**. Grade A creates priority sales routing; B standard sales routing; C a nurture task; D a suppression review task. A created operation does not establish real provider delivery.

The supplied lead import contains CRM stages and identity fields, not rich behavioral evidence for every lead. Most initial grades are D under the current deterministic rules. This is expected from the available inputs, not an AI efficacy result. Raw source emails are hashed on ingestion; the UI exposes grading data rather than inventing absent contact fields.

On the configured WSL environment, run from `/home/aceqa/execution-20261003`:

```sh
python3 qa/demo-leads.py
```

This creates a fresh disposable database and new credentials on every run. Stop with Ctrl+C. It never targets a caller database. `python3 qa/verify-lead-demo.py` rebuilds the running demo and checks all supplied lead IDs and displayed names across Chromium, Firefox and WebKit. `python3 qa/verify-lead-access.py` checks the launcher, normal login and activation. Evidence and browser JUnit are in `artifacts/lead-demo/`. Demo browser checks use a separate configuration so they do not change the qualification runner's source-data expectations.

Before production, still qualify the full permission matrix, realistic concurrent data updates and load, real CRM/provider integration, operational recovery and human UAT. This walkthrough qualifies one feature and does not complete the full acceptance plan.
