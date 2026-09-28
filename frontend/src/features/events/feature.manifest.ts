export const eventsFeatureManifest={
  id:'events',
  routeId:'workspace.events',
  label:'Events',
  title:'Events · AceMarketing',
  breadcrumb:'Tracking & Data / Events',
  telemetryId:'workspace.events',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'confirm',
  releaseBoundary:'feature-chunk'
} as const
