export const feedFeatureManifest={
  id:'feed',
  routeId:'workspace.feed',
  label:'Feed',
  title:'Feed & payload enhancement · AceMarketing',
  breadcrumb:'Activation / Feed',
  telemetryId:'workspace.feed',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.write',
  unsavedWork:'protect',
  releaseBoundary:'feature-chunk'
} as const
