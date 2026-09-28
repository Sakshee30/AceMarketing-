export const overviewFeatureManifest={
  id:'overview',
  routeId:'workspace.overview',
  label:'Overview',
  title:'Overview · AceMarketing',
  breadcrumb:'Workspace / Overview',
  telemetryId:'workspace.overview',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'allow',
  releaseBoundary:'feature-chunk',
  requestBudget:{
    initialRequests:3,
    expectedPayload:'bounded dashboard summary, recent workspace activity and funnel evidence',
    backgroundRefreshSeconds:30,
    streamSubscriptions:0,
    maxReadRetries:2
  }
} as const
