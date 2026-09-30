import {workspaceFeatureManifest} from '../../../../src/features/workspace/manifest'
import {validateRouteContract,type CustomerRouteContract} from './route-contract'

const baseRoutes:CustomerRouteContract[]=[
  {id:'auth.login',canonicalHash:'#/login',title:'Sign in · AceMarketing',breadcrumb:'Sign in',authentication:'public',workspace:'none',unsavedWork:'allow',telemetryId:'auth.login',errorBoundary:'application'},
  {id:'workspace.root',canonicalHash:'#/workspace',title:'Workspace · AceMarketing',breadcrumb:'Workspace',authentication:'required',workspace:'required',permission:'workspace.read',unsavedWork:'confirm',telemetryId:'workspace.root',errorBoundary:'workspace-section'}
]

export const customerRoutes:readonly CustomerRouteContract[]=[
  ...baseRoutes,
  ...workspaceFeatureManifest.map(feature=>({
    id:feature.routeId,
    canonicalHash:feature.canonicalHash,
    title:feature.title,
    breadcrumb:feature.breadcrumb,
    authentication:'required' as const,
    workspace:'required' as const,
    permission:feature.permission,
    unsavedWork:feature.unsavedWork,
    telemetryId:feature.telemetryId,
    errorBoundary:'workspace-section' as const
  }))
].map(validateRouteContract)

export const customerRouteById=new Map(customerRoutes.map(route=>[route.id,route]))
