import {platformModule} from '../../src/platform/module-registry.mjs'

export const entitlementsModuleManifest=platformModule('entitlements')
if(!entitlementsModuleManifest)throw new Error('platform module registry entry missing: entitlements')
export default entitlementsModuleManifest
