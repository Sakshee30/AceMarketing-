const MODES=Object.freeze({
  core:Object.freeze({
    description:'Smallest production-capable AceMarketing runtime: PostgreSQL, API, worker and web.',
    defaults:Object.freeze({
      controlPlane:false,ai:false,aiForecasting:false,aiCausal:false,aiMmm:false,
      billing:false,files:false,agentTransports:false,whatsapp:false,callTracking:false,
      googleAuth:false,providerReads:true
    })
  }),
  standard:Object.freeze({
    description:'Core runtime plus common SaaS operations and integrations; specialist AI remains optional.',
    defaults:Object.freeze({
      controlPlane:true,ai:false,aiForecasting:false,aiCausal:false,aiMmm:false,
      billing:true,files:false,agentTransports:false,whatsapp:true,callTracking:true,
      googleAuth:true,providerReads:true
    })
  }),
  full:Object.freeze({
    description:'All platform surfaces enabled, including control plane and specialist AI profiles.',
    defaults:Object.freeze({
      controlPlane:true,ai:true,aiForecasting:true,aiCausal:true,aiMmm:true,
      billing:true,files:true,agentTransports:true,whatsapp:true,callTracking:true,
      googleAuth:true,providerReads:true
    })
  })
})

const bool=(value,fallback)=>{
  if(value==null||value==='')return fallback
  const normalized=String(value).trim().toLowerCase()
  if(['1','true','yes','on','enabled'].includes(normalized))return true
  if(['0','false','no','off','disabled'].includes(normalized))return false
  return fallback
}

export const deploymentModeName=()=>{
  const value=String(process.env.ACE_DEPLOYMENT_MODE||'core').trim().toLowerCase()
  if(!Object.hasOwn(MODES,value))throw new Error('ACE_DEPLOYMENT_MODE must be core, standard, or full')
  return value
}

export const deploymentMode=()=>{
  const name=deploymentModeName()
  const preset=MODES[name]
  const d=preset.defaults
  return Object.freeze({
    name,
    description:preset.description,
    features:Object.freeze({
      controlPlane:bool(process.env.ACE_ENABLE_CONTROL_PLANE,d.controlPlane),
      ai:bool(process.env.ACE_ENABLE_AI,d.ai),
      aiForecasting:bool(process.env.ACE_ENABLE_AI_FORECASTING,d.aiForecasting),
      aiCausal:bool(process.env.ACE_ENABLE_AI_CAUSAL,d.aiCausal),
      aiMmm:bool(process.env.ACE_ENABLE_AI_MMM,d.aiMmm),
      billing:bool(process.env.ACE_ENABLE_BILLING,d.billing),
      files:bool(process.env.ACE_ENABLE_FILES,d.files),
      agentTransports:bool(process.env.ACE_ENABLE_AGENT_TRANSPORTS,d.agentTransports),
      whatsapp:bool(process.env.ACE_ENABLE_WHATSAPP,d.whatsapp),
      callTracking:bool(process.env.ACE_ENABLE_CALL_TRACKING,d.callTracking),
      googleAuth:bool(process.env.ACE_ENABLE_GOOGLE_AUTH,d.googleAuth),
      providerReads:bool(process.env.ACE_ENABLE_PROVIDER_READS,d.providerReads)
    })
  })
}

export const deploymentModeSnapshot=()=>({
  schemaVersion:'ace.deployment-mode.v1',
  ...deploymentMode()
})
