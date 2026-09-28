import {api} from '../../../lib/api'

export const fingerprintingApi={
  load:()=>api.fingerprinting(),
  matches:()=>api.fingerprintMatches(),
  test:(scenario:string)=>api.testFingerprint(scenario)
}
