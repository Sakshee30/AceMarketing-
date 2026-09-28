export const monitoringFeatureManifest={
  id:'monitoring',
  routeId:'workspace.monitoring',
  label:'Monitoring',
  title:'Monitoring · AceMarketing',
  breadcrumb:'Operations & Developer / Monitoring',
  telemetryId:'workspace.monitoring',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  releaseBoundary:'feature-chunk'
} as const
