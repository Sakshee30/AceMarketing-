export const settingsFeatureManifest={
  id:'settings',
  routeId:'workspace.settings',
  label:'Settings',
  title:'Settings · AceMarketing',
  breadcrumb:'Operations & Developer / Settings',
  telemetryId:'workspace.settings',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  releaseBoundary:'feature-chunk'
} as const
