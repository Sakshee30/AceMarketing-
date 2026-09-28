import {api} from '../../../lib/api'

export const liveSyncApi={
  load:()=>api.liveSync(),
  saveAlert:(payload:Record<string,unknown>)=>api.saveMonitoringRule(payload)
}
