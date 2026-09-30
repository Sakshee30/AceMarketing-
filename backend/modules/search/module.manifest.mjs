import {platformModule} from '../../src/platform/module-registry.mjs'

export const searchModuleManifest=platformModule('search')
if(!searchModuleManifest)throw new Error('platform module registry entry missing: search')
export default searchModuleManifest
