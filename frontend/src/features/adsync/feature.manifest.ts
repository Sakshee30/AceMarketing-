export const adsyncFeatureManifest={
  id:'adsync',
  routeId:'workspace.adsync',
  label:'AdSync',
  title:'AdSync · AceMarketing',
  breadcrumb:'Tracking & Data / AdSync',
  telemetryId:'workspace.adsync',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'confirm',
  releaseBoundary:'feature-chunk'
} as const
