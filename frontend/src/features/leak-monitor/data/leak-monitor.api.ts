import {api} from '../../../lib/api'

export const leakMonitorApi={
  load:()=>api.leakMonitor(),
  recover:(payload:Record<string,unknown>)=>api.recoverLeak(payload),
  saveSettings:(payload:Record<string,unknown>)=>api.saveLeakMonitorSettings(payload)
}
