import {inflateRawSync} from 'node:zlib'

const decode=value=>String(value).replace(/&#(x[0-9a-f]+|[0-9]+);|&(amp|lt|gt|quot|apos);/gi,(_,number,entity)=>entity?({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[entity]||''):String.fromCodePoint(number[0].toLowerCase()==='x'?parseInt(number.slice(1),16):Number(number)))
const cellText=(xml,tag)=>{const match=xml.match(new RegExp('<(?:\\w+:)?'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?'+tag+'>','i'));return match?decode(match[1].replace(/<[^>]*>/g,'')):''}
const columnIndex=letters=>[...letters].reduce((value,char)=>value*26+char.toUpperCase().charCodeAt(0)-64,0)-1

export function parseQaWorkbook(bytes){
 const buffer=Buffer.from(bytes);if(buffer.length>2_000_000)throw new Error('Excel file must not exceed 2 MB')
 let end=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--){if(buffer.readUInt32LE(i)===0x06054b50){end=i;break}};if(end<0)throw new Error('Invalid XLSX workbook')
 const entries=new Map(),count=buffer.readUInt16LE(end+10);let offset=buffer.readUInt32LE(end+16)
 for(let index=0;index<count;index++){
  if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)throw new Error('Invalid XLSX entry')
  const method=buffer.readUInt16LE(offset+10),compressed=buffer.readUInt32LE(offset+20),nameLength=buffer.readUInt16LE(offset+28),extraLength=buffer.readUInt16LE(offset+30),commentLength=buffer.readUInt16LE(offset+32),local=buffer.readUInt32LE(offset+42),name=buffer.subarray(offset+46,offset+46+nameLength).toString('utf8')
  if(name==='xl/sharedStrings.xml'||/^xl\/worksheets\/sheet[0-9]+\.xml$/.test(name)){const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28),payload=buffer.subarray(start,start+compressed);entries.set(name,(method===0?payload:inflateRawSync(payload,{maxOutputLength:4_000_000})).toString('utf8'))}
  offset+=46+nameLength+extraLength+commentLength
 }
 const sheet=entries.get('xl/worksheets/sheet2.xml')||entries.get('xl/worksheets/sheet1.xml');if(!sheet)throw new Error('Workbook needs a sheet with a header and test rows')
 const strings=[...(entries.get('xl/sharedStrings.xml')||'').matchAll(/<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(match=>[...match[1].matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(text=>decode(text[1])).join(''))
 const rows=[]
 for(const row of sheet.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)){if(rows.length>=1000)throw new Error('Maximum 1000 rows per upload');const values=[];for(const cell of row[1].matchAll(/<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g)){const reference=cell[1].match(/\br="([A-Z]+)[0-9]+"/i);if(!reference)continue;const type=cell[1].match(/\bt="([^"]+)"/)?.[1],raw=cellText(cell[2],type==='inlineStr'?'t':'v');values[columnIndex(reference[1])]=type==='s'?strings[Number(raw)]||'':type==='n'&&raw!==''?Number(raw):raw}if(values.some(value=>value!==undefined&&value!==''))rows.push(values)}
 if(rows.length<2)throw new Error('Workbook needs a header and at least one data row')
 const columns=rows[0].map(value=>String(value||'').trim());if(!columns.length||columns.some(column=>!column)||new Set(columns).size!==columns.length)throw new Error('Workbook headers must be unique and non-empty')
 return {columns,records:rows.slice(1).map(row=>Object.fromEntries(columns.map((column,index)=>[column,row[index]??''])))}
}
