import {platformModule} from '../../src/platform/module-registry.mjs'

export const aiModuleManifest=platformModule('ai')
if(!aiModuleManifest)throw new Error('platform module registry entry missing: ai')
export default aiModuleManifest
