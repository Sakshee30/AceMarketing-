import {platformModule} from '../../src/platform/module-registry.mjs'

export const schedulingModuleManifest=platformModule('scheduling')
if(!schedulingModuleManifest)throw new Error('platform module registry entry missing: scheduling')
export default schedulingModuleManifest
