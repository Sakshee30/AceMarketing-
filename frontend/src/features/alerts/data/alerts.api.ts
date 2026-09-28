import {api} from '../../../lib/api'

export const alertsApi={
  list:()=>api.alerts(),
  resolve:(alertId:string)=>api.resolveAlert(alertId)
}
