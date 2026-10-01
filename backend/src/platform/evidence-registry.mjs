import {acceptanceControlRegistry} from './acceptance-register.mjs'
import {featureCatalogItem} from './feature-catalog.mjs'

const featureForRequirement=Object.freeze({
  'G-03':'authorization',
  'G-04':'capabilities',
  'G-05':'workspaces',
  'G-06':'authorization',
  'G-07':'capabilities',
  'G-10':'authorization',
  'G-11':'authorization',
  'G-12':'workspaces',
  'G-16':'capabilities',
  'G-18':'boards',
  'G-21':'boards',
  'G-23':'boards',
  'G-27':'boards',
  'G-31':'audit',
  'G-32':'jobs',
  'G-35':'capabilities',
  'G-36':'capabilities',
  'G-38':'capabilities',
  'G-40':'search',
  'G-41':'ai',
  'G-42':'billing',
  'G-43':'webhooks',
  'G-48':'capabilities',
  'G-59':'audit',
  'G-64':'capabilities'
})

const testedCommit=()=>String(process.env.GITHUB_SHA||process.env.ACE_RELEASE_SHA||'unverified-local')

export const architectureEvidenceRecords=Object.freeze(
  acceptanceControlRegistry
    .filter(item=>item.status==='implemented')
    .map(item=>{
      const featureId=featureForRequirement[item.id]
      if(!featureId)throw new Error('implemented requirement missing feature mapping: '+item.id)
      return Object.freeze({
        requirementId:item.id,
        featureId,
        testedCommit:testedCommit(),
        evidencePaths:Object.freeze([...item.evidence]),
        verificationState:'implemented',
        note:'Repository evidence exists; production-like verification is tracked separately.'
      })
    })
)

export const evidenceRegistrySnapshot=()=>({
  schemaVersion:'platform-evidence-registry.v1',
  generatedAt:new Date().toISOString(),
  testedCommit:testedCommit(),
  items:architectureEvidenceRecords.map(item=>({...item,evidencePaths:[...item.evidencePaths]}))
})

export const validateEvidenceRegistry=()=>{
  const implemented=acceptanceControlRegistry.filter(item=>item.status==='implemented')
  if(architectureEvidenceRecords.length!==implemented.length)throw new Error('implemented requirement evidence coverage mismatch')
  const ids=new Set()
  for(const record of architectureEvidenceRecords){
    if(ids.has(record.requirementId))throw new Error('duplicate evidence requirement: '+record.requirementId)
    ids.add(record.requirementId)
    if(!/^G-\d{2}$/.test(record.requirementId))throw new Error('invalid evidence requirement id: '+record.requirementId)
    if(!featureCatalogItem(record.featureId))throw new Error('evidence references unknown feature: '+record.featureId)
    if(!record.testedCommit)throw new Error('evidence tested commit missing: '+record.requirementId)
    if(!record.evidencePaths.length)throw new Error('evidence paths missing: '+record.requirementId)
    if(record.verificationState!=='implemented')throw new Error('repository evidence must not overstate verification')
  }
  return true
}
