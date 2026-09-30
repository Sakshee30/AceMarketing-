import {platformModule} from '../../src/platform/module-registry.mjs'

export const billingModuleManifest=platformModule('billing')
if(!billingModuleManifest)throw new Error('platform module registry entry missing: billing')
export default billingModuleManifest
