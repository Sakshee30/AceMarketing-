import {api} from '../../../lib/api'

export const posStoresApi={
  load:()=>api.posStores(),
  importBatch:(payload:Record<string,unknown>)=>api.importPosBatch(payload)
}
