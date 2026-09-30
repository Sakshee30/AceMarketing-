export const bootstrapCustomerBff=async()=>{
  process.env.ACE_RUNTIME_ROLE=process.env.ACE_RUNTIME_ROLE||'tenant-api'
  return import('../../../src/index.mjs')
}
