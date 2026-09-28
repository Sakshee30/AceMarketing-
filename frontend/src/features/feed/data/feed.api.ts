import {api} from '../../../lib/api'

export const feedApi={
  load:()=>api.feed(),
  addAttribute:(payload:Record<string,unknown>)=>api.addFeedAttribute(payload),
  saveMapping:(payload:Record<string,unknown>)=>api.saveFeedMapping(payload),
  toggleMapping:(id:string,enabled:boolean)=>api.toggleFeedMapping(id,enabled),
  preview:(destination:string)=>api.previewFeed(destination)
}
