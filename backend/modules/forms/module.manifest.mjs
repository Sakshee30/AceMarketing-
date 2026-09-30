import {platformModule} from '../../src/platform/module-registry.mjs'

export const formsModuleManifest=platformModule('forms')
if(!formsModuleManifest)throw new Error('platform module registry entry missing: forms')
export default formsModuleManifest
