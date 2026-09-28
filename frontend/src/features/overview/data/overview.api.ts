import {api} from '../../../lib/api'

export const overviewApi={
  summary:()=>api.dashboardSummary(),
  liveSync:()=>api.liveSync(),
  funnel:()=>api.funnel()
}
