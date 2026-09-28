export const enrichFeatureManifest={
  id:'enrich',
  routeId:'workspace.enrich',
  label:'Enrich',
  title:'CRM Enrichment · AceMarketing',
  breadcrumb:'Conversion / Enrich',
  telemetryId:'workspace.enrich',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'allow',
  releaseBoundary:'feature-chunk'
} as const
