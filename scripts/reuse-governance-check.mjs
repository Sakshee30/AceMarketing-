import {validateFoundationReuseGovernance,foundationReuseSnapshot} from '../backend/src/platform/reuse-governance.mjs'

validateFoundationReuseGovernance()
const snapshot=foundationReuseSnapshot()
console.log('Foundation reuse governance verified for '+snapshot.foundationVersion+' across '+snapshot.supportedProfiles.length+' profile(s).')
