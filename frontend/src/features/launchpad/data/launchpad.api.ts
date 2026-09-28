import {api} from '../../../lib/api'

export const launchpadApi={
  load:(signal?:AbortSignal)=>api.launchpad({signal}),
  sendTest:(operationId:string,signal?:AbortSignal)=>api.track({
    event:'launchpad_test',
    source:'launchpad',
    visitorId:'launchpad_'+operationId
  },{signal,operationId})
}
