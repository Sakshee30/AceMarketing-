import {platformModule} from '../../src/platform/module-registry.mjs'

export const rulesModuleManifest=platformModule('rules')
if(!rulesModuleManifest)throw new Error('platform module registry entry missing: rules')
export default rulesModuleManifest
