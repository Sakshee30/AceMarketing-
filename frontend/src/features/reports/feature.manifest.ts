export const reportsFeatureManifest={
  id:'reports',
  routeId:'workspace.reports',
  label:'Reports',
  title:'Reports · AceMarketing',
  breadcrumb:'Measurement & Intelligence / Reports',
  telemetryId:'workspace.reports',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  releaseBoundary:'feature-chunk'
} as const
