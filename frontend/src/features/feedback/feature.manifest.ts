export const feedbackFeatureManifest={
  id:'feedback',
  routeId:'workspace.feedback',
  label:'Feedback',
  title:'Feedback agent · AceMarketing',
  breadcrumb:'Conversion / Feedback',
  telemetryId:'workspace.feedback',
  authRequired:true,
  workspaceRequired:true,
  permission:'workspace.write',
  unsavedWork:'protect',
  releaseBoundary:'feature-chunk'
} as const
