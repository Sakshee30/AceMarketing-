import {inflateRawSync} from 'node:zlib'

const decode=xml=>String(xml).replace(/&#(x[0-9a-f]+|[0-9]+);|&(amp|lt|gt|quot|apos);/gi,(_,n,entity)=>entity?({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity]||'') : String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n)))
const columnIndex=letters=>[...letters].reduce((n,c)=>n*26+c.toUpperCase().charCodeAt(0)-64,0)-1
const xmlText=(xml,tag)=>{const m=xml.match(new RegExp('<(?:\\w+:)?'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?'+tag+'>','i'));return m?decode(m[1].replace(/<[^>]*>/g,'')):''}
function archiveEntries(bytes){
 const b=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes)
 if(b.length>2_000_000)throw new Error('Excel file must not exceed 2 MB')
 const found=new Map()
 let end=-1
 for(let i=b.length-22;i>=Math.max(0,b.length-65557);i--){if(b.readUInt32LE(i)===0x06054b50){end=i;break}}
 if(end<0)throw new Error('Invalid XLSX ZIP structure')
 const count=b.readUInt16LE(end+10),offset=b.readUInt32LE(end+16)
 if(count>200)throw new Error('Too many Excel archive entries')
 let at=offset
 for(let i=0;i<count;i++){
  if(at+46>b.length||b.readUInt32LE(at)!==0x02014b50)throw new Error('Invalid Excel entry')
  const method=b.readUInt16LE(at+10),compressed=b.readUInt32LE(at+20),expanded=b.readUInt32LE(at+24)
  const nameLen=b.readUInt16LE(at+28),extra=b.readUInt16LE(at+30),comment=b.readUInt16LE(at+32)
  const local=b.readUInt32LE(at+42),name=b.subarray(at+46,at+46+nameLen).toString('utf8')
  if(name==='xl/sharedStrings.xml'||/^xl\/worksheets\/sheet[0-9]+\.xml$/.test(name)){
   if(expanded>4_000_000||local+30>b.length||b.readUInt32LE(local)!==0x04034b50)throw new Error('Invalid Excel sheet size')
   const start=local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28)
   if(start+compressed>b.length)throw new Error('Truncated XLSX entry')
   const payload=b.subarray(start,start+compressed)
   const value=method===0?payload:method===8?inflateRawSync(payload,{maxOutputLength:4_000_000}):null
   if(!value)throw new Error('Unsupported Excel compression')
   found.set(name,value.toString('utf8'))
  }
  at+=46+nameLen+extra+comment
 }
 return found
}
export function parseQaWorkbook(bytes){
 const entries=archiveEntries(bytes)
 const sheet=entries.get('xl/worksheets/sheet2.xml')
 if(!sheet)throw new Error('Expected a second sheet containing feature test data')
 const strings=[...(entries.get('xl/sharedStrings.xml')||'').matchAll(/<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(m=>[...m[1].matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(t=>decode(t[1])).join(''))
 const rows=[]
 for(const m of sheet.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)){
  if(rows.length>=1000)throw new Error('Maximum 1000 rows per test upload')
  const values=[]
  for(const c of m[1].matchAll(/<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g)){
   const col=c[1].match(/\br="([A-Z]+)[0-9]+"/i)
   if(!col)continue
   const idx=columnIndex(col[1]);if(idx<0||idx>79)throw new Error('Maximum 80 columns')
   const type=c[1].match(/\bt="([^"]+)"/)?.[1]
   const raw=xmlText(c[2],type==='inlineStr'?'t':'v')
   values[idx]=type==='s'?strings[Number(raw)]||'':type==='n'&&raw!==''?Number(raw):raw
  }
  if(values.some(v=>v!==undefined&&v!==''))rows.push(values)
 }
 if(rows.length<2)throw new Error('The feature data sheet must have a header and at least one record')
 const headers=rows[0].map(v=>String(v||'').trim())
 if(!headers.length||headers.some(h=>!h))throw new Error('The feature data header has missing columns')
 if(new Set(headers).size!==headers.length)throw new Error('Duplicate column names are not allowed')
 const records=rows.slice(1).map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??''])))
 return {columns:headers,records}
}
