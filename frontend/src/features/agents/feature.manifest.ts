export const agentsFeatureManifest={
  id:'agents',
  routeId:'workspace.agents',
  label:'Agents',
  title:'Agent operations · AceMarketing',
  breadcrumb:'Automation / Agents',
  telemetryId:'workspace.agents',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.write',
  unsavedWork:'protect',
  releaseBoundary:'feature-chunk'
} as const
