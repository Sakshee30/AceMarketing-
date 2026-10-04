// Incoming CRM and webhook payloads are patches, not complete lead snapshots.
export function mergeLeadEvidence(stored,input){
  const patch=Object.fromEntries(Object.entries(input).filter(([,value])=>value!==undefined))
  const merged={...(stored?.journey||{}),crmStage:stored?.crm_stage,...patch}
  if(input.crmStage===undefined&&input.stage!==undefined)merged.crmStage=input.stage
  if(input.journeyDepth===undefined&&input.pagesViewed!==undefined)merged.journeyDepth=input.pagesViewed
  const attributes={...(stored?.attributes||{}),...(input.attributes||{})}
  for(const key of ['fraudScore','invalidContact','duplicate','whatsappStatus']){
    if(input[key]!==undefined)attributes[key]=input[key]
    else if(attributes[key]!==undefined)merged[key]=attributes[key]
  }
  merged.attributes=attributes
  return merged
}
