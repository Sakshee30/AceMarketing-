import {api} from '../../../lib/api'

export type FunnelFilters={
  channel:string
  account:string
  disposition:string
  periodDays:number
}

export const funnelApi={
  load:(filters:FunnelFilters)=>api.funnel(filters)
}
