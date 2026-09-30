# Realtime reconnect storm runbook

## Trigger
Use this runbook when reconnect rate, socket admission failures, authorization refresh failures, or per-instance connection pressure exceeds the approved realtime budget.

## Safety invariants
Tenant/workspace authorization remains authoritative. Never disable scope checks to recover capacity. Existing authenticated connections may continue only within their configured authorization/configuration lease. New connections can be throttled or rejected honestly. Reconnect pressure must not be shifted into unbounded database/session lookups.

## Response
1. Confirm the current release, configuration version, affected cell/region, connection count, reconnect rate, and authentication dependency health.
2. Enable bounded connection admission or backoff. Prefer jittered client reconnect guidance and server-side rate limits over immediate mass reconnect.
3. Protect the database and identity provider by limiting concurrent session revalidation. Preserve per-tenant admission budgets so one noisy tenant cannot consume the entire reconnect allowance.
4. If a cell is unhealthy, stop new admissions to that cell before considering any tenant movement. Do not route tenants to another cell without durable data availability and placement ownership.
5. Keep event delivery scoped and deduplicated. Drop replaceable presence/typing-style signals before durable business events.
6. Restore normal admission gradually and watch reconnect, authorization, socket memory, queue/backlog, database saturation, and customer error rates.

## Recovery evidence
Record incident start/end, peak connections, reconnect attempts/second, admitted/rejected counts, database/identity saturation, customer-visible impact, configuration changes, and time to stable recovery. A successful short reconnect test does not qualify the full concurrency target.
