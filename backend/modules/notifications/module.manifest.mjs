import {platformModule} from '../../src/platform/module-registry.mjs'

export const notificationsModuleManifest=platformModule('notifications')
if(!notificationsModuleManifest)throw new Error('platform module registry entry missing: notifications')
export default notificationsModuleManifest
