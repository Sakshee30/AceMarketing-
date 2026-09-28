import {api} from '../../../lib/api'

export const groupedPerformanceApi={
  load:(dimension:string,months=6)=>api.groupedPerformance(dimension,months),
  saveCost:(dimension:string,key:string,cost:number|null)=>api.saveGroupedPerformanceCost(dimension,key,cost)
}
