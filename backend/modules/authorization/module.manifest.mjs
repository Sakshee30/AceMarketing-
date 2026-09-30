import {platformModule} from '../../src/platform/module-registry.mjs'

export const authorizationModuleManifest=platformModule('authorization')
if(!authorizationModuleManifest)throw new Error('platform module registry entry missing: authorization')
export default authorizationModuleManifest
