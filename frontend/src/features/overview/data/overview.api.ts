import {api} from '../../../lib/api'

export const overviewApi={
  summary:(signal?:AbortSignal)=>api.dashboardSummary({signal}),
  liveSync:(signal?:AbortSignal)=>api.liveSync({signal}),
  funnel:(signal?:AbortSignal)=>api.funnel(undefined,{signal})
}
