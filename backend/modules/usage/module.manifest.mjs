import {platformModule} from '../../src/platform/module-registry.mjs'

export const usageModuleManifest=platformModule('usage')
if(!usageModuleManifest)throw new Error('platform module registry entry missing: usage')
export default usageModuleManifest
