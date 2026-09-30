import {platformModule} from '../../src/platform/module-registry.mjs'

export const approvalsModuleManifest=platformModule('approvals')
if(!approvalsModuleManifest)throw new Error('platform module registry entry missing: approvals')
export default approvalsModuleManifest
