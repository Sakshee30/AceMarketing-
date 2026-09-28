export const overviewFeatureManifest={
  id:'overview',
  routeId:'workspace.overview',
  label:'Overview',
  title:'Overview · AceMarketing',
  breadcrumb:'Workspace / Overview',
  telemetryId:'workspace.overview',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'allow',
  releaseBoundary:'feature-chunk'
} as const
