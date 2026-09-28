import {api} from '../../../lib/api'

export const sitesApi={
  load:()=>api.sites(),
  create:(payload:Record<string,unknown>)=>api.createSite(payload),
  test:(domain:string)=>api.testSite(domain),
  debug:(domain:string)=>api.siteDebug(domain)
}
