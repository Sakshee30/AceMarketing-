import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  const full=path.join(dir,entry.name)
  return entry.isDirectory()?walk(full):[full]
})

test('backend source does not import frontend implementation or browser-only authority',()=>{
  const files=walk(path.join(root,'backend')).filter(file=>/\.(mjs|js|ts)$/.test(file))
  for(const file of files){
    const source=fs.readFileSync(file,'utf8')
    assert.doesNotMatch(source,/from\s+['"][^'"]*frontend\//,path.relative(root,file))
    assert.doesNotMatch(source,/window\.localStorage|document\.cookie/,path.relative(root,file))
  }
})

test('frontend sources do not import server database cloud SDKs or backend internals',()=>{
  const roots=[
    path.join(root,'frontend'),
    path.join(root,'website','public-site'),
    path.join(root,'packages','client-core'),
    path.join(root,'packages','design-system'),
    path.join(root,'packages','interaction-core'),
    path.join(root,'packages','kanban-ui')
  ].filter(fs.existsSync)
  const files=roots.flatMap(walk).filter(file=>/\.(ts|tsx|js|jsx)$/.test(file))
  for(const file of files){
    const source=fs.readFileSync(file,'utf8')
    assert.doesNotMatch(source,/from\s+['"][^'"]*backend\//,path.relative(root,file))
    assert.doesNotMatch(source,/from\s+['"]pg['"]|from\s+['"]@aws-sdk\//,path.relative(root,file))
  }
})

test('canonical production profiles preserve locked durability and security controls',()=>{
  const standard=fs.readFileSync(path.join(root,'config','profiles','production-standard.yaml'),'utf8')
  const highScale=fs.readFileSync(path.join(root,'config','profiles','production-high-scale.yaml'),'utf8')
  for(const source of [standard,highScale]){
    assert.match(source,/authentication:\s*required/)
    assert.match(source,/authorization:\s*required/)
    assert.match(source,/tenantIsolation:\s*required/)
    assert.match(source,/requiredForAcceptedJobs:\s*true/)
    assert.match(source,/onUnavailable:\s*reject-new-admission/)
    assert.match(source,/objectStorage:[\s\S]*provider:\s*s3/)
  }
  assert.match(highScale,/tenantCells:[\s\S]*enabled:\s*true/)
  assert.match(highScale,/requireRoutingEpoch:\s*true/)
  assert.match(highScale,/claimStatus:\s*qualification-required/)
})
