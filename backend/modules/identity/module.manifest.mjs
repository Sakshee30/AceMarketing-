import {platformModule} from '../../src/platform/module-registry.mjs'

export const identityModuleManifest=platformModule('identity')
if(!identityModuleManifest)throw new Error('platform module registry entry missing: identity')
export default identityModuleManifest
