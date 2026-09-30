import {platformModule} from '../../src/platform/module-registry.mjs'

export const organizationsModuleManifest=platformModule('organizations')
if(!organizationsModuleManifest)throw new Error('platform module registry entry missing: organizations')
export default organizationsModuleManifest
