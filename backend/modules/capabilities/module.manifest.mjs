import {platformModule} from '../../src/platform/module-registry.mjs'

export const capabilitiesModuleManifest=platformModule('capabilities')
if(!capabilitiesModuleManifest)throw new Error('platform module registry entry missing: capabilities')
export default capabilitiesModuleManifest
