import {platformModule} from '../../src/platform/module-registry.mjs'

export const workflowsModuleManifest=platformModule('workflows')
if(!workflowsModuleManifest)throw new Error('platform module registry entry missing: workflows')
export default workflowsModuleManifest
