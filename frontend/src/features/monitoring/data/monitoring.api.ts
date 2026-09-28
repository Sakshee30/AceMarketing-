import {api} from '../../../lib/api'

export const monitoringApi={
  summary:()=>api.monitoring(),
  rules:()=>api.monitoringRules()
}
