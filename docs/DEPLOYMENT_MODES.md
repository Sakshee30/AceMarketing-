# Deployment Modes

AceMarketing supports one codebase across three operational footprints. The application does not require Redis or Kafka for the core runtime; PostgreSQL remains the durable baseline.

## Core

Use when you want the smallest production-capable stack.

Services:
- PostgreSQL
- API
- general worker
- main web application

Defaults off:
- control plane
- AI and specialist ML
- billing
- file/object-storage workflows
- voice/agent transports
- WhatsApp and call tracking
- Google login/calendar

Provider read synchronization remains available unless `ACE_ENABLE_PROVIDER_READS=false`.

Docker:

```bash
npm run stack:core
```

Without Docker:

```bash
npm run start:core
```

The non-Docker path requires PostgreSQL reachable through `DATABASE_URL`.

## Standard

Adds common SaaS operational features. Optional provider credentials are still external secrets.

```bash
npm run stack:standard
# or
npm run start:standard
```

Standard enables the control plane, billing, WhatsApp, call tracking, and Google auth/calendar defaults. Individual capabilities can still be disabled with `ACE_ENABLE_*=false`.

## Full

Enables the complete service topology, including AI and specialist ML profiles.

```bash
npm run stack:full
# or
npm run start:full
```

For a non-Docker full deployment, install the Python environment first:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -e "ml-service[test,forecasting,causal,mmm,objectstore]"
```

Set `PYTHON_BIN` when the interpreter is not `python3`.

## Overrides

Every preset can be reduced or expanded without source changes:

```env
ACE_ENABLE_CONTROL_PLANE=false
ACE_ENABLE_AI=false
ACE_ENABLE_AI_FORECASTING=false
ACE_ENABLE_AI_CAUSAL=false
ACE_ENABLE_AI_MMM=false
ACE_ENABLE_BILLING=false
ACE_ENABLE_FILES=false
ACE_ENABLE_AGENT_TRANSPORTS=false
ACE_ENABLE_WHATSAPP=false
ACE_ENABLE_CALL_TRACKING=false
ACE_ENABLE_GOOGLE_AUTH=false
ACE_ENABLE_PROVIDER_READS=true
```

The runtime admission layer and capability registry honor these settings; they are not only startup hints.

## DevOps downgrade examples

Full → core:

```bash
ACE_DEPLOYMENT_MODE=core npm run stack -- up --mode=core
```

Disable AI only:

```env
ACE_DEPLOYMENT_MODE=full
ACE_ENABLE_AI=false
ACE_ENABLE_AI_FORECASTING=false
ACE_ENABLE_AI_CAUSAL=false
ACE_ENABLE_AI_MMM=false
```

Run app processes on a VM but keep managed PostgreSQL:

```bash
DATABASE_URL=postgresql://... npm run start:core
```

Use external ML instead of starting local Python:

```env
ACE_DEPLOYMENT_MODE=full
ACE_EXTERNAL_ML=true
ML_SERVICE_URL=https://ml.internal.example
```

## Invariants

The following remain mandatory in every production mode:
- PostgreSQL durable state
- tenant isolation
- audit/security controls
- durable jobs for accepted asynchronous work
- migrations
- strong application secrets
- CORS configuration
- backup/restore capability

A smaller mode turns optional product capabilities off; it does not weaken security or durability.
