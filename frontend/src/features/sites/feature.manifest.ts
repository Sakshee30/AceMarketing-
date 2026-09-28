export const sitesFeatureManifest={
  id:'sites',
  routeId:'workspace.sites',
  label:'Sites',
  title:'Sites · AceMarketing',
  breadcrumb:'Tracking & Data / Sites',
  telemetryId:'workspace.sites',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'confirm',
  releaseBoundary:'feature-chunk'
} as const
