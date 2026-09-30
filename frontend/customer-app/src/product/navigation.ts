import {customerFeatureRegistry} from './feature-registry'

export const customerNavigation=customerFeatureRegistry.map(feature=>({
  id:feature.id,
  label:feature.label,
  group:feature.group,
  routeId:feature.routeId,
  hash:feature.canonicalHash,
  permission:feature.permission,
  unsavedWork:feature.unsavedWork
}))
