import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {dirname,resolve} from 'node:path'
import {scoreLead} from '../backend/src/lead-ops.mjs'

const source=process.argv[2]
const output=process.argv[3]||'.tmp-tools/synthetic-lead-ai-report.json'
const uploadOutput=process.argv[4]||'.tmp-tools/synthetic-leads-upload.json'
if(!source)throw new Error('CSV path required')

const parseCsv=text=>{
  const rows=[]
  let row=[],cell='',quoted=false
  for(let i=0;i<text.length;i++){
    const ch=text[i]
    if(quoted){
      if(ch==='"'&&text[i+1]==='"'){cell+='"';i++}
      else if(ch==='"')quoted=false
      else cell+=ch
    }else if(ch==='"')quoted=true
    else if(ch===','){row.push(cell);cell=''}
    else if(ch==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell=''}
    else cell+=ch
  }
  if(cell||row.length){row.push(cell.replace(/\r$/,''));rows.push(row)}
  const headers=rows.shift()||[]
  return rows.filter(values=>values.some(Boolean)).map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]||''])))
}

const rows=parseCsv(await readFile(source,'utf8'))
const allowed=(value,fallback,pattern)=>pattern.test(String(value||''))?String(value):fallback
const stages=['new','contacted','connected','qualified','consultation','opportunity','converted','enrolled','closed_won','lost']
const safeStage=value=>{
  const normalized=String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'')
  return stages.includes(normalized)?normalized:'new'
}
const synthetic=rows.map((row,index)=>{
  const n=index+1
  const originalScore=Math.max(0,Math.min(100,Number(row.Score)||0))
  const stage=safeStage(row.Stage)
  const dispositionCount=Math.max(0,Math.min(50,Number(row.dispositionCount)||0))
  const journeyDepth=Math.max(1,Math.min(12,1+Math.floor(dispositionCount/3)))
  const pricingViews=originalScore>=70?2:originalScore>=40?1:0
  const callOutcome=['qualified','consultation','opportunity','converted','enrolled','closed_won'].includes(stage)?'qualified':dispositionCount>0?'connected':'unreached'
  const meetingStatus=['consultation','opportunity','converted','enrolled','closed_won'].includes(stage)?'scheduled':'none'
  const input={
    externalLeadId:`synthetic_lead_${String(n).padStart(5,'0')}`,
    name:`Synthetic Lead ${String(n).padStart(5,'0')}`,
    email:`lead${String(n).padStart(5,'0')}@example.com`,
    phone:`+91999${String(n).padStart(7,'0')}`,
    ipAddress:`192.0.2.${1+(index%254)}`,
    source:allowed(row.Source,'Synthetic CSV',/^[\w .&/-]{1,80}$/),
    subSource:allowed(row['Sub Source'],'Synthetic campaign',/^[\w .&/-]{1,120}$/),
    campaign:allowed(row['UTM Campaign'],'synthetic_campaign',/^[\w .&/-]{1,160}$/),
    course:allowed(row['Course Name'],'Synthetic Course',/^[\w .&()/-]{1,160}$/),
    city:`Synthetic City ${1+(index%25)}`,
    crmStage:stage,
    journeyDepth,
    pricingViews,
    whatsappEngaged:index%3===0,
    callOutcome,
    meetingStatus,
    propensity:originalScore,
    invalidContact:index%29===0,
    duplicate:index%41===0,
    fraudScore:index%53===0?75:index%17===0?45:5
  }
  return {...input,...scoreLead(input)}
})

const gradeCounts=synthetic.reduce((acc,row)=>(acc[row.grade]=(acc[row.grade]||0)+1,acc),{})
const scoreValues=synthetic.map(row=>row.score)
const explainedCount=synthetic.filter(row=>row.drivers.length>0).length
const invariants={
  rowCountPreserved:synthetic.length===rows.length,
  uniqueIds:new Set(synthetic.map(row=>row.externalLeadId)).size===synthetic.length,
  reservedEmails:synthetic.every(row=>row.email.endsWith('@example.com')),
  syntheticNames:synthetic.every(row=>row.name.startsWith('Synthetic Lead ')),
  documentationIps:synthetic.every(row=>row.ipAddress.startsWith('192.0.2.')),
  boundedScores:synthetic.every(row=>Number.isInteger(row.score)&&row.score>=0&&row.score<=100),
  validGrades:synthetic.every(row=>['A','B','C','D'].includes(row.grade)),
  driverContractsValid:synthetic.every(row=>Array.isArray(row.drivers)&&row.drivers.every(driver=>typeof driver.key==='string'&&Number.isFinite(driver.points))),
  noSourceContactCopied:synthetic.every((row,index)=>row.email!==rows[index].Email&&row.phone!==rows[index]['Assigned Mobile'])
}
const report={
  generatedAt:new Date().toISOString(),
  mode:'synthetic-in-memory-no-external-egress',
  sourceRows:rows.length,
  syntheticRows:synthetic.length,
  score:{min:Math.min(...scoreValues),max:Math.max(...scoreValues),average:Number((scoreValues.reduce((a,b)=>a+b,0)/scoreValues.length).toFixed(2))},
  explanationCoveragePct:Number((explainedCount/synthetic.length*100).toFixed(2)),
  gradeCounts,
  invariants,
  passed:Object.values(invariants).every(Boolean),
  sample:synthetic.slice(0,3).map(({externalLeadId,email,phone,crmStage,source,campaign,course,score,grade,drivers})=>({externalLeadId,email,phone,crmStage,source,campaign,course,score,grade,drivers}))
}
const uploadRows=synthetic.map((row,index)=>{
  const featureAvailableAt=new Date(Date.UTC(2026,6,1)+(index%45)*86_400_000)
  const predictionCutoff=new Date(featureAvailableAt.getTime()+3_600_000)
  const positive=['qualified','consultation','opportunity','converted','enrolled','closed_won'].includes(row.crmStage)||index%7===0
  const labelObservedAt=new Date(predictionCutoff.getTime()+(positive?7:21)*86_400_000)
  return {
    entityId:row.externalLeadId,
    features:{
      source:row.source,
      campaign:row.campaign,
      course:row.course,
      crmStage:row.crmStage,
      journeyDepth:row.journeyDepth,
      pricingViews:row.pricingViews,
      whatsappEngaged:row.whatsappEngaged,
      callOutcome:row.callOutcome,
      meetingStatus:row.meetingStatus,
      propensity:row.propensity,
      invalidContact:row.invalidContact,
      duplicate:row.duplicate,
      fraudScore:row.fraudScore,
      deterministicScore:row.score,
      deterministicGrade:row.grade
    },
    featureAvailableAt:featureAvailableAt.toISOString(),
    predictionCutoff:predictionCutoff.toISOString(),
    label:positive?1:0,
    labelObservedAt:labelObservedAt.toISOString(),
    provenance:{source:'synthetic_csv_distribution_test',synthetic:true,eventTime:featureAvailableAt.toISOString()}
  }
})
await mkdir(dirname(resolve(output)),{recursive:true})
await writeFile(output,JSON.stringify(report,null,2),'utf8')
await mkdir(dirname(resolve(uploadOutput)),{recursive:true})
await writeFile(uploadOutput,JSON.stringify(uploadRows,null,2),'utf8')
console.log(JSON.stringify({...report,sample:undefined},null,2))
if(!report.passed)process.exitCode=1
