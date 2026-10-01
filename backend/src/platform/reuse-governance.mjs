import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const manifestPath=path.join(root,'config','foundation-compatibility.json')

export const readFoundationCompatibility=()=>JSON.parse(fs.readFileSync(manifestPath,'utf8'))

export const foundationReuseSnapshot=()=>{
  const policy=readFoundationCompatibility()
  return {
    schemaVersion:policy.schemaVersion,
    foundationVersion:policy.foundationVersion,
    status:policy.status,
    runtime:{...policy.runtime},
    supportedProfiles:[...policy.supportedProfiles],
    deprecationPolicy:{...policy.deprecationPolicy},
    referenceProduct:{...policy.referenceProduct},
    requiredUpgradeEvidence:[...policy.requiredUpgradeEvidence]
  }
}

export const validateFoundationReuseGovernance=()=>{
  const policy=readFoundationCompatibility()
  if(policy.schemaVersion!=='ace-foundation-compatibility.v1')throw new Error('unsupported foundation compatibility schema')
  if(!/^\d+\.\d+\.\d+$/.test(String(policy.foundationVersion||'')))throw new Error('foundationVersion must be semantic version')
  if(!Array.isArray(policy.supportedProfiles)||policy.supportedProfiles.length===0)throw new Error('supportedProfiles required')
  if(Number(policy.deprecationPolicy?.minimumNoticeDays)<1)throw new Error('deprecation notice window required')
  if(policy.deprecationPolicy?.removalRequiresMigrationGuide!==true)throw new Error('breaking removals require migration guide')
  if(policy.deprecationPolicy?.removalRequiresCompatibilityTest!==true)throw new Error('breaking removals require compatibility evidence')
  if(!policy.referenceProduct?.repository||!policy.referenceProduct?.verificationState)throw new Error('reference product metadata required')
  for(const contractPath of Object.values(policy.contracts||{})){
    if(typeof contractPath!=='string'||!contractPath)throw new Error('invalid compatibility contract path')
    if(!fs.existsSync(path.join(root,contractPath)))throw new Error('compatibility contract path missing: '+contractPath)
  }
  for(const required of ['docs/architecture/FOUNDATION_COMPATIBILITY.md','docs/architecture/UPGRADE_GUIDE.md']){
    if(!fs.existsSync(path.join(root,required)))throw new Error('reuse governance document missing: '+required)
  }
  return true
}
