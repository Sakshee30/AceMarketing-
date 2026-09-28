import {useState} from 'react'
import {Activity,ArrowRight,Check,Network,ShieldCheck,Sparkles} from 'lucide-react'
import {askAceApi} from '../data/ask-ace.api'

function PageHead({crumb,title,sub}:{crumb:string,title:string,sub:string}){
  return <div className="page-head"><div><span>{crumb}</span><h1 tabIndex={-1}>{title}</h1><p>{sub}</p></div></div>
}

const MAX_MESSAGES=100
const MAX_JOURNEY_EVENTS=100

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
  const [messages,setMessages]=useState<any[]>([{role:'assistant',text:'Ask me about journeys, attribution, lead quality, campaign performance, audiences, or signal health. I will only answer from data available in this workspace.',confidence:'grounded'}])
  const [q,setQ]=useState('')
  const [busy,setBusy]=useState(false)

  const append=(message:any)=>setMessages(current=>[...current,message].slice(-MAX_MESSAGES))

  const ask=async(question?:string)=>{
    const text=(question||q).trim()
    if(!text||busy)return
    append({role:'user',text})
    setQ('')
    setBusy(true)
    try{
      const response:any=await askAceApi.ask(text)
      append({
        role:'assistant',
        text:response.answer,
        insights:response.insights,
        confidence:response.confidence,
        intent:response.intent,
        followUps:response.followUps,
        journey:response.journey,
        journeyTimeline:Array.isArray(response.journeyTimeline)?response.journeyTimeline.slice(0,MAX_JOURNEY_EVENTS):[],
        generatedAt:response.generatedAt
      })
    }catch(error:any){
      append({
        role:'assistant',
        text:error?.message
          ?'Grounded analysis is temporarily unavailable: '+error.message
          :'The grounded analysis API is unavailable. Check the API process, workspace access, and data connections before retrying.',
        confidence:'unavailable'
      })
    }finally{
      setBusy(false)
    }
  }

  return <>
    <PageHead crumb="AI / Ask Ace" title="Journey & attribution assistant" sub="Ask natural-language questions over stitched workspace data. Answers include confidence and the evidence used."/>

    <div className="ask-ace-layout">
      <div className="app-panel ask-chat">
        <div className="ask-starters" aria-label="Suggested Ask Ace questions">
          {starters.map(item=><button key={item} onClick={()=>void ask(item)} disabled={busy}>{item}</button>)}
        </div>

        <div className="ask-messages" aria-live="polite" aria-busy={busy?'true':undefined}>
          {messages.map((message,index)=><div key={index} className={'ask-msg '+message.role}>
            <span>{message.role==='assistant'?<Sparkles/>:'S'}</span>
            <div>
              <div className="ask-answer-meta">
                {message.role==='assistant'&&message.confidence&&<em className={'ask-confidence '+message.confidence}>{message.confidence==='grounded'?'Grounded workspace analysis':message.confidence+' confidence'}</em>}
                {message.intent&&<small>{String(message.intent).replaceAll('_',' ')}</small>}
              </div>
              <p>{message.text}</p>

              {message.insights&&<div className="ask-insights">{message.insights.slice(0,20).map((item:any)=><article key={item.label}><span>{item.label}</span><b>{item.value}</b><small>{item.note}</small>{item.source&&<em>{item.source}</em>}</article>)}</div>}

              {message.journeyTimeline?.length>0&&<div className="ask-journey">
                <div className="ask-journey-head"><Network/><div><b>{message.journey?.name||'Customer journey'}</b><small>{message.journey?.source||'First-party'}{message.journey?.campaign?' · '+message.journey.campaign:''} · {message.journeyTimeline.length} touchpoints</small></div></div>
                {message.journeyTimeline.map((item:any,i:number)=><div className="ask-journey-event" key={(item.type||'event')+':'+(item.at||i)+':'+i}><span>{i+1}</span><div><b>{item.title}</b><small>{item.source} · {item.at?new Date(item.at).toLocaleString():'—'}</small><p>{item.detail||'Persisted activity'}</p></div></div>)}
              </div>}

              {message.followUps?.length>0&&<div className="ask-followups">{message.followUps.slice(0,8).map((item:string)=><button key={item} onClick={()=>void ask(item)} disabled={busy}>{item}</button>)}</div>}
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
        <div className="source-conflict-note"><ShieldCheck/><div><b>No fabricated metrics</b><p>If a workspace does not have enough connected data, Ask Ace reports that limitation instead of substituting sample numbers.</p></div></div>
      </div>
    </div>
  </>
}
