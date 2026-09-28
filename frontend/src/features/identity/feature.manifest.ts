export const identityFeatureManifest={
  id:'identity',
  routeId:'workspace.identity',
  label:'Identity',
  title:'Identity · AceMarketing',
  breadcrumb:'Data / Identity',
  telemetryId:'workspace.identity',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'allow',
  releaseBoundary:'feature-chunk'
} as const
