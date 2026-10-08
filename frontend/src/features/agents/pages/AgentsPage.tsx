import {useEffect,useState} from 'react'
import {beginLoading,useDevelopmentLiveRefresh} from '../../../lib/development-live-refresh'
import {Activity,ArrowRight,Bot,Check,CheckCircle2,ChevronRight,Layers3,Plus,ShieldCheck,X,Zap} from 'lucide-react'
import {agentsApi} from '../data/agents.api'
import {AccessibleDialog} from '../../../components/system/AccessibleDialog'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'
import {useDirtyWork} from '../../../lib/dirty-work'

type Notice={kind:'ok'|'error'|'unknown'|'',text:string}

function PageHead({crumb,title,sub,action,onAction,disabled=false}:{crumb:string,title:string,sub:string,action?:string,onAction?:()=>void,disabled?:boolean}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" disabled={disabled} onClick={onAction}><Plus/>{action}</button>}</div>
}
function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){
  return <article className="stat"><div><span>{label}</span><Icon/></div><strong>{value}</strong><small>{sub}</small></article>
}
const isUnknownOutcome=(error:any)=>['timeout','network'].includes(String(error?.details?.cause||''))

export default function AgentsPage(){
  const [data,setData]=useState<any>({items:[],runs:[],configured:0,custom:0})
  const [selected,setSelected]=useState('')
  const [builder,setBuilder]=useState(false)
  const [triggerOpen,setTriggerOpen]=useState(false)
  const [trigger,setTrigger]=useState('Lead becomes qualified')
  const [busy,setBusy]=useState('')
  const [notice,setNotice]=useState<Notice>({kind:'',text:''})
  const [loading,setLoading]=useState(true)
  const [loadError,setLoadError]=useState('')
  const [testOpen,setTestOpen]=useState(false)
  const [testResult,setTestResult]=useState<any>(null)
  const [testDraft,setTestDraft]=useState({leadRef:'agent_test_lead',score:'88',source:'Website',destination:'Sales queue'})

  useDirtyWork({key:'custom-agent-draft',label:'Custom agent draft',dirty:builder,scope:'feature'})
  useDirtyWork({key:'custom-agent-test-draft',label:'Custom agent test draft',dirty:testOpen,scope:'feature'})

  const load=async()=>{
    beginLoading(setLoading)
    setLoadError('')
    try{
      const response:any=await agentsApi.load()
      setData(response)
      if(response.items?.length){
        setSelected((current:string)=>current&&response.items.some((item:any)=>item.name===current)?current:response.items[0].name)
      }else{
        setSelected('')
      }
    }catch(error:any){
      setLoadError(error?.message||'Agent operations could not be refreshed. Existing agent state was preserved.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{void load()},[])
 useDevelopmentLiveRefresh(()=>load())

  const items:any[]=data.items||[]
  const runs:any[]=data.runs||[]
  const current=items.find((item:any)=>item.name===selected)||items[0]

  const openOperation=()=>{
    if(current?.operationTab)window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:current.operationTab}))
  }
  const goApprovals=()=>window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:'Approvals'}))

  const createCustom=async(event:any)=>{
    event.preventDefault()
    const form=new FormData(event.currentTarget)
    setBusy('create')
    setNotice({kind:'',text:''})
    try{
      const created:any=await agentsApi.create({
        name:String(form.get('name')||''),
        trigger:String(form.get('trigger')||''),
        action:String(form.get('action')||''),
        requiresApproval:String(form.get('approval'))!=='Auto-run low risk'
      })
      setBuilder(false)
      setNotice({
        kind:'ok',
        text:created?.status==='pending_approval'
          ?'Custom agent created and sent to Approvals after backend confirmation.'
          :'Custom agent created and activated after backend confirmation.'
      })
      await load()
      if(created?.name)setSelected(created.name)
    }catch(error:any){
      setNotice(isUnknownOutcome(error)
        ?{kind:'unknown',text:'The custom-agent creation outcome is unknown. Refresh authoritative agent state before creating the same agent again.'}
        :{kind:'error',text:error?.message||'Custom agent could not be created.'})
    }finally{
      setBusy('')
    }
  }

  const testAgent=async()=>{
    if(!current?.id||busy)return
    setBusy('test')
    setNotice({kind:'',text:''})
    setTestResult(null)
    try{
      const result:any=await agentsApi.test({
        id:current.id,
        leadRef:testDraft.leadRef,
        context:{
          score:Number(testDraft.score||0),
          source:testDraft.source,
          destination:testDraft.destination
        }
      })
      setTestResult(result)
      setTestOpen(false)
      setNotice({kind:'ok',text:'Custom agent test completed and persisted as an agent run after backend confirmation.'})
      await load()
    }catch(error:any){
      setNotice(isUnknownOutcome(error)
        ?{kind:'unknown',text:'The agent-test outcome is unknown. Refresh authoritative run history before repeating the same test.'}
        :{kind:'error',text:error?.status===409?(error?.message||'Agent requires approval before it can run.'):(error?.message||'Custom agent test failed.')})
    }finally{
      setBusy('')
    }
  }

  const currentRuns=runs
    .filter((item:any)=>current?.type!=='custom'||String(item.agent_type||item.agentType||'').includes(current.id))
    .slice(0,8)

  return <>
    <PageHead crumb="Automation / Agents" title="Agent operations" sub="Deploy and govern specialist agents using the same stitched customer context." action="Build custom agent" onAction={()=>setBuilder(true)} disabled={busy==='create'}/>

    {loading&&!items.length&&<LoadingState title="Loading agent operations" description="Reading built-in definitions, custom agents and persisted run history."/>}
    {loadError&&<ErrorState title="Agent refresh failed" description={loadError} action={{label:'Retry agents',onClick:()=>void load()}}/>}
    {notice.text&&<div className={'delivery-notice '+(notice.kind==='error'?'error':notice.kind==='unknown'?'warning':'ok')} role={notice.kind==='error'?'alert':'status'}>
      {notice.kind==='ok'?<CheckCircle2/>:<ShieldCheck/>}<span>{notice.text}</span>{notice.kind==='unknown'&&<button type="button" onClick={()=>void load()}>Refresh authoritative state</button>}
    </div>}

    <div className="stats-grid">
      <Stat label="Built-in agents" value={String(items.filter((item:any)=>item.type==='built_in').length)} sub="Current built-in catalog" Icon={Bot}/>
      <Stat label="Configured" value={String(data.configured||0)} sub="Backed by current workspace prerequisites" Icon={CheckCircle2}/>
      <Stat label="Custom agents" value={String(data.custom||0)} sub="Persisted custom definitions" Icon={Layers3}/>
      <Stat label="Recent runs" value={String(runs.length)} sub="Persisted agent execution records" Icon={Activity}/>
    </div>

    <div className="agent-ops-layout">
      <div className="app-panel agent-selector">
        <div className="panel-head"><div><h3>Agent library</h3><p>Built-in and custom agents</p></div><button disabled={loading} onClick={()=>void load()}>{loading?'Refreshing…':'Refresh'}</button></div>
        {items.length?items.map((item:any)=><button key={item.id||item.name} className={selected===item.name?'selected':''} onClick={()=>{setSelected(item.name);setTestResult(null)}}><Bot/><div><b>{item.name}</b><small>{item.type==='custom'?(item.action||'Custom workflow'):'Built-in capability'}</small></div><span className={item.status==='configured'||item.status==='active'?'active-agent':''}>{String(item.status||'available').replaceAll('_',' ')}</span><ChevronRight/></button>):!loading&&<div className="empty-delivery-state"><Bot/><div><b>No agents available</b><small>Configured built-in and custom agents will appear here.</small></div></div>}
      </div>

      <div className="app-panel agent-config">
        {current?<><div className="panel-head"><div><h3>{current.name}</h3><p>{current.type==='custom'?current.description||'Custom workspace agent':current.description||'Built-in AceMarketing agent capability'}</p></div><span className={current.status==='configured'||current.status==='active'?'healthy':'status'}>{String(current.status||'available').replaceAll('_',' ')}</span></div>
          <div className="agent-config-grid"><div><span>Type</span><b>{current.type}</b></div><div><span>Category</span><b>{current.category||'Workspace automation'}</b></div><div><span>Trigger</span><b>{current.trigger||trigger}</b></div><div><span>Approval</span><b>{current.status==='pending_approval'?'Pending approval':current.status==='rejected'?'Rejected':'Workspace governed'}</b></div></div>

          {current.type==='built_in'&&<><div className="agent-section"><h4>Operational prerequisites</h4><div className="scope-list">{(current.prerequisites||['Workspace evidence']).map((item:string)=><span key={item}><Check/>{item}</span>)}</div></div><div className="approval-actions"><button className="approve" onClick={openOperation}><ArrowRight/>{current.action||'Open operation'}</button></div></>}

          {current.type==='custom'&&<><div className="agent-section"><h4>Custom workflow contract</h4><div className="agent-rule"><Zap/><div><b>{current.trigger}</b><p>{current.action}</p></div><button onClick={()=>{setTrigger(current.trigger||trigger);setTriggerOpen(true)}}>View trigger</button></div></div>
            <div className="approval-actions">{current.status==='pending_approval'?<button className="approve" onClick={goApprovals}><ShieldCheck/>Open approval request</button>:current.status==='active'?<button className="approve" onClick={()=>setTestOpen(true)}><Activity/>Test agent</button>:<button disabled>Agent unavailable</button>}</div>
            {testResult&&<div className="agent-test-result"><CheckCircle2/><div><b>Last test succeeded</b><p>{testResult.output?.note}</p>{testResult.output?.operation&&<small>{testResult.output.operation.kind} → {testResult.output.operation.destination} · {testResult.output.operation.status}</small>}</div></div>}
          </>}

          <div className="agent-section"><h4>Recent runs</h4>{currentRuns.length?currentRuns.map((item:any)=><div className="agent-run" key={item.id}><Activity/><div><b>{item.entity_id||item.entityId||'Agent run'}</b><small>{item.agent_type||item.agentType||item.action_type||'agent action'}</small></div><span>{item.created_at||item.createdAt?new Date(item.created_at||item.createdAt).toLocaleString():'—'}</span><em className={String(item.status||'queued').toLowerCase()}>{item.status||'queued'}</em></div>):<div className="empty-delivery-state"><Activity/><div><b>No persisted runs for this agent yet</b></div></div>}</div>
        </>:<div className="empty-delivery-state"><Bot/><div><b>No agent selected</b></div></div>}
      </div>
    </div>

    {builder&&<AccessibleDialog ariaLabel="Custom Agent Builder" onClose={()=>setBuilder(false)}><form className="connector-card custom-agent-builder" onSubmit={createCustom}><div className="connector-modal-head"><div><Bot/><div><b>Custom Agent Builder</b><small>Persist trigger, action and approval boundary</small></div></div><button type="button" aria-label="Close custom agent builder" onClick={()=>setBuilder(false)}><X/></button></div><label>Agent name<input name="name" required placeholder="High Intent Routing Agent"/></label><label>Trigger<select name="trigger"><option>Lead becomes qualified</option><option>Pricing page viewed twice</option><option>WhatsApp conversation starts</option><option>Revenue closes</option></select></label><label>Action<select name="action"><option>Route to sales queue</option><option>Write CRM context</option><option>Return conversion signal</option><option>Suppress audience</option></select></label><label>Approval<select name="approval"><option>Human approval</option><option>Auto-run low risk</option></select></label><div className="source-conflict-note"><ShieldCheck/><div><b>Execution boundary</b><p>Low-risk routing can be tested directly. CRM writes, conversion signals and audience changes still use their dedicated governed destination workflows.</p></div></div><button type="submit" disabled={busy==='create'}>{busy==='create'?'Creating…':'Create agent'}</button></form></AccessibleDialog>}

    {testOpen&&current?.type==='custom'&&<AccessibleDialog ariaLabel="Test custom agent" onClose={()=>setTestOpen(false)}><div className="connector-card custom-agent-test"><div className="connector-modal-head"><div><Activity/><div><b>Test custom agent</b><small>{current.name} · {current.action}</small></div></div><button aria-label="Close custom agent test" onClick={()=>setTestOpen(false)}><X/></button></div><label>Lead / entity reference<input value={testDraft.leadRef} onChange={event=>setTestDraft({...testDraft,leadRef:event.target.value})}/></label><div className="two-col"><label>Lead score<input type="number" value={testDraft.score} onChange={event=>setTestDraft({...testDraft,score:event.target.value})}/></label><label>Source<input value={testDraft.source} onChange={event=>setTestDraft({...testDraft,source:event.target.value})}/></label></div>{current.action==='Route to sales queue'&&<label>Routing destination<input value={testDraft.destination} onChange={event=>setTestDraft({...testDraft,destination:event.target.value})}/></label>}<div className="event-rule-preview"><b>Test behavior</b><span>The backend will create a persisted agent run. Safe routing actions execute a real routing decision; external mutations remain inside their dedicated integration workflow.</span></div><div className="audience-builder-actions"><button onClick={()=>setTestOpen(false)}>Cancel</button><button className="app-primary" disabled={busy==='test'||!testDraft.leadRef.trim()} onClick={()=>void testAgent()}>{busy==='test'?'Running…':'Run test'}</button></div></div></AccessibleDialog>}

    {triggerOpen&&<AccessibleDialog ariaLabel="Agent trigger" onClose={()=>setTriggerOpen(false)}><div className="connector-card"><div className="connector-modal-head"><div><Zap/><div><b>Agent trigger</b><small>{current?.name}</small></div></div><button aria-label="Close agent trigger" onClick={()=>setTriggerOpen(false)}><X/></button></div><div className="setting-line"><span>Trigger</span><b>{trigger}</b></div><button onClick={()=>setTriggerOpen(false)}>Close</button></div></AccessibleDialog>}
  </>
}
