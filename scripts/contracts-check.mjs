import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const required=[
  'packages/contracts/http/platform.openapi.yaml',
  'packages/contracts/events/platform-event.schema.json',
  'packages/contracts/capabilities/capability.schema.json',
  'config/schemas/platform.schema.json',
  'config/profiles/production-standard.yaml',
  'config/profiles/production-high-scale.yaml',
  'config/limits/operation-budgets.yaml'
]

const failures=[]
for(const relative of required){
  if(!fs.existsSync(path.join(root,relative)))failures.push('missing contract/config source: '+relative)
}

for(const relative of [
  'packages/contracts/events/platform-event.schema.json',
  'packages/contracts/capabilities/capability.schema.json',
  'config/schemas/platform.schema.json'
]){
  try{JSON.parse(fs.readFileSync(path.join(root,relative),'utf8'))}
  catch(error){failures.push(relative+': invalid JSON: '+(error instanceof Error?error.message:String(error)))}
}

const openapi=fs.readFileSync(path.join(root,'packages/contracts/http/platform.openapi.yaml'),'utf8')
for(const token of ['openapi: 3.1.0','operationId:','ProblemDetails','x-contract-scope: platform-foundation']){
  if(!openapi.includes(token))failures.push('platform.openapi.yaml missing '+token)
}
if(/AWS_SECRET_ACCESS_KEY|BEGIN PRIVATE KEY|DATABASE_URL\s*:|password\s*:/i.test(openapi)){
  failures.push('platform.openapi.yaml contains a secret-shaped field or value')
}

const highScale=fs.readFileSync(path.join(root,'config/profiles/production-high-scale.yaml'),'utf8')
for(const token of ['claimStatus: qualification-required','tenantCells:','requireRoutingEpoch: true','singleWriter: true']){
  if(!highScale.includes(token))failures.push('production-high-scale profile missing '+token)
}

if(failures.length){
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('[contracts] platform contracts and production profiles are structurally valid')
