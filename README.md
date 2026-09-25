# AceMarketing

A first-party marketing intelligence and activation platform implementation inspired by the workflow patterns documented in the EasyInsights brochure and public product site.

## Implemented foundation

- Responsive marketing website with first-party growth positioning
- Click → Signal → Lead → Revenue journey visualization
- AdSync product module
  - server-side signal activation UI
  - conversion pipelines
  - GCLID / FBCLID coverage
  - funnel stage mapping
  - real-time sync health
- Klarity product module
  - full-path attribution
  - channel contribution
  - stitched customer journey
- Enrich product module
  - CRM context
  - lead grading
  - enriched lead profile
- 11-agent catalogue
- Integrations workspace
- Audience activation and suppression
- Interactive SaaS dashboard with live-style sample data

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Build

```bash
npm run build
```

## Implementation direction

The next implementation passes should add real backend persistence, authentication/RBAC, connector OAuth, ingestion/event pipelines, identity stitching, attribution computation, agent execution, alerts/monitoring, audit logs, billing, and production deployment infrastructure.

> Brand note: the code uses the AceMarketing identity. Public/proprietary third-party trademarks, customer logos, screenshots and copyrighted assets are not bundled into this repository.
