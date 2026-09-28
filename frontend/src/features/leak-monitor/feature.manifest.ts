export const leakMonitorFeatureManifest={
  id:'leak-monitor',
  routeId:'workspace.leak-monitor',
  label:'Leak Monitor',
  title:'Leak Monitor · AceMarketing',
  breadcrumb:'Tracking & Data / Leak Monitor',
  telemetryId:'workspace.leak-monitor',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'confirm',
  releaseBoundary:'feature-chunk'
} as const
