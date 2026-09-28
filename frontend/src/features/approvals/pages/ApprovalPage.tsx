import {useEffect,useState} from 'react'
import {
  Activity,Check,CheckCircle2,ChevronRight,ShieldCheck,Sparkles,X
} from 'lucide-react'
import {approvalsApi} from '../data/approvals.api'
import {EmptyState,ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'

function ApprovalPageHead({
  crumb,
  title,
  sub,
  action,
  onAction
}:{
  crumb:string
  title:string
  sub:string
  action?:string
  onAction?:()=>void
}){
  return <div className="page-head">
    <div>
      <span>{crumb}</span>
      <h1 tabIndex={-1}>{title}</h1>
      <p>{sub}</p>
    </div>
    {action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}
  </div>
}

function ApprovalStat({
  label,
  value,
  sub,
  Icon
}:{
  label:string
  value:string
  sub:string
  Icon:any
}){
  return <article className="stat">
    <div><span>{label}</span><Icon/></div>
    <strong>{value}</strong>
    <small>{sub}</small>
  </article>
}

export default function ApprovalPage(){
  const [items,setItems]=useState<any[]>([])
  const [selected,setSelected]=useState('')
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [decisionState,setDecisionState]=useState(()=>initialMutationLifecycle<any>())

  const load=async()=>{
    setLoading(true)
    setLoadError('')
    try{
      const response:any=await approvalsApi.list()
      const list=response.items||[]
      setItems(list)
      if(list.length){
        setSelected((current:string)=>current&&list.some((item:any)=>item.id===current)?current:list[0].id)
      }else{
        setSelected('')
      }
    }catch(error:any){
      setLoadError(error?.message||'Approval queue could not be loaded. Existing decisions were preserved.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])

  const current=items.find(item=>item.id===selected)
  const busy=decisionState.phase==='VALIDATING'||decisionState.phase==='SUBMITTING'

  const decide=async(decision:'approved'|'rejected')=>{
    if(!current||busy)return
    let lifecycle=mutationLifecycle.validating(decisionState)
    setDecisionState(lifecycle)
    setNotice({kind:'',text:''})
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setDecisionState(lifecycle)

    try{
      const response:any=await approvalsApi.decide(current.id,decision)
      const confirmed=String(response?.item?.status||response?.status||'').toLowerCase()
      if(confirmed!==decision)throw new Error('Backend did not confirm the approval decision.')
      setDecisionState(mutationLifecycle.confirmed(lifecycle,response))
      setNotice({
        kind:'ok',
        text:decision==='approved'
          ?'Approval confirmed and persisted.'
          :'Rejection confirmed and persisted.'
      })
      await load()
    }catch(error:any){
      const requestId=error?.requestId||null
      const cause=String(error?.details?.cause||'')
      if(cause==='timeout'||cause==='network'){
        const message='Backend confirmation was not received. The outcome may be unknown. Refresh the approval queue before repeating this decision.'
        setDecisionState(mutationLifecycle.unknown(lifecycle,message,requestId))
        setNotice({kind:'unknown',text:message})
      }else if(Number(error?.status)===409){
        const message=error?.message||'This approval changed elsewhere. Refresh before deciding again.'
        setDecisionState(mutationLifecycle.conflict(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }else{
        const message=error?.message||'Approval decision was rejected or could not be confirmed.'
        setDecisionState(mutationLifecycle.rejected(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }
    }
  }

  const pending=items.filter(item=>item.status==='pending').length
  const approved=items.filter(item=>item.status==='approved').length
  const rejected=items.filter(item=>item.status==='rejected').length
  const operationLabel=decisionState.operationId?' Operation '+decisionState.operationId.slice(0,8)+'.':''

  return <>
    <ApprovalPageHead
      crumb="Governance / Approvals"
      title="Human approval center"
      sub="Review sensitive agent actions before customer contact, spend-impacting changes or external mutations."
      action={loading?'Refreshing…':'Refresh approvals'}
      onAction={load}
    />

    {notice.text&&notice.kind==='unknown'&&
      <StaleState
        title="Approval outcome needs reconciliation"
        description={notice.text+operationLabel}
        action={{label:'Refresh before retrying',onClick:load}}
      />
    }

    {notice.text&&notice.kind!=='unknown'&&
      <div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>
        {notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}
        <span>{notice.text}</span>
      </div>
    }

    {loadError&&
      <ErrorState
        title="Approval queue could not refresh"
        description={loadError}
        action={{label:'Retry refresh',onClick:load}}
      />
    }

    <div className="stats-grid">
      <ApprovalStat label="Pending" value={loading&&!items.length?'—':String(pending)} sub="Awaiting human decision" Icon={CheckCircle2}/>
      <ApprovalStat label="Approved" value={loading&&!items.length?'—':String(approved)} sub="Persisted approval decisions" Icon={ShieldCheck}/>
      <ApprovalStat label="Rejected" value={loading&&!items.length?'—':String(rejected)} sub="Blocked by human review" Icon={X}/>
      <ApprovalStat label="Total requests" value={loading&&!items.length?'—':String(items.length)} sub="Current retained approval history" Icon={Activity}/>
    </div>

    <div className="approval-layout">
      <div className="app-panel approval-list">
        <div className="panel-head">
          <div><h3>Approval queue</h3><p>Persisted agent and automation requests</p></div>
          <button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button>
        </div>

        {loading&&!items.length
          ?<LoadingState compact title="Loading approval queue" description="Reading persisted human-review requests."/>
          :items.length
            ?items.map((item:any)=>
              <button key={item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}>
                <ShieldCheck/>
                <div>
                  <b>{item.title||item.subject||item.kind}</b>
                  <small>{item.kind||item.agent||'Automation'} · {item.risk||'risk not set'}</small>
                </div>
                <span className={String(item.status||'pending').toLowerCase()}>{item.status}</span>
                <ChevronRight/>
              </button>
            )
            :<EmptyState compact title="No approval requests" description="Sensitive actions that require human approval will appear here."/>
        }
      </div>

      <div className="app-panel approval-detail">
        {current
          ?<>
            <div className="panel-head">
              <div><h3>{current.title||current.subject||current.kind}</h3><p>{current.detail||current.kind||'Automation request'}</p></div>
              <span className={String(current.status||'pending').toLowerCase()}>{current.status}</span>
            </div>
            <div className="site-detail-grid">
              {[
                ['Request ID',current.id],
                ['Kind',current.kind||'—'],
                ['Risk',current.risk||'—'],
                ['Agent',current.agentId||current.agent||'—'],
                ['Created',current.createdAt?new Date(current.createdAt).toLocaleString():'—'],
                ['Status',current.status||'pending']
              ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></div>)}
            </div>
            {current.status==='pending'
              ?<div className="approval-actions">
                <button disabled={busy} onClick={()=>decide('rejected')}>{busy?'Working…':'Reject'}</button>
                <button className="approve" disabled={busy} onClick={()=>decide('approved')}><Check/>{busy?'Working…':'Approve'}</button>
              </div>
              :<div className={'approval-final '+current.status}><Check/><b>{current.status}</b></div>
            }
          </>
          :<EmptyState compact title="No approval selected" description="Choose a request from the queue to review its authoritative state."/>
        }
      </div>
    </div>
  </>
}
