# Executed fixture mapping and remaining scope

Source checksums: `qa/fixtures/provenance.json`. The 100 sample leads retain their original source IDs, not generated replacements.

| Input | Application mapping | Boundary |
|---|---|---|
| D1 workspace_id | Workspace state / X-Workspace-ID | Eight real scoped snapshots; setup, not organization lifecycle E2E. |
| D1 users | Actual owner/admin/operator/analyst memberships | 16 source users, 18 memberships; two explicit secondary owner grants support original sample scopes. Fresh passwords per run. |
| Unmapped personas | No invented or escalated roles | Remaining role acceptance is incomplete. Operator approval tests use existing approvals.write permission; admin is not silently granted it. |
| D2 lead_id | POST /api/enrich/upsert externalLeadId | 100 actual upserts + 100 duplicate replays and independent database counts. |
| display_name / email | name / email | Name persisted; normalized email hash checked. |
| campaign_id / stage / updated_at | campaign / crmStage / lastActivity | Campaign reference string, not a native provider campaign import. |
| source provenance | attributes.fixtureVersion/sourceRecordId/sourceWorkspaceId | Preserved source identity; original workspace retained. |
| D2 scoring / consent | Separate tests, not imported labels | No predictive-quality claim. |
| D3 | calculateMetricSet unit contract | Major INR; not dashboard/export E2E. |
| D4 | Provider-neutral specifications not implemented as native simulators | No provider qualification. |
| D5 | Not loaded into file/object pipeline | Upload/scan/extraction/search/deletion acceptance remains open. |
| D6 | Existing ML unit/contract tests and deterministic client tests | No real model efficacy/full AI activation claim. |
| D7 | Not loaded | No million-event performance claim. |
| D8 | Selected subflows tested | Complete journeys and human UAT remain open. |

The 100 sample records are part of the original 10,000 leads, not additional entities.
Broad browser checks cover all declared workspace tabs and seven public routes in three engines; they are render smoke, not every control or accessibility/device acceptance. Third-party resources are aborted; real app/API responses are not mocked.

Recovery quiesces source writers, restores to a separate database on the same disposable cluster, compares all table content/counts and sequences, and starts a restored API for real login and lead reads. It is not separate-host/object/key recovery or measured RPO/RTO.

Every original source case stays visible in source-case-status.json. Partial checks never grant full-scenario acceptance. release-evidence-gate.json remains blocked until complete case evidence and separate required reviews exist.
