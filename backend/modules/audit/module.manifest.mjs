import {platformModule} from '../../src/platform/module-registry.mjs'

export const auditModuleManifest=platformModule('audit')
if(!auditModuleManifest)throw new Error('platform module registry entry missing: audit')
export default auditModuleManifest
