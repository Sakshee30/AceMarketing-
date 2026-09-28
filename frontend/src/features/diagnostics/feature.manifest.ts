export const diagnosticsFeatureManifest={
  id:'diagnostics',
  routeId:'workspace.diagnostics',
  label:'Diagnostics',
  title:'Diagnostics · AceMarketing',
  breadcrumb:'Tracking & Data / Diagnostics',
  telemetryId:'workspace.diagnostics',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  releaseBoundary:'feature-chunk'
} as const
