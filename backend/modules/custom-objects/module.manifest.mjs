import {platformModule} from '../../src/platform/module-registry.mjs'

export const customObjectsModuleManifest=platformModule('custom-objects')
if(!customObjectsModuleManifest)throw new Error('platform module registry entry missing: custom-objects')
export default customObjectsModuleManifest
