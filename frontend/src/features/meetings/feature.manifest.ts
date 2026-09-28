export const meetingsFeatureManifest={
  id:'meetings',
  routeId:'workspace.meetings',
  label:'Meetings',
  title:'Scheduler & meeting reminders · AceMarketing',
  breadcrumb:'Conversion / Meetings',
  telemetryId:'workspace.meetings',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.write',
  unsavedWork:'protect',
  releaseBoundary:'feature-chunk'
} as const
