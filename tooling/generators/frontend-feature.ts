import fs from 'node:fs'
import path from 'node:path'

const [, , rawName]=process.argv
const name=String(rawName||'').trim().toLowerCase()
if(!/^[a-z][a-z0-9-]{1,63}$/.test(name)){
  console.error('usage: tsx tooling/generators/frontend-feature.ts <feature-name>')
  process.exit(1)
}
const root=path.join(process.cwd(),'frontend','customer-app','src','features',name)
if(fs.existsSync(root)){
  console.error('feature already exists: '+root)
  process.exit(1)
}
fs.mkdirSync(path.join(root,'pages'),{recursive:true})
fs.mkdirSync(path.join(root,'data'),{recursive:true})
fs.mkdirSync(path.join(root,'ui'),{recursive:true})
const pascal=name.split('-').map(x=>x[0].toUpperCase()+x.slice(1)).join('')
fs.writeFileSync(path.join(root,'feature.manifest.ts'),`export const ${name.replace(/-([a-z])/g,(_,x)=>x.toUpperCase())}FeatureManifest=Object.freeze({
  id:'${name}',
  owner:'unassigned',
  routeIds:[],
  permissions:[],
  dependencies:[],
  status:'designed',
  evidenceIds:[]
} as const)\n`)
fs.writeFileSync(path.join(root,'public.ts'),`export {default as ${pascal}Page} from './pages/${pascal}Page'\n`)
fs.writeFileSync(path.join(root,'pages',pascal+'Page.tsx'),`export default function ${pascal}Page(){return <main><h1>${pascal}</h1></main>}\n`)
fs.writeFileSync(path.join(root,'README.md'),`# ${pascal}\n\nGenerated ownership boundary. Add contracts, permissions, tests and evidence before activation.\n`)
console.log(root)
