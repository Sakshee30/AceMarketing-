export const journeysFeatureManifest={
  id:'journeys',
  routeId:'workspace.journeys',
  label:'Journeys',
  title:'Journeys · AceMarketing',
  breadcrumb:'Measurement / Journeys',
  telemetryId:'workspace.journeys',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'allow',
  releaseBoundary:'feature-chunk'
} as const
