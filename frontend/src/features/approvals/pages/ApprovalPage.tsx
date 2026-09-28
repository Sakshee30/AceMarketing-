import {useEffect,useMemo,useState} from 'react'
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query'
import {Activity,Check,CheckCircle2,ChevronRight,ShieldCheck,Sparkles,X} from 'lucide-react'
import {approvalsApi} from '../data/approvals.api'
import {approvalKeys} from '../data/approvals.keys'
import {EmptyState,ErrorState,LoadingState,StaleState} from '../../../components/system/FrontendStates'
import {classifyMutationFailure,createOperationId,initialMutationLifecycle,mutationLifecycle} from '../../../../../packages/client-core/src/mutation-lifecycle'
import {formatDateTime} from '../../../../../packages/localization/src/index'

function ApprovalPageHead({crumb,title,sub,action,onAction}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head">
    <div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>
    {action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}
  </div>
}

function ApprovalStat({label,value,sub,Icon}:{label:string;value:string;sub:string;Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}

export default function ApprovalPage(){
  const queryClient=useQueryClient()
  const [selected,setSelected]=useState('')
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [decisionState,setDecisionState]=useState(()=>initialMutationLifecycle<any>())

  const queueQuery=useQuery({
    queryKey:approvalKeys.list(),
    queryFn:({signal})=>approvalsApi.list(signal),
    staleTime:15_000,
    refetchInterval:30_000,
    refetchIntervalInBackground:false,
    refetchOnWindowFocus:true
  })

  const items:any[]=((queueQuery.data as any)?.items||[])
  useEffect(()=>{
    if(!items.length){setSelected('');return}
    setSelected(current=>current&&items.some((item:any)=>item.id===current)?current:items[0].id)
  },[queueQuery.data])

  const current=useMemo(()=>items.find(item=>item.id===selected),[items,selected])
  const busy=decisionState.phase==='VALIDATING'||decisionState.phase==='SUBMITTING'

  const decisionMutation=useMutation({
    mutationFn:({approvalId,decision,operationId}:{approvalId:string;decision:'approved'|'rejected';operationId:string})=>
      approvalsApi.decide(approvalId,decision,operationId),
    onSuccess:async(response:any,variables)=>{
      const confirmed=String(response?.item?.status||response?.status||'').toLowerCase()
      if(confirmed!==variables.decision)throw new Error('Backend did not confirm the approval decision.')
      setDecisionState(currentState=>mutationLifecycle.confirmed(currentState,response,response?.requestId||null))
      setNotice({kind:'ok',text:variables.decision==='approved'?'Approval confirmed and persisted.':'Rejection confirmed and persisted.'})
      await queryClient.invalidateQueries({queryKey:approvalKeys.root()})
    },
    onError:(error:any)=>{
      const classified=classifyMutationFailure(error,'Approval decision was rejected or could not be confirmed.')
      setDecisionState(currentState=>{
        if(classified.phase==='OUTCOME_UNKNOWN')return mutationLifecycle.unknown(currentState,classified.message,classified.requestId||null)
        if(classified.phase==='CONFLICT')return mutationLifecycle.conflict(currentState,classified.message,classified.requestId||null)
        return mutationLifecycle.rejected(currentState,classified.message,classified.requestId||null)
      })
      setNotice({kind:classified.phase==='OUTCOME_UNKNOWN'?'unknown':'error',text:classified.message})
    }
  })

  const decide=(decision:'approved'|'rejected')=>{
    if(!current||busy||decisionState.phase==='OUTCOME_UNKNOWN')return
    let lifecycle=mutationLifecycle.validating(decisionState)
    lifecycle=mutationLifecycle.submitting(lifecycle,createOperationId())
    setDecisionState(lifecycle)
    setNotice({kind:'',text:''})
    decisionMutation.mutate({approvalId:current.id,decision,operationId:lifecycle.operationId!})
  }

  const reconcile=async()=>{
    const result:any=await queueQuery.refetch()
    const refreshed=(result.data?.items||[]).find((item:any)=>item.id===selected)
    if(!refreshed){
      setDecisionState(mutationLifecycle.reset())
      setNotice({kind:'error',text:'The approval is no longer present in the current authorized queue.'})
      return
    }
    if(refreshed.status==='approved'||refreshed.status==='rejected'){
      setDecisionState(currentState=>mutationLifecycle.confirmed(currentState,refreshed))
      setNotice({kind:'ok',text:'Authoritative approval state reconciled as '+refreshed.status+'.'})
      return
    }
    setDecisionState(mutationLifecycle.reset())
    setNotice({kind:'',text:''})
  }

  const pending=items.filter(item=>item.status==='pending').length
  const approved=items.filter(item=>item.status==='approved').length
  const rejected=items.filter(item=>item.status==='rejected').length
  const operationLabel=decisionState.operationId?' Operation '+decisionState.operationId.slice(0,8)+'.':''
  const loading=queueQuery.isPending||queueQuery.isFetching

  return <>
    <ApprovalPageHead
      crumb="Governance / Approvals"
      title="Human approval center"
      sub="Review sensitive agent actions before customer contact, spend-impacting changes or external mutations."
      action={loading?'Refreshing…':'Refresh approvals'}
      onAction={()=>void queueQuery.refetch()}
    />

    {notice.text&&notice.kind==='unknown'&&
      <StaleState title="Approval outcome needs reconciliation" description={notice.text+operationLabel} action={{label:'Refresh authoritative state',onClick:()=>void reconcile()}}/>
    }

    {notice.text&&notice.kind!=='unknown'&&
      <div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>
        {notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}<span>{notice.text}</span>
      </div>
    }

    {queueQuery.isError&&
      <ErrorState
        title={queueQuery.data?'Approval queue is showing last confirmed data':'Approval queue could not refresh'}
        description={(queueQuery.error as any)?.message||'Approval queue could not be loaded. Existing decisions were preserved.'}
        action={{label:'Retry refresh',onClick:()=>void queueQuery.refetch()}}
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
          <button disabled={loading} onClick={()=>void queueQuery.refetch()}>{loading?'Refreshing…':'Refresh'}</button>
        </div>

        {loading&&!items.length
          ?<LoadingState compact title="Loading approval queue" description="Reading persisted human-review requests."/>
          :items.length
            ?items.map((item:any)=>
              <button key={item.id} className={selected===item.id?'selected':''} onClick={()=>setSelected(item.id)}>
                <ShieldCheck/>
                <div><b>{item.title||item.subject||item.kind}</b><small>{item.kind||item.agent||'Automation'} · {item.risk||'risk not set'}</small></div>
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
                ['Created',current.createdAt?formatDateTime(current.createdAt):'—'],
                ['Status',current.status||'pending']
              ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{String(row[1])}</b></div>)}
            </div>
            {current.status==='pending'
              ?<div className="approval-actions">
                <button disabled={busy||decisionState.phase==='OUTCOME_UNKNOWN'} onClick={()=>decide('rejected')}>{busy?'Working…':decisionState.phase==='OUTCOME_UNKNOWN'?'Reconcile first':'Reject'}</button>
                <button className="approve" disabled={busy||decisionState.phase==='OUTCOME_UNKNOWN'} onClick={()=>decide('approved')}><Check/>{busy?'Working…':decisionState.phase==='OUTCOME_UNKNOWN'?'Reconcile first':'Approve'}</button>
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
