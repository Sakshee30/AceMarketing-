import {useEffect,useState} from 'react'
import {ArrowRight,BarChart3,CheckCircle2,ShieldCheck,Sparkles} from 'lucide-react'
import {plannerApi} from '../data/planner.api'
import {StaleState} from '../../../components/system/FrontendStates'
import {initialMutationLifecycle,mutationLifecycle} from '../../../lib/mutation-lifecycle'
import {useDirtyWork} from '../../../lib/dirty-work'

function PageHead({crumb,title,sub,action,onAction}:{crumb:string;title:string;sub:string;action?:string;onAction?:()=>void}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div>{action&&<button className="app-primary" onClick={onAction}><Sparkles/>{action}</button>}</div>
}

export default function PlannerPage(){
  const [budget,setBudget]=useState(2500000)
  const [data,setData]=useState<any>({available:false,channels:[],evidence:{},savedScenarios:[]})
  const [compare,setCompare]=useState(false)
  const [notice,setNotice]=useState<{kind:'ok'|'error'|'unknown'|'',text:string}>({kind:'',text:''})
  const [saving,setSaving]=useState(false)
  const [savedBudget,setSavedBudget]=useState(2500000)
  const [saveState,setSaveState]=useState(()=>initialMutationLifecycle<any>())

  useDirtyWork({key:'planner-scenario',label:'Planner scenario',dirty:budget!==savedBudget,scope:'feature'})

  const load=async()=>{
    try{
      const response:any=await plannerApi.load()
      setData(response)
    }catch(error:any){
      setNotice({kind:'error',text:error?.message||'Planner evidence could not be loaded. Existing planner state was preserved.'})
    }
  }

  useEffect(()=>{void load()},[])

  const channels=data.channels||[]
  const totalShare=channels.reduce((total:number,item:any)=>total+Number(item.share||0),0)||1
  const normalized=channels.map((item:any)=>({...item,share:Number((Number(item.share||0)/totalShare*100).toFixed(1))}))
  const projected=normalized.reduce((sum:number,item:any)=>sum+(budget*(item.share/100)),0)

  const save=async()=>{
    if(!normalized.length)return
    let lifecycle=mutationLifecycle.validating(saveState)
    setSaveState(lifecycle)
    lifecycle=mutationLifecycle.submitting(lifecycle)
    setSaveState(lifecycle)
    setSaving(true)
    setNotice({kind:'',text:''})

    try{
      const response:any=await plannerApi.saveScenario({
        name:'Scenario '+new Date().toLocaleDateString(),
        budget,
        allocations:normalized.map((item:any)=>({source:item.name,share:item.share,evidence:item.evidence}))
      })
      setSaveState(mutationLifecycle.confirmed(lifecycle,response))
      setSavedBudget(budget)
      setNotice({kind:'ok',text:'Scenario saved and confirmed: '+String(response.id||'persisted')+'.'})
      await load()
    }catch(error:any){
      const cause=String(error?.details?.cause||'')
      const requestId=error?.requestId||null
      if(cause==='timeout'||cause==='network'){
        const message='The backend did not confirm whether this planning scenario was saved. Refresh saved scenarios before submitting the same plan again.'
        setSaveState(mutationLifecycle.unknown(lifecycle,message,requestId))
        setNotice({kind:'unknown',text:message})
      }else if(Number(error?.status)===409){
        const message=error?.message||'Planner evidence changed before the scenario could be confirmed. Refresh before saving again.'
        setSaveState(mutationLifecycle.conflict(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }else{
        const message=error?.message||'Scenario could not be saved.'
        setSaveState(mutationLifecycle.rejected(lifecycle,message,requestId))
        setNotice({kind:'error',text:message})
      }
    }finally{
      setSaving(false)
    }
  }

  const money=(value:any)=>'₹'+Number(value||0).toLocaleString('en-IN',{maximumFractionDigits:0})

  return <>
    <PageHead crumb="Measurement / Planner" title="Strategic media planner" sub="Use persisted cohort, attribution and revenue evidence to build a human-approved budget scenario." action={saving?'Saving…':'Save scenario'} onAction={save}/>

    {notice.text&&notice.kind==='unknown'&&
      <StaleState title="Planner save needs reconciliation" description={notice.text} action={{label:'Refresh scenarios',onClick:load}}/>
    }
    {notice.text&&notice.kind!=='unknown'&&
      <div className={'delivery-notice '+(notice.kind==='error'?'error':'ok')} role={notice.kind==='error'?'alert':'status'}>
        {notice.kind==='error'?<ShieldCheck/>:<CheckCircle2/>}
        <span>{notice.text}</span>
      </div>
    }

    <div className="planner-budget">
      <div><span>Monthly media budget</span><strong>₹{(budget/100000).toFixed(1)}L</strong></div>
      <input type="range" min="100000" max="10000000" step="100000" value={budget} onChange={event=>setBudget(Number(event.target.value))}/>
      <small>Scenario total: ₹{(projected/100000).toFixed(1)}L</small>
    </div>

    <div className="app-panel">
      <div className="panel-head">
        <div><h3>Evidence-based allocation</h3><p>{data.available?data.notice:'Waiting for source-level cohort evidence'}</p></div>
        <button onClick={()=>setCompare(current=>!current)} disabled={!data.available}>{compare?'Hide evidence':'Show evidence'}</button>
      </div>
      {normalized.length
        ?normalized.map((item:any)=>
          <div className="planner-row" key={item.name}>
            <div><b>{item.name}</b><small>{item.evidence==='revenue_contribution'?'Attributed revenue contribution':'Acquisition-volume contribution'}</small></div>
            <div className="progress"><i style={{width:item.share+'%'}}/></div>
            <strong>{item.share}%</strong>
            <span>₹{((budget*item.share/100)/100000).toFixed(1)}L</span>
            <em>{Number(item.conversionRate||0).toFixed(1)}% conversion</em>
            <small>{money(item.revenue)} attributed revenue</small>
          </div>
        )
        :<div className="empty-delivery-state"><BarChart3/><div><b>Not enough evidence for a recommendation</b><small>Connect acquisition sources and record matched conversion/revenue events. AceMarketing will not invent CAC, quality scores or channel shares.</small></div></div>
      }
      {compare&&data.available&&
        <div className="source-conflict-note">
          <BarChart3/>
          <div><b>Planning evidence</b><p>{data.evidence?.totalRevenue>0?'Weights use attributed revenue contribution from the last '+(data.evidence?.months||6)+' months.':'No attributed revenue is available, so weights use observed acquisition volume only.'}</p></div>
        </div>
      }
    </div>

    <div className="two-col">
      <div className="app-panel">
        <div className="panel-head"><div><h3>Evidence boundary</h3><p>What is and is not used</p></div></div>
        {[
          ['Acquisition source','Persisted click/cohort source'],
          ['Conversions','Configured conversion events'],
          ['Revenue','Matched assisted-event value'],
          ['Spend / CAC','Not inferred without connected spend data'],
          ['Approval','Human-controlled scenario save']
        ].map(row=><div className="mapping-rule" key={row[0]}><span>{row[0]}</span><ArrowRight/><b>{row[1]}</b></div>)}
      </div>

      <div className="app-panel">
        <div className="panel-head"><div><h3>Scenario summary</h3><p>Current allocation only</p></div></div>
        <div className="report-summary-grid">
          {[
            ['Budget',money(budget)],
            ['Sources',String(normalized.length)],
            ['Observed acquired',Number(data.evidence?.totalAcquired||0).toLocaleString('en-IN')],
            ['Observed attributed revenue',money(data.evidence?.totalRevenue||0)],
            ['Allocation basis',data.evidence?.totalRevenue>0?'Revenue contribution':'Acquisition volume'],
            ['Saved scenarios',String((data.savedScenarios||[]).length)]
          ].map(row=><div key={row[0]}><span>{row[0]}</span><b>{row[1]}</b></div>)}
        </div>
        <div className="ai-note"><Sparkles/><div><b>Planner boundary</b><p>This planner is advisory. It does not change ad-platform budgets automatically; saved scenarios remain human-approved planning records.</p></div></div>
      </div>
    </div>

    <div className="app-panel">
      <div className="panel-head"><div><h3>Saved scenarios</h3><p>Persisted human planning decisions</p></div></div>
      {(data.savedScenarios||[]).length
        ?(data.savedScenarios||[]).slice(0,8).map((item:any)=>
          <div className="planning-decision-row" key={item.id}><CheckCircle2/><div><b>{item.name}</b><small>{item.createdAt?new Date(item.createdAt).toLocaleString():'—'}</small></div><strong>{money(item.budget)}</strong></div>
        )
        :<div className="empty-delivery-state"><BarChart3/><div><b>No saved scenarios yet</b><small>Save a scenario after enough source evidence is available.</small></div></div>
      }
    </div>
  </>
}
