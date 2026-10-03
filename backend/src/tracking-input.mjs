/** Validate before any tracking persistence or activation. No production bypass. */
export const trackingInputError=body=>{
  if(!body||typeof body!=='object'||Array.isArray(body))return 'event body must be an object'
  if(body.id!=null&&(typeof body.id!=='string'||!body.id.trim()||body.id.length>256))return 'event id must be a nonempty string of at most 256 characters'
  for(const field of ['occurredAt','timestamp','receivedAt']){
    if(body[field]==null)continue
    const value=body[field]
    if(!['string','number'].includes(typeof value)||value===''||!Number.isFinite(new Date(value).getTime()))return 'invalid event timestamp: '+field
  }
  for(const field of ['customerId','visitorId','deviceId','device_id']){
    if(body[field]==null)continue
    if(typeof body[field]!=='string'||!body[field].trim()||body[field].length>256)return field+' must be a nonempty string of at most 256 characters'
  }
  if(body.eventCategory!=null&&!['essential','analytics','marketing','personalization'].includes(body.eventCategory))return 'invalid event category'
  return null
}
