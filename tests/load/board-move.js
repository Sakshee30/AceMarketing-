import http from 'k6/http'
import exec from 'k6/execution'
import {check,sleep} from 'k6'

const baseUrl=__ENV.BASE_URL||'http://127.0.0.1:3001'
const workspaceId=__ENV.WORKSPACE_ID||''
const boardId=__ENV.BOARD_ID||''
const itemId=__ENV.ITEM_ID||''
const destinationColumnId=__ENV.DESTINATION_COLUMN_ID||''
const token=__ENV.AUTH_TOKEN||''

export const options={
  scenarios:{
    board_reads:{executor:'constant-arrival-rate',rate:Number(__ENV.BOARD_READ_RPS||20),timeUnit:'1s',duration:__ENV.DURATION||'30s',preAllocatedVUs:10,maxVUs:100,exec:'readBoard'},
    board_move_conflicts:{executor:'per-vu-iterations',vus:Number(__ENV.BOARD_MOVE_VUS||2),iterations:1,maxDuration:'30s',exec:'moveBoard'}
  },
  thresholds:{http_req_failed:['rate<0.05'],http_req_duration:['p(95)<1000']}
}

const headers=()=>({
  'Content-Type':'application/json',
  'X-Workspace-ID':workspaceId,
  ...(token?{Authorization:'Bearer '+token}:{})
})

export function readBoard(){
  if(!workspaceId||!boardId){
    exec.test.abort('WORKSPACE_ID and BOARD_ID are required')
    return
  }
  const res=http.get(baseUrl+'/api/boards/'+encodeURIComponent(boardId),{headers:headers()})
  check(res,{'board read succeeds':r=>r.status===200})
  sleep(0.01)
}

export function moveBoard(){
  if(!workspaceId||!boardId||!itemId||!destinationColumnId){
    exec.test.abort('WORKSPACE_ID, BOARD_ID, ITEM_ID and DESTINATION_COLUMN_ID are required')
    return
  }
  const operationId='k6_'+__VU+'_'+Date.now()
  const res=http.post(
    baseUrl+'/api/boards/'+encodeURIComponent(boardId)+'/moves',
    JSON.stringify({
      operationId,
      itemId,
      expectedItemVersion:Number(__ENV.EXPECTED_ITEM_VERSION||1),
      expectedPolicyVersion:Number(__ENV.EXPECTED_POLICY_VERSION||1),
      destinationColumnId,
      placement:{mode:'bottom'},
      reason:'board concurrency qualification'
    }),
    {headers:headers()}
  )
  check(res,{'move confirms or conflicts safely':r=>[200,409].includes(r.status)})
}

export default readBoard
