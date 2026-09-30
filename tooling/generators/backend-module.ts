import fs from 'node:fs'
import path from 'node:path'

const [, , rawName]=process.argv
const name=String(rawName||'').trim().toLowerCase()
if(!/^[a-z][a-z0-9-]{1,63}$/.test(name)){
  console.error('usage: tsx tooling/generators/backend-module.ts <module-name>')
  process.exit(1)
}
const root=path.join(process.cwd(),'backend','modules',name)
if(fs.existsSync(root)){
  console.error('module already exists: '+root)
  process.exit(1)
}
for(const sub of ['src/application','src/domain','src/ports','src/adapters','tests'])fs.mkdirSync(path.join(root,sub),{recursive:true})
fs.writeFileSync(path.join(root,'module.manifest.mjs'),`export default Object.freeze({
  id:'${name}',
  owner:'unassigned',
  contracts:[],
  migrations:[],
  permissions:[],
  events:[],
  capabilities:[],
  status:'designed'
})\n`)
fs.writeFileSync(path.join(root,'README.md'),`# ${name}\n\nGenerated module boundary. Domain/application code must remain provider independent. Add explicit contracts, permissions, migrations, tests and evidence before activation.\n`)
console.log(root)
