import {api} from '../../../lib/api'

export const enrichApi={
  load:()=>api.enrich(),
  writeback:(lead:string,provider:string,fields:Record<string,unknown>)=>api.writebackEnrichment(lead,provider,fields)
}
