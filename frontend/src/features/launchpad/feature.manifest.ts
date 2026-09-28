export const launchpadFeatureManifest={
  id:'launchpad',
  routeId:'workspace.launchpad',
  label:'Launchpad',
  title:'Launchpad · AceMarketing',
  breadcrumb:'Workspace / Launchpad',
  telemetryId:'workspace.launchpad',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  unsavedWork:'confirm',
  releaseBoundary:'feature-chunk',
  requestBudget:{
    initialRequests:1,
    expectedPayload:'bounded launchpad readiness evidence',
    backgroundRefreshSeconds:0,
    streamSubscriptions:0,
    maxReadRetries:2
  }
} as const
