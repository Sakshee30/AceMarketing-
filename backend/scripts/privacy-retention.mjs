import {purgeRetention} from '../src/privacy-ops.mjs'

const workspaceId=process.env.PRIVACY_WORKSPACE_ID||process.env.DEFAULT_WORKSPACE_ID||'ws_default'
const dryRun=String(process.env.PRIVACY_RETENTION_DRY_RUN||'true').toLowerCase()!=='false'
const result=await purgeRetention(workspaceId,{dryRun,requestedBy:'privacy-retention-script'})
console.log(JSON.stringify(result,null,2))
