import {platformModule} from '../../src/platform/module-registry.mjs'

export const jobsModuleManifest=platformModule('jobs')
if(!jobsModuleManifest)throw new Error('platform module registry entry missing: jobs')
export default jobsModuleManifest
