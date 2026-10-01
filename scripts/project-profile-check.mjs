import fs from 'node:fs'
import path from 'node:path'
import {platformModuleRegistry} from '../backend/src/platform/module-registry.mjs'

const root=process.cwd()
const profilePath=path.join(root,'config/project-profile.json')

export const readProjectProfile=()=>{
  if(!fs.existsSync(profilePath))throw new Error('project profile missing: config/project-profile.json')
  return JSON.parse(fs.readFileSync(profilePath,'utf8'))
}

export const validateProjectProfile=()=>{
  const profile=readProjectProfile()
  const required=[
    'schemaVersion','status','product','architectureStandard','dataClassification','enabledModules',
    'deploymentProfile','residency','contractedLoad','availabilityObjectives','externalDependencies',
    'retention','approvedExceptions','evidence'
  ]
  for(const key of required)if(profile[key]===undefined||profile[key]===null)throw new Error('project profile field missing: '+key)
  if(!Array.isArray(profile.enabledModules)||profile.enabledModules.length===0)throw new Error('enabledModules must be a non-empty array')
  const known=new Set(platformModuleRegistry.map(item=>item.id))
  const enabled=new Set(profile.enabledModules)
  for(const id of enabled)if(!known.has(id))throw new Error('unknown enabled module in project profile: '+id)
  for(const id of known)if(!enabled.has(id))throw new Error('canonical backend module missing from project profile: '+id)
  if(!Array.isArray(profile.externalDependencies))throw new Error('externalDependencies must be an array')
  if(!Array.isArray(profile.approvedExceptions))throw new Error('approvedExceptions must be an array')
  if(profile.contractedLoad?.qualificationStatus!=='unverified')throw new Error('capacity target must remain unverified without measured evidence')
  if(profile.availabilityObjectives?.qualificationStatus!=='unverified')throw new Error('availability objective must remain unverified without measured evidence')
  if(profile.residency?.productionApproved!==false)throw new Error('production residency cannot be marked approved without external evidence')
  if(profile.retention?.productionApproved!==false)throw new Error('production retention cannot be marked approved without external evidence')
  for(const evidence of Object.values(profile.evidence||{})){
    if(typeof evidence!=='string'||!evidence)throw new Error('invalid project profile evidence reference')
    if(!fs.existsSync(path.join(root,evidence)))throw new Error('project profile evidence missing: '+evidence)
  }
  return true
}

if(import.meta.url==='file://'+process.argv[1]){
  validateProjectProfile()
  console.log('Project profile validation passed')
}
