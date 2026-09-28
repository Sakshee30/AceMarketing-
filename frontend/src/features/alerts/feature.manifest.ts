export const alertsFeatureManifest={
  id:'alerts',
  routeId:'workspace.alerts',
  label:'Alerts',
  title:'Alerts · AceMarketing',
  breadcrumb:'Operations & Developer / Alerts',
  telemetryId:'workspace.alerts',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  releaseBoundary:'feature-chunk'
} as const
