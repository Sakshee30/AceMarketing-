export const followUpsFeatureManifest={
  id:'follow-ups',
  routeId:'workspace.follow-ups',
  label:'Follow-ups',
  title:'Follow-up operations · AceMarketing',
  breadcrumb:'Conversion / Follow-ups',
  telemetryId:'workspace.follow-ups',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.write',
  unsavedWork:'protect',
  releaseBoundary:'feature-chunk'
} as const
