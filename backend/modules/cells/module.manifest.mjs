import {platformModule} from '../../src/platform/module-registry.mjs'

export const cellsModuleManifest=platformModule('cells')
if(!cellsModuleManifest)throw new Error('platform module registry entry missing: cells')
export default cellsModuleManifest
