const catalog=[
  {
    id:'create-record',
    description:'Create a record through an approved domain adapter.',
    inputSchema:{required:['objectKey','data'],properties:{objectKey:'string',data:'object'}},
    outputSchema:{properties:{recordId:'string'}},
    permission:'workspace.write',
    rateClass:'standard-write',
    costClass:'low',
    timeoutMs:2000,
    idempotency:'required',
    compensation:'delete-created-record'
  },
  {
    id:'update-authorised-fields',
    description:'Update a bounded set of authorised record fields.',
    inputSchema:{required:['recordId','fields'],properties:{recordId:'string',fields:'object'}},
    outputSchema:{properties:{recordId:'string',version:'number'}},
    permission:'workspace.write',
    rateClass:'standard-write',
    costClass:'low',
    timeoutMs:2000,
    idempotency:'required',
    compensation:'restore-previous-version'
  },
  {
    id:'request-approval',
    description:'Create a durable human approval request.',
    inputSchema:{required:['scope'],properties:{scope:'string',message:'string'}},
    outputSchema:{properties:{approvalId:'string'}},
    permission:'approvals.write',
    rateClass:'control',
    costClass:'low',
    timeoutMs:1500,
    idempotency:'required',
    compensation:'expire-pending-approval'
  },
  {
    id:'send-template-notification',
    description:'Send an approved notification template through configured providers.',
    inputSchema:{required:['templateId','recipientRef'],properties:{templateId:'string',recipientRef:'string',variables:'object'}},
    outputSchema:{properties:{deliveryId:'string'}},
    permission:'workspace.write',
    rateClass:'notification',
    costClass:'medium',
    timeoutMs:3000,
    idempotency:'required',
    compensation:'none'
  },
  {
    id:'enqueue-export',
    description:'Queue an approved export job without doing heavy work on the request thread.',
    inputSchema:{required:['exportType'],properties:{exportType:'string',filters:'object'}},
    outputSchema:{properties:{jobId:'string'}},
    permission:'reports.read',
    rateClass:'background',
    costClass:'medium',
    timeoutMs:1000,
    idempotency:'required',
    compensation:'cancel-before-start'
  },
  {
    id:'invoke-approved-connector',
    description:'Invoke a preconfigured connector capability. Arbitrary URLs are not accepted.',
    inputSchema:{required:['connectorId','operation'],properties:{connectorId:'string',operation:'string',input:'object'}},
    outputSchema:{properties:{deliveryId:'string',status:'string'}},
    permission:'integrations.write',
    rateClass:'external',
    costClass:'variable',
    timeoutMs:8000,
    idempotency:'required',
    compensation:'provider-specific'
  }
]

const byId=new Map(catalog.map(item=>[item.id,Object.freeze({...item})]))

const plainObject=value=>value&&typeof value==='object'&&!Array.isArray(value)

export const workflowActionCatalog=()=>catalog.map(item=>({...item,inputSchema:{...item.inputSchema},outputSchema:{...item.outputSchema}}))

export const workflowActionDefinition=id=>byId.get(String(id||''))||null

export const validateWorkflowActionConfig=config=>{
  if(!plainObject(config))throw Object.assign(new Error('workflow action config must be an object'),{status:400,code:'invalid_workflow_action'})
  const actionId=String(config.actionId||'')
  const action=workflowActionDefinition(actionId)
  if(!action)throw Object.assign(new Error('workflow action is not registered: '+actionId),{status:400,code:'unsupported_workflow_action'})
  const input=plainObject(config.input)?config.input:{}
  for(const required of action.inputSchema.required||[]){
    if(input[required]===undefined||input[required]===null||input[required]===''){
      throw Object.assign(new Error('workflow action '+actionId+' missing input: '+required),{status:400,code:'workflow_action_input_required'})
    }
  }
  const allowed=new Set(Object.keys(action.inputSchema.properties||{}))
  for(const key of Object.keys(input)){
    if(!allowed.has(key))throw Object.assign(new Error('workflow action '+actionId+' contains unsupported input: '+key),{status:400,code:'workflow_action_input_unknown'})
  }
  if(Buffer.byteLength(JSON.stringify(input))>64*1024)throw Object.assign(new Error('workflow action input exceeds 64 KiB'),{status:413,code:'workflow_action_input_too_large'})
  return {actionId,input,timeoutMs:action.timeoutMs,idempotency:action.idempotency,compensation:action.compensation}
}
