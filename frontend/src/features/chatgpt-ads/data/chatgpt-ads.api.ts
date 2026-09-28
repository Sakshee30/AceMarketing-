import {api} from '../../../lib/api'

export const chatgptAdsApi={
  status:()=>api.chatgptAds(),
  validate:(payload:Record<string,unknown>)=>api.validateChatgptAds(payload),
  send:(payload:Record<string,unknown>)=>api.sendChatgptAds(payload)
}
