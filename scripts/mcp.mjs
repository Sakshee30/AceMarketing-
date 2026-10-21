import {verifyToken} from '../backend/src/security.mjs'
import {authenticateMcpToken,createMcpToken,listMcpTokens,revokeMcpToken,rotateMcpToken,getMcpCatalog,runMcpDiagnostics} from '../backend/src/mcp-service.mjs'

const args=process.argv.slice(2)
const command=args[0]||'help'
const subcommand=args[1]||''
const value=(name,fallback='')=>{
  const index=args.findIndex(item=>item===`--${name}`)
  if(index>=0)return args[index+1]||fallback
  const prefix=`--${name}=`
  return args.find(item=>item.startsWith(prefix))?.slice(prefix.length)||fallback
}
const has=name=>args.includes(`--${name}`)||args.some(item=>item.startsWith(`--${name}=`))
const json=has('json')
const output=value=>process.stdout.write((json?JSON.stringify(value,null,2):typeof value==='string'?value:JSON.stringify(value,null,2))+'\n')
const fail=(message,code=1)=>{process.stderr.write(`[mcp] ${message}\n`);process.exitCode=code}
const workspaceId=value('workspace-id',process.env.ACE_MCP_WORKSPACE_ID||process.env.DEFAULT_WORKSPACE_ID||'ws_default')

const readStdin=async()=>{
  if(process.stdin.isTTY)return ''
  return new Promise(resolve=>{let text='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>{text+=chunk});process.stdin.on('end',()=>resolve(text.trim()))})
}

const session=async()=>{
  let token=process.env.ACE_SESSION_TOKEN||process.env.ACE_ADMIN_SESSION_TOKEN||''
  if(has('session-token-stdin'))token=await readStdin()
  if(!token)throw new Error('ACE_SESSION_TOKEN or ACE_ADMIN_SESSION_TOKEN is required; use --session-token-stdin for protected input')
  const payload=verifyToken(token,process.env.JWT_SECRET||'dev-only-change-me')
  if(!payload)throw new Error('session token is invalid or expired')
  if(payload.workspaceId&&payload.workspaceId!==workspaceId)throw new Error('session token workspace does not match --workspace-id')
  if(!['owner','admin'].includes(payload.role))throw new Error('owner or admin session required')
  return payload
}

const help=()=>output(`AceMarketing MCP CLI\n\nCommands:\n  npm run mcp:stdio\n  npm run mcp:token:create -- --workspace-id ws_123 --label analyst --scopes mcp.read,mcp.analyze,mcp.draft\n  npm run mcp:token:list -- --workspace-id ws_123\n  npm run mcp:token:revoke -- --workspace-id ws_123 --token-id mcp_tok_123\n  npm run mcp:token:rotate -- --workspace-id ws_123 --token-id mcp_tok_123\n  npm run mcp:catalog\n  npm run mcp:config -- --format generic --cwd C:\\path\\to\\AceMarketing-\n  npm run mcp:doctor\n\nToken commands require ACE_SESSION_TOKEN or ACE_ADMIN_SESSION_TOKEN.`)

try{
  if(command==='help'||command==='--help'||command==='-h')help()
  else if(command==='token'&&subcommand==='create'){
    const actor=await session()
    const created=await createMcpToken({workspaceId,actorId:actor.userId||actor.sub,role:actor.role,label:value('label','local-mcp'),expiresIn:value('expires-in','1h'),scopes:value('scopes',''),preset:value('preset','analyst'),source:'cli'})
    output(created)
  }else if(command==='token'&&subcommand==='list'){
    await session();output(await listMcpTokens(workspaceId))
  }else if(command==='token'&&subcommand==='revoke'){
    const actor=await session();output(await revokeMcpToken({workspaceId,id:value('token-id'),actorId:actor.userId||actor.sub,source:'cli'}))
  }else if(command==='token'&&subcommand==='rotate'){
    const actor=await session();output(await rotateMcpToken({workspaceId,id:value('token-id'),actorId:actor.userId||actor.sub,role:actor.role,source:'cli'}))
  }else if(command==='catalog'){
    output(getMcpCatalog({category:value('category')||null,kind:value('kind')||null}))
  }else if(command==='config'){
    const format=value('format','generic');const cwd=value('cwd',process.cwd());const tokenPlaceholder='paste-token-here'
    const env={ACE_MCP_TOKEN:tokenPlaceholder,ACE_MCP_WORKSPACE_ID:workspaceId,ACE_MCP_SERVER:'local'}
    if(format==='dotenv')output(Object.entries(env).map(([key,item])=>`${key}=${item}`).join('\n'))
    else if(format==='powershell')output(`$env:ACE_MCP_TOKEN='${tokenPlaceholder}'\n$env:ACE_MCP_WORKSPACE_ID='${workspaceId}'\n$env:ACE_MCP_SERVER='local'`)
    else if(format==='bash')output(`export ACE_MCP_TOKEN='${tokenPlaceholder}'\nexport ACE_MCP_WORKSPACE_ID='${workspaceId}'\nexport ACE_MCP_SERVER='local'`)
    else output({mcpServers:{acemarket:{command:'npm',args:['run','mcp:stdio'],cwd,env}}})
  }else if(command==='doctor'){
    const report=await runMcpDiagnostics(workspaceId)
    if(process.env.ACE_MCP_TOKEN){try{await authenticateMcpToken({token:process.env.ACE_MCP_TOKEN,workspaceId});report.checks.unshift({name:'token',status:'pass',detail:'token valid'})}catch(error){report.checks.unshift({name:'token',status:'fail',detail:error.message})}}else report.checks.unshift({name:'token',status:'warn',detail:'ACE_MCP_TOKEN is not set'})
    output(report);if(report.checks.some(item=>item.status==='fail'))process.exitCode=1
  }else fail('unknown command; use --help',2)
}catch(error){fail(error instanceof Error?error.message:String(error),2)}
