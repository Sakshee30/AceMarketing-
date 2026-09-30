import {platformModule} from '../../src/platform/module-registry.mjs'

export const documentsModuleManifest=platformModule('documents')
if(!documentsModuleManifest)throw new Error('platform module registry entry missing: documents')
export default documentsModuleManifest
