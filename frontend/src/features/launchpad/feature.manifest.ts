export const launchpadFeatureManifest={
  id:'launchpad',
  routeId:'workspace.launchpad',
  label:'Launchpad',
  title:'Launchpad · AceMarketing',
  breadcrumb:'Workspace / Launchpad',
  telemetryId:'workspace.launchpad',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'confirm',
  releaseBoundary:'feature-chunk'
} as const
