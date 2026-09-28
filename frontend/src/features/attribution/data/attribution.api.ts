import {api} from '../../../lib/api'

export const attributionApi={
  load:(periodDays:number)=>api.attributionIdentityStats(periodDays)
}
