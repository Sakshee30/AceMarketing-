export const integrationsFeatureManifest={
  id:'integrations',
  routeId:'workspace.integrations',
  label:'Integrations',
  title:'Integrations · AceMarketing',
  breadcrumb:'Activation & Integrations / Integrations',
  telemetryId:'workspace.integrations',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.read',
  releaseBoundary:'feature-chunk',
  requestBudget:{
    initialRequests:3,
    expectedPayload:'connector catalog, workspace custom connectors and recent WhatsApp activity',
    backgroundRefreshSeconds:0,
    streamSubscriptions:0,
    maxReadRetries:2
  }
} as const
