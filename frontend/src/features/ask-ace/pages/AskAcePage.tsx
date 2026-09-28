import {useEffect,useRef,useState} from 'react'
import {Activity,ArrowRight,Check,Network,ShieldCheck,Sparkles} from 'lucide-react'
import {
  askAceApi,
  type AskAceInsight,
  type AskAceJourneyEvent,
  type AskAceResponse
} from '../data/ask-ace.api'
import {ErrorState} from '../../../components/system/FrontendStates'

function PageHead({crumb,title,sub}:{crumb:string,title:string,sub:string}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div></div>
}

const MAX_MESSAGES=100
const MAX_JOURNEY_EVENTS=100

type AssistantMessage={
  role:'assistant'
  text:string
  confidence?:string
  intent?:string
  insights?:AskAceInsight[]
  followUps?:string[]
  journey?:AskAceResponse['journey']
  journeyTimeline?:AskAceJourneyEvent[]
  generatedAt?:string
  evidenceIds?:string[]
  warnings?:string[]
  engine?:string
}

type UserMessage={role:'user';text:string}
type ChatMessage=AssistantMessage|UserMessage

const displayConfidence=(value?:string)=>{
  if(!value)return null
  if(value==='grounded')return 'Grounded workspace analysis'
  if(value==='unavailable')return 'Analysis unavailable'
  return value.replaceAll('_',' ')+' confidence'
}

