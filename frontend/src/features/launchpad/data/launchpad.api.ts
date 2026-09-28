import {api} from '../../../lib/api'

export const launchpadApi={
  load:()=>api.launchpad(),
  sendTest:()=>api.track({
    event:'launchpad_test',
    source:'launchpad',
    visitorId:'launchpad_'+Date.now()
  })
}
