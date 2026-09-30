import {platformModule} from '../../src/platform/module-registry.mjs'

export const boardsModuleManifest=platformModule('boards')
if(!boardsModuleManifest)throw new Error('platform module registry entry missing: boards')
export default boardsModuleManifest
