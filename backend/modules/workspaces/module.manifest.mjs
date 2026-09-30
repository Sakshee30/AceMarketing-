import {platformModule} from '../../src/platform/module-registry.mjs'

export const workspacesModuleManifest=platformModule('workspaces')
if(!workspacesModuleManifest)throw new Error('platform module registry entry missing: workspaces')
export default workspacesModuleManifest
