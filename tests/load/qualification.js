import http from 'k6/http'
import {check,sleep} from 'k6'
import {Rate,Trend} from 'k6/metrics'

const usefulFailure=new Rate('useful_failure')
const boundedLatency=new Trend('bounded_latency',true)

const targetRate=Number(__ENV.TARGET_RPS||4000)
const duration=__ENV.TEST_DURATION||'5m'
const preAllocated=Math.max(50,Number(__ENV.PREALLOCATED_VUS||500))
const maxVus=Math.max(preAllocated,Number(__ENV.MAX_VUS||4000))
const base=String(__ENV.BASE_URL||'').replace(/\/$/,'')
const workspace=__ENV.WORKSPACE_ID||'ws_load_qualification'

if(!base)throw new Error('BASE_URL is required')

export const options={
  scenarios:{
    qualification:{
      executor:'constant-arrival-rate',
      rate:targetRate,
      timeUnit:'1s',
      duration,
      preAllocatedVUs:preAllocated,
      maxVUs
    }
  },
  thresholds:{
    http_req_failed:['rate<0.001'],
    useful_failure:['rate<0.001'],
    http_req_duration:['p(95)<500','p(99)<1000']
  }
}

const plan=[
  {weight:70,kind:'read'},
  {weight:20,kind:'write'},
  {weight:5,kind:'metadata'},
  {weight:5,kind:'async'}
]

const pick=()=>{
  const value=Math.random()*100
  let cursor=0
  for(const item of plan){
    cursor+=item.weight
    if(value<cursor)return item.kind
  }
  return 'read'
}

const headers=index=>({
  'Content-Type':'application/json',
  'Accept':'application/json',
  'X-Workspace-ID':workspace,
  'X-Request-ID':`k6-${__VU}-${__ITER}-${index}`
})

export default function(){
  const kind=pick()
  let response

  if(kind==='read'){
    response=http.get(base+'/api/dashboard-summary',{headers:headers('read')})
  }else if(kind==='metadata'){
    response=http.get(base+'/api/forms?limit=25',{headers:headers('metadata')})
  }else if(kind==='write'){
    response=http.post(base+'/api/forms',JSON.stringify({
      name:`Load Form ${__VU}-${__ITER}`,
      slug:`load-${__VU}-${__ITER}-${Date.now()}`,
      description:'qualification write',
      schema:{fields:[{key:'email',type:'email',label:'Email',required:true}]}
    }),{headers:headers('write')})
  }else{
    response=http.post(base+'/api/diagnostics/replay',JSON.stringify({
      issue:`load-${__VU}-${__ITER}`
    }),{headers:headers('async')})
  }

  boundedLatency.add(response.timings.duration,{kind})
  const accepted=response.status>=200&&response.status<300
  usefulFailure.add(!accepted,{kind,status:String(response.status)})
  check(response,{[kind+' accepted']:()=>accepted})
  sleep(Number(__ENV.THINK_TIME_SECONDS||0))
}
