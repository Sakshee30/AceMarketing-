import {platformModule} from '../../src/platform/module-registry.mjs'

export const webhooksModuleManifest=platformModule('webhooks')
if(!webhooksModuleManifest)throw new Error('platform module registry entry missing: webhooks')
export default webhooksModuleManifest
