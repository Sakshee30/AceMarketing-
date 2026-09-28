export const callsFeatureManifest={
  id:'calls',
  routeId:'workspace.calls',
  label:'Calls',
  title:'Voice qualification & call tracking · AceMarketing',
  breadcrumb:'Conversion / Calls',
  telemetryId:'workspace.calls',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.write',
  unsavedWork:'protect',
  releaseBoundary:'feature-chunk'
} as const
