export const liveSyncFeatureManifest={
  id:'live-sync',
  routeId:'workspace.live-sync',
  label:'Live Sync',
  title:'Live Sync · AceMarketing',
  breadcrumb:'Tracking & Data / Live Sync',
  telemetryId:'workspace.live-sync',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'confirm',
  releaseBoundary:'feature-chunk'
} as const
