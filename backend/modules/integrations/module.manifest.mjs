import {platformModule} from '../../src/platform/module-registry.mjs'

export const integrationsModuleManifest=platformModule('integrations')
if(!integrationsModuleManifest)throw new Error('platform module registry entry missing: integrations')
export default integrationsModuleManifest
