import test from 'node:test'
import assert from 'node:assert/strict'
import {parseQaWorkbook} from '../src/qa-excel-fixtures.mjs'

function packWorkbook(xml){
 const entries=[['xl/worksheets/sheet2.xml',Buffer.from(xml)],['xl/sharedStrings.xml',Buffer.from('<x:sst xmlns:x="urn:test"><x:si><x:t>from-shared</x:t></x:si></x:sst>')]]
 const local=[],central=[];let offset=0
 for(const [name,data] of entries){
  const filename=Buffer.from(name)
  const header=Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50,0);header.writeUInt16LE(20,4);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26)
  local.push(header,filename,data)
  const directory=Buffer.alloc(46)
  directory.writeUInt32LE(0x02014b50,0);directory.writeUInt16LE(20,4);directory.writeUInt16LE(20,6);directory.writeUInt32LE(data.length,20);directory.writeUInt32LE(data.length,24);directory.writeUInt16LE(filename.length,28);directory.writeUInt32LE(offset,42)
  central.push(directory,filename)
  offset+=header.length+filename.length+data.length
 }
 const size=central.reduce((n,p)=>n+p.length,0)
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(size,12);end.writeUInt32LE(offset,16)
 return Buffer.concat([...local,...central,end])
}
const worksheet=rows=>'<x:worksheet xmlns:x="urn:test"><x:sheetData>'+rows+'</x:sheetData></x:worksheet>'
const row=(r,cells)=>'<x:row r="'+r+'">'+cells+'</x:row>'
const cell=(ref,type,value)=>'<x:c r="'+ref+'" t="'+type+'"><x:v>'+value+'</x:v></x:c>'

test('parses namespace-prefixed feature worksheet and keeps valid records',()=>{
 const xml=worksheet(
  row(1,cell('A1','str','campaign_id')+cell('B1','str','conversions'))+
  row(2,cell('A2','str','QA-CAMP-001')+cell('B2','n','7'))+
  row(3,cell('A3','s','0')+cell('B3','n','2'))
 )
 const got=parseQaWorkbook(packWorkbook(xml))
 assert.deepEqual(got.columns,['campaign_id','conversions'])
 assert.deepEqual(got.records,[{campaign_id:'QA-CAMP-001',conversions:7},{campaign_id:'from-shared',conversions:2}])
})
test('rejects an empty feature worksheet',()=>{
 assert.throws(()=>parseQaWorkbook(packWorkbook(worksheet(row(1,cell('A1','str','name'))))),/at least one record/)
})
test('rejects duplicate headings',()=>{
 const xml=worksheet(row(1,cell('A1','str','id')+cell('B1','str','id'))+row(2,cell('A2','n','1')+cell('B2','n','2')))
 assert.throws(()=>parseQaWorkbook(packWorkbook(xml)),/Duplicate column/)
})
test('rejects oversized or malformed archives',()=>{
 assert.throws(()=>parseQaWorkbook(Buffer.alloc(2_000_001)),/2 MB/)
 assert.throws(()=>parseQaWorkbook(Buffer.from('not a workbook')),/Invalid XLSX/)
})
