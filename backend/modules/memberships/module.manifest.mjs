import {platformModule} from '../../src/platform/module-registry.mjs'

export const membershipsModuleManifest=platformModule('memberships')
if(!membershipsModuleManifest)throw new Error('platform module registry entry missing: memberships')
export default membershipsModuleManifest
