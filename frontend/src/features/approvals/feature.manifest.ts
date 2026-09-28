export const approvalsFeatureManifest={
  id:'approvals',
  routeId:'workspace.approvals',
  label:'Approvals',
  title:'Approvals · AceMarketing',
  breadcrumb:'Lead & Conversion / Approvals',
  telemetryId:'workspace.approvals',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  releaseBoundary:'feature-chunk',
  requestBudget:{
    initialRequests:1,
    expectedPayload:'bounded human approval queue and decision metadata',
    backgroundRefreshSeconds:30,
    streamSubscriptions:0,
    maxReadRetries:2
  }
} as const
