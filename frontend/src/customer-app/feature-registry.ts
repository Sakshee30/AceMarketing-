import {
  assertWorkspaceFeatureManifest,
  workspaceFeatureByLabel,
  workspaceFeatureByRouteId,
  workspaceFeatureManifest,
  type WorkspaceFeatureManifest
} from '../features/workspace/manifest'

export type CustomerFeatureRegistry={
  all:readonly WorkspaceFeatureManifest[]
  byLabel:ReadonlyMap<string,WorkspaceFeatureManifest>
  byRouteId:ReadonlyMap<string,WorkspaceFeatureManifest>
  getByLabel:(label:string)=>WorkspaceFeatureManifest|null
  getByRouteId:(routeId:string)=>WorkspaceFeatureManifest|null
}

assertWorkspaceFeatureManifest()

export const customerFeatureRegistry:CustomerFeatureRegistry={
  all:workspaceFeatureManifest,
  byLabel:workspaceFeatureByLabel,
  byRouteId:workspaceFeatureByRouteId,
  getByLabel:(label)=>workspaceFeatureByLabel.get(label)||null,
  getByRouteId:(routeId)=>workspaceFeatureByRouteId.get(routeId)||null
}

export const isRegisteredCustomerFeature=(label:string)=>customerFeatureRegistry.byLabel.has(label)
