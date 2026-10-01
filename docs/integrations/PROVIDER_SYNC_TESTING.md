# Provider Read Synchronization Testing

This document describes the provider-read runtime added for end-to-end integration testing.

## Runtime

Provider reads run as durable `connector_sync` jobs through the existing job queue and worker. Raw provider responses are stored separately from normalized facts.

Tables:

- `ace_connector_sync_schedules`
- `ace_connector_sync_runs`
- `ace_connector_checkpoints`
- `ace_connector_raw_records`
- `ace_campaign_daily`
- `ace_crm_records`

All tables are tenant scoped with PostgreSQL RLS.

## API

### Trigger a backfill

```http
POST /api/integrations/sync
Idempotency-Key: <unique-id>
Content-Type: application/json

{
  "connector": "Google Ads",
  "mode": "backfill",
  "start": "2026-01-01T00:00:00Z",
  "end": "2026-10-01T23:59:59Z"
}
```

Supported connector names:

- Google Ads
- Meta Ads
- GA4
- HubSpot
- Salesforce
- Zoho CRM
- TikTok Ads
- Pinterest
- Microsoft Ads / Bing Ads
- X

### Trigger an incremental read

```json
{"connector":"HubSpot","mode":"incremental"}
```

### Configure automatic incremental sync

```http
POST /api/integrations/sync-schedules
Content-Type: application/json

{
  "connector": "HubSpot",
  "enabled": true,
  "intervalMinutes": 60
}
```

The general worker polls due schedules and enqueues durable incremental jobs. Checkpoints overlap the prior watermark slightly to protect against late provider updates; canonical upserts and raw-record hashes keep replays idempotent.

### Inspect state

- `GET /api/integrations/sync-runs`
- `GET /api/integrations/sync-runs?connector=Google%20Ads`
- `GET /api/integrations/sync-schedules`
- `GET /api/integrations/data-summary`
- `GET /api/jobs/:jobId`

## Provider configuration

### Google Ads

Requires OAuth connection plus:

- `GOOGLE_ADS_DEVELOPER_TOKEN`
- `GOOGLE_ADS_CUSTOMER_ID`
- optional `GOOGLE_ADS_LOGIN_CUSTOMER_ID`
- `GOOGLE_ADS_API_VERSION`

Reads daily campaign metrics using Google Ads search-stream.

### Meta Ads

Requires the Meta Ads OAuth connection plus:

- `META_AD_ACCOUNT_ID`
- `META_GRAPH_VERSION`

Reads daily campaign insights with pagination.

### GA4

Requires the GA4 OAuth connection plus:

- `GA4_PROPERTY_ID`

Reads the Analytics Data API report with campaign/source dimensions and sessions/users/key-events/revenue metrics.

### HubSpot

OAuth scopes include contacts, companies, and deals read access. Incremental reads use CRM search timestamps and durable per-object checkpoints.

### Salesforce

Requires OAuth and a returned `instance_url`, or `SALESFORCE_INSTANCE_URL`. Reads Lead, Contact, Opportunity, and Campaign through SOQL and follows `nextRecordsUrl`.

### Zoho CRM

Requires OAuth. Reads Leads, Contacts, Deals, and Campaigns using the configured Zoho API domain and `If-Modified-Since`.

### TikTok Ads

Server-secret connector now accepts:

- `advertiser_id`
- `access_token`

or set `TIKTOK_ADVERTISER_ID`. Campaign reporting uses the v1.3 integrated reporting endpoint.

### Pinterest

Server-secret connector requires:

- `ad_account_id`
- `access_token`

Reads daily ad-account analytics.

### Microsoft Ads

The existing repository credential is a conversion/UET credential and is not sufficient by itself for Microsoft Reporting API report generation/download. For testing, configure:

- `MICROSOFT_ADS_ACCOUNT_ID`
- `MICROSOFT_ADS_REPORTING_URL`

The reporting URL must be a governed HTTPS JSON bridge that returns normalized campaign rows. This preserves the connector runtime contract while the native SOAP asynchronous report downloader is qualified separately.

### X Ads

The existing X conversion pixel token is distinct from a user-context Ads reporting credential. For testing, configure:

- `X_ADS_ACCOUNT_ID`
- `X_ADS_REPORTING_URL`

The endpoint must be a governed HTTPS reporting bridge returning normalized campaign rows.

## Normalized campaign row

Reporting bridges return an array, `data`, or `items` containing:

```json
{
  "campaign_id": "123",
  "campaign_name": "Brand Search",
  "date": "2026-10-01",
  "spend": 120.50,
  "impressions": 10000,
  "clicks": 500,
  "conversions": 30,
  "conversion_value": 4500,
  "currency": "USD"
}
```

## Intelligence

The Ask Ace `campaign_performance` tool now prefers canonical `ace_campaign_daily` facts when provider data has been synchronized. This means provider reads are usable by the intelligence layer without copying metrics into workspace JSON state.

## Production qualification rule

Do not mark a provider as production-tested solely because the connector code is present. A provider becomes production-qualified only after:

1. real credential verification,
2. bounded backfill,
3. second-run idempotency check,
4. incremental update verification,
5. provider-versus-Ace reconciliation,
6. retry/rate-limit test,
7. token refresh/expiry test where applicable,
8. tenant-isolation verification,
9. alerting/failure evidence,
10. successful staging smoke test.
