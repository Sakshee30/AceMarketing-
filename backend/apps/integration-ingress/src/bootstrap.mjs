export const bootstrapIntegrationIngress=async()=>{
  process.env.ACE_RUNTIME_ROLE='integration-ingress'
  return import('../../../src/index.mjs')
}
