# AceMarketing feature-level Excel QA uploads

This branch adds **one shared Upload Test Excel panel** to every supported workspace feature page. The implementation does not replace existing Data Hub, connector, POS, or operational import behaviour.

## User flow
1. Open a feature page (for example, Overview, Attribution, or Leads / Lead Grading).
2. Click **Upload Test Excel**.
3. Select the corresponding file from the `AceMarketing_54_Feature_Excels_Labeled.zip` bundle (for example `45_overview.xlsx` for Overview).
4. The backend validates and reads the second worksheet, saves the synthetic records to `qaFeatureFixtures[feature]` in the current workspace state, and logs the upload to the workspace audit.
5. The panel displays the backend-confirmed row count and a five-row sample. Click **Refresh QA data** to reload it from the backend.

## Safety boundary

QA data is stored **separately** from customers, leads, campaigns, orders, tracking events, real integrations, dashboards, and provider sync state. Uploads do **not** modify those operational records or prove that the underlying feature has been tested end-to-end. They are specifically a staging/read-back capability.

The route requires an authenticated active workspace membership and owner/admin/operator role for writes; requests remain scoped to the authenticated workspace. XLSX payloads are restricted to 2 MB, 80 columns, 1,000 rows, and the feature-corresponding filename. No external network calls are performed during upload.

## Endpoints
- `GET /api/qa-fixtures/:feature` returns the fixture for that workspace, or null.
- `POST /api/qa-fixtures/:feature` accepts `{ filename, base64 }` and returns saved records and `operationalDataChanged:false`.

## Not yet delivered
- Feature-specific production schema mapping and validation.
- Applying fixtures to each feature's operational read model or calculations.
- Automated backend/frontend E2E coverage, browser tests, and live deployment.
- Bulk rollback / test workspace expiration.

Do not treat the existence of a saved fixture as evidence of production feature correctness.
