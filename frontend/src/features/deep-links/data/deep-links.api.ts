import {api} from '../../../lib/api'

export const deepLinksApi={
  load:()=>api.deepLinks(),
  create:(payload:Record<string,unknown>)=>api.createDeepLink(payload),
  activate:(slug:string)=>api.activateDeepLink(slug)
}