export default function AskAcePage(){
  const starters=[
    'Where is the funnel dropping between lead and revenue?',
    'Which campaign is producing the best-quality leads?',
    'Show the journey for a specific lead or customer',
    'How much matched revenue is currently attributed?',
    'Where is attribution breaking?',
    'Which audience should we suppress?',
    'Are any connectors or activation runs unhealthy?'
  ]
  const [messages,setMessages]=useState<ChatMessage[]>([
    {
      role:'assistant',
      text:'Ask me about journeys, attribution, lead quality, campaign performance, audiences, or signal health. I will only answer from data available in this workspace.',
      confidence:'grounded',
      engine:'deterministic_workspace_baseline'
    }
  ])
  const [q,setQ]=useState('')
  const [busy,setBusy]=useState(false)
  const [requestError,setRequestError]=useState('')
  const activeRequest=useRef<AbortController|null>(null)

  useEffect(()=>()=>activeRequest.current?.abort('ask_ace_feature_unmounted'),[])

  const append=(message:ChatMessage)=>setMessages(current=>[...current,message].slice(-MAX_MESSAGES))

  const ask=async(question?:string)=>{
    const text=(question||q).trim()
    if(!text||busy)return

    const controller=new AbortController()
    activeRequest.current?.abort('superseded_ask_ace_request')
    activeRequest.current=controller

    append({role:'user',text})
    setQ('')
    setBusy(true)
    setRequestError('')

    try{
      const response=await askAceApi.ask(text,{signal:controller.signal})
      append({
        role:'assistant',
        text:response.answer,
        insights:Array.isArray(response.insights)?response.insights.slice(0,20):[],
        confidence:response.confidence,
        intent:response.intent,
        followUps:Array.isArray(response.followUps)?response.followUps.slice(0,8):[],
        journey:response.journey,
        journeyTimeline:Array.isArray(response.journeyTimeline)?response.journeyTimeline.slice(0,MAX_JOURNEY_EVENTS):[],
        generatedAt:response.generatedAt,
        evidenceIds:Array.isArray(response.evidenceIds)?response.evidenceIds:[],
        warnings:Array.isArray(response.warnings)?response.warnings:[],
        engine:response.engine
      })
    }catch(error:any){
      if(String(error?.details?.cause||'')==='aborted')return
      const message=error?.message
        ?'Grounded analysis is temporarily unavailable: '+error.message
        :'The grounded analysis API is unavailable. Check the API process, workspace access, and data connections before retrying.'
      setRequestError(message)
      append({role:'assistant',text:message,confidence:'unavailable'})
    }finally{
      if(activeRequest.current===controller)activeRequest.current=null
      setBusy(false)
    }
  }

  return <>
    <PageHead crumb="AI / Ask Ace" title="Journey & attribution assistant" sub="Ask natural-language questions over stitched workspace data. Answers include confidence and the evidence used."/>

    {requestError&&
      <ErrorState
        title="Grounded analysis unavailable"
        description={requestError}
        action={q.trim()?{label:'Retry question',onClick:()=>void ask()}:undefined}
      />
    }

    <div className="ask-ace-layout">
      <div className="app-panel ask-chat">
        <div className="ask-starters" aria-label="Suggested Ask Ace questions">
          {starters.map(item=><button key={item} onClick={()=>void ask(item)} disabled={busy}>{item}</button>)}
        </div>

        <div className="ask-messages" aria-live="polite" aria-busy={busy?'true':undefined}>
          {messages.map((message,index)=><div key={index} className={'ask-msg '+message.role}>
            <span>{message.role==='assistant'?<Sparkles/>:'S'}</span>
            <div>
              {message.role==='assistant'&&<div className="ask-answer-meta">
                {message.confidence&&<em className={'ask-confidence '+message.confidence}>{displayConfidence(message.confidence)}</em>}
                {message.intent&&<small>{String(message.intent).replaceAll('_',' ')}</small>}
                {message.engine&&<small>{message.engine.replaceAll('_',' ')}</small>}
              </div>}
              <p>{message.text}</p>

              {message.role==='assistant'&&message.insights?.length?(
                <div className="ask-insights">
                  {message.insights.map(item=><article key={item.label+':'+String(item.evidenceId||item.source||'')}>
                    <span>{item.label}</span>
                    <b>{item.value}</b>
                    {item.note&&<small>{item.note}</small>}
                    {(item.kind||item.source)&&<em>{[item.kind?.replaceAll('_',' '),item.source].filter(Boolean).join(' · ')}</em>}
                  </article>)}
                </div>
              ):null}

              {message.role==='assistant'&&message.journeyTimeline?.length?(
                <div className="ask-journey">
                  <div className="ask-journey-head"><Network/><div><b>{message.journey?.name||'Customer journey'}</b><small>{message.journey?.source||'First-party'}{message.journey?.campaign?' · '+message.journey.campaign:''} · {message.journeyTimeline.length} touchpoints</small></div></div>
                  {message.journeyTimeline.map((item,i)=><div className="ask-journey-event" key={(item.type||'event')+':'+(item.at||i)+':'+i}><span>{i+1}</span><div><b>{item.title}</b><small>{item.source||'Workspace evidence'} · {item.at?new Date(item.at).toLocaleString():'—'}</small><p>{item.detail||'Persisted activity'}</p></div></div>)}
                </div>
              ):null}

              {message.role==='assistant'&&message.evidenceIds?.length?(
                <div className="source-conflict-note"><ShieldCheck/><div><b>Evidence references</b><p>{message.evidenceIds.join(', ')}</p></div></div>
              ):null}

              {message.role==='assistant'&&message.warnings?.length?(
                <div className="source-conflict-note"><ShieldCheck/><div><b>Analysis limitations</b><p>{message.warnings.join(' ')}</p></div></div>
              ):null}

              {message.role==='assistant'&&message.followUps?.length?(
                <div className="ask-followups">{message.followUps.map(item=><button key={item} onClick={()=>void ask(item)} disabled={busy}>{item}</button>)}</div>
              ):null}
            </div>
          </div>)}
          {busy&&<div className="ask-msg assistant"><span><Activity/></span><div><p>Reading grounded workspace evidence…</p></div></div>}
        </div>

        <div className="ask-input">
          <input aria-label="Ask Ace question" value={q} onChange={event=>setQ(event.target.value)} onKeyDown={event=>{if(event.key==='Enter')void ask()}} placeholder="Ask about revenue, leads, campaigns, audiences or signal health..." disabled={busy}/>
          <button aria-label="Send Ask Ace question" onClick={()=>void ask()} disabled={busy||!q.trim()}>{busy?<Activity/>:<ArrowRight/>}</button>
        </div>
      </div>

      <div className="app-panel ask-context">
        <div className="panel-head"><div><h3>Grounded analysis context</h3><p>Ask Ace queries live workspace stores rather than fixed demo metrics</p></div><span className="healthy">Evidence-backed</span></div>
        {[['Funnel handoffs','Lead, routing, qualification, meeting and feedback coverage'],['Lead operations','Scores, grades, source and campaign quality'],['Attribution store','Matched/unmatched assisted events and value'],['Connector state','Connection and health records'],['Audience store','Activation, suppression and sync state'],['Activation runs','Succeeded, failed and queued external actions'],['Observability','Current API and operational health']].map(item=><div className="ask-context-row" key={item[0]}><Check/><div><b>{item[0]}</b><small>{item[1]}</small></div></div>)}
        <div className="source-conflict-note"><ShieldCheck/><div><b>Current baseline boundary</b><p>Ask Ace remains a grounded workspace-analysis baseline. Hosted analyst/reviewer models will not be presented as active until the backend registry, provider access, evaluation and policy gates provide real evidence.</p></div></div>
      </div>
    </div>
  </>
}
