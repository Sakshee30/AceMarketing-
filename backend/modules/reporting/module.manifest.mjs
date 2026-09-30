import {platformModule} from '../../src/platform/module-registry.mjs'

export const reportingModuleManifest=platformModule('reporting')
if(!reportingModuleManifest)throw new Error('platform module registry entry missing: reporting')
export default reportingModuleManifest
