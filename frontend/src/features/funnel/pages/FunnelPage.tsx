import {useEffect,useRef,useState} from 'react'
import {
  ArrowRight,BarChart3,CircleDollarSign,Filter,MessageCircle,PhoneCall,Sparkles,Target
} from 'lucide-react'
import {funnelApi} from '../data/funnel.api'
import {ErrorState,LoadingState} from '../../../components/system/FrontendStates'

function PageHead({
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

function Stat({label,value,sub,Icon}:{label:string,value:string,sub:string,Icon:any}){
  return <article className="stat">
    <div><span>{label}</span><Icon/></div>
    <strong>{value}</strong>
    <small>{sub}</small>
  </article>
}

export default function FunnelPage(){
  const [data,setData]=useState<any>({stages:{},stageRates:{},campaigns:[],filters:{channels:[],accounts:[]}})
  const [channel,setChannel]=useState('All channels')
  const [account,setAccount]=useState('All accounts')
  const [disposition,setDisposition]=useState('All dispositions')
  const [period,setPeriod]=useState('Last 30 days')
  const [selected,setSelected]=useState('')
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState('')
  const requestSequence=useRef(0)

  const dispositions=['All dispositions','Qualified','Appointments','Consultations','Bookings']
  const periods=['Last 7 days','Last 30 days','Last 90 days']
  const periodDays=period==='Last 7 days'?7:period==='Last 90 days'?90:30

  const load=async()=>{
    const requestId=++requestSequence.current
    setLoading(true)
    setError('')
    try{
      const result:any=await funnelApi.load({channel,account,disposition,periodDays})
      if(requestId!==requestSequence.current)return
      setData(result)
      if(result.campaigns?.length){
        setSelected((current:string)=>
          current&&result.campaigns.some((campaign:any)=>campaign.key===current)
            ?current
            :result.campaigns[0].key
        )
      }else{
        setSelected('')
      }
    }catch(failure:any){
      if(requestId!==requestSequence.current)return
      setError(failure?.message||'Funnel evidence could not be loaded. Existing funnel data was preserved.')
    }finally{
      if(requestId===requestSequence.current)setLoading(false)
    }
  }

  useEffect(()=>{
    void load()
    return()=>{requestSequence.current+=1}
  },[channel,account,disposition,periodDays])

  const channels=['All channels',...(data.filters?.channels||[])]
  const accounts=['All accounts',...(data.filters?.accounts||[])]
  const campaigns=data.campaigns||[]
  const current=campaigns.find((campaign:any)=>campaign.key===selected)||campaigns[0]

  const exportCsv=()=>{
    const rows=[
      ['campaign','account','channel','leads','qualified','appointments','consultations','bookings','lead_to_qualified_rate','qualified_to_appointment_rate','appointment_to_consultation_rate','consultation_to_booking_rate','lead_to_booking_rate'],
      ...campaigns.map((campaign:any)=>[
        campaign.name,campaign.account,campaign.channel,campaign.leads,campaign.qualified,
        campaign.appointments,campaign.consultations,campaign.bookings,campaign.leadToQualifiedRate,
        campaign.qualifiedToAppointmentRate,campaign.appointmentToConsultationRate,
        campaign.consultationToBookingRate,campaign.leadToBookingRate
      ])
    ]
    const csv=rows
      .map(row=>row.map((value:any)=>'"'+String(value??'').replaceAll('"','""')+'"').join(','))
      .join('\n')
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}))
    const link=document.createElement('a')
    link.href=url
    link.download='ace-funnel-'+periodDays+'d.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const stages=data.stages||{}
  const rates=data.stageRates||{}
  const stageFlow=[
    {label:'Leads',value:stages.leads||0,rate:100},
    {label:'Qualified',value:stages.qualified||0,rate:rates.leadToQualified||0},
    {label:'Appointments',value:stages.appointments||0,rate:rates.qualifiedToAppointment||0},
    {label:'Consultations',value:stages.consultations||0,rate:rates.appointmentToConsultation||0},
    {label:'Bookings',value:stages.bookings||0,rate:rates.consultationToBooking||0}
  ]

  return <>
    <PageHead
      crumb="AdSync / Funnel Mapping"
      title="Channel, account & campaign funnel"
      sub="See exactly where the funnel narrows across channels, ad accounts, campaigns and CRM stages using persisted lead and meeting evidence."
      action={loading?'Refreshing…':'Export funnel'}
      onAction={()=>{if(!loading)exportCsv()}}
    />

    {error&&
      <ErrorState
        title="Funnel refresh failed"
        description={error}
        action={{label:'Retry funnel',onClick:load}}
      />
    }
    {loading&&!campaigns.length&&
      <LoadingState
        title="Loading funnel evidence"
        description="Reading persisted lead, meeting and campaign-stage evidence for the selected window."
      />
    }

    <div className="filters funnel-filters" aria-busy={loading?'true':undefined}>
      <label className="funnel-filter-select"><span>Channel</span><select aria-label="Funnel channel" disabled={loading} value={channel} onChange={event=>setChannel(event.target.value)}>{channels.map(item=><option key={item}>{item}</option>)}</select></label>
      <label className="funnel-filter-select"><span>Account</span><select aria-label="Funnel account" disabled={loading} value={account} onChange={event=>setAccount(event.target.value)}>{accounts.map(item=><option key={item}>{item}</option>)}</select></label>
      <label className="funnel-filter-select"><span>Disposition</span><select aria-label="Funnel disposition" disabled={loading} value={disposition} onChange={event=>setDisposition(event.target.value)}>{dispositions.map(item=><option key={item}>{item}</option>)}</select></label>
      <label className="funnel-filter-select"><span>Period</span><select aria-label="Funnel period" disabled={loading} value={period} onChange={event=>setPeriod(event.target.value)}>{periods.map(item=><option key={item}>{item}</option>)}</select></label>
      <button disabled={loading} onClick={load}>{loading?'Refreshing…':'Refresh'}</button>
    </div>

    <div className="funnel-stage-flow">
      {stageFlow.map((item:any,index:number)=>
        <article key={item.label}>
          <div><span>{String(index+1).padStart(2,'0')}</span><b>{item.label}</b></div>
          <strong>{Number(item.value).toLocaleString('en-IN')}</strong>
          <small>{index===0?'100% entry':item.rate+'% from prior stage'}</small>
          {index<stageFlow.length-1&&<ArrowRight/>}
        </article>
      )}
    </div>

    <div className="stats-grid">
      <Stat label="Lead → booking" value={(rates.leadToBooking||0)+'%'} sub={period+' overall conversion'} Icon={Target}/>
      <Stat label="Qualified → appointment" value={(rates.qualifiedToAppointment||0)+'%'} sub={channel} Icon={PhoneCall}/>
      <Stat label="Appointment → consultation" value={(rates.appointmentToConsultation||0)+'%'} sub={account} Icon={MessageCircle}/>
      <Stat label="Consultation → booking" value={(rates.consultationToBooking||0)+'%'} sub={periodDays+' day window'} Icon={CircleDollarSign}/>
    </div>

    <div className="funnel-drill-layout">
      <div className="app-panel">
        <div className="panel-head">
          <div><h3>Campaign breakdown</h3><p>{channel} · {account} · {disposition} · {period}</p></div>
          <span className="healthy">{campaigns.length} campaigns</span>
        </div>
        <div className="funnel-table enhanced">
          <div className="funnel-tr funnel-th"><span>Campaign</span><span>Account</span><span>Channel</span><span>Leads</span><span>Qualified</span><span>Appt.</span><span>Consult.</span><span>Bookings</span></div>
          {campaigns.length
            ?campaigns.map((campaign:any)=>
              <button className={'funnel-tr '+(current?.key===campaign.key?'selected':'')} key={campaign.key} onClick={()=>setSelected(campaign.key)}>
                <div><b>{campaign.name}</b><small>{campaign.leadToBookingRate}% lead → booking</small></div>
                <span>{campaign.account}</span>
                <span>{campaign.channel}</span>
                {[campaign.leads,campaign.qualified,campaign.appointments,campaign.consultations,campaign.bookings].map((value,index)=><strong key={index}>{Number(value||0).toLocaleString('en-IN')}</strong>)}
              </button>
            )
            :!loading&&<div className="empty-delivery-state"><Filter/><div><b>No campaigns match these filters</b><small>Change channel, account, disposition or date window to inspect a broader funnel.</small></div></div>
          }
        </div>
      </div>

      <div className="app-panel funnel-campaign-detail">
        {current
          ?<>
            <div className="panel-head">
              <div><h3>{current.name}</h3><p>{current.account} · {current.channel}</p></div>
              <span className="healthy">{current.leadToBookingRate}% lead → booking</span>
            </div>
            <div className="site-detail-grid">
              {[
                ['Leads',current.leads],
                ['Qualified',current.qualified],
                ['Appointments',current.appointments],
                ['Consultations',current.consultations],
                ['Bookings',current.bookings],
                ['Lead → Qualified',current.leadToQualifiedRate+'%'],
                ['Qualified → Appt.',current.qualifiedToAppointmentRate+'%'],
                ['Appt. → Consult.',current.appointmentToConsultationRate+'%'],
                ['Consult. → Booking',current.consultationToBookingRate+'%']
              ].map((item:any)=><div key={item[0]}><span>{item[0]}</span><b>{String(item[1])}</b></div>)}
            </div>
            <div className="source-conflict-note">
              <BarChart3/>
              <div><b>Campaign narrowing</b><p>Counts and rates are derived from persisted lead profiles and scheduled meetings in the selected window; no media-platform conversion total is substituted for missing CRM evidence.</p></div>
            </div>
          </>
          :<div className="empty-delivery-state"><BarChart3/><div><b>Select a campaign</b></div></div>
        }
      </div>
    </div>
  </>
}
