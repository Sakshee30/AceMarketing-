import {useEffect,useMemo,useState} from 'react'
import {Activity,Bot,Cable,ChevronDown,DatabaseZap,Gauge,Network,Settings2,Target,UsersRound,X} from 'lucide-react'

type Shortcut = {
  label:string
  tab:string
  icon:any
  description:string
}

const shortcuts:Shortcut[]=[
  {label:'Command Center',tab:'Overview',icon:Gauge,description:'KPIs, revenue signals and operating health'},
  {label:'Data Hub',tab:'Data Hub',icon:DatabaseZap,description:'Unified customer and event truth'},
  {label:'Journeys',tab:'Journeys',icon:Network,description:'Customer paths across online and offline touchpoints'},
  {label:'Attribution',tab:'Attribution',icon:Target,description:'Channel, campaign and revenue credit'},
  {label:'Audiences',tab:'Audiences',icon:UsersRound,description:'Build, preview and activate first-party segments'},
  {label:'Agents',tab:'Agents',icon:Bot,description:'Qualification, routing, follow-up and automation'},
  {label:'Integrations',tab:'Integrations',icon:Cable,description:'Connect ads, CRM, calling, messaging and commerce'},
  {label:'Monitoring',tab:'Monitoring',icon:Activity,description:'Reliability, delivery health and operational alerts'},
  {label:'Settings',tab:'Settings',icon:Settings2,description:'Workspace, access, governance and developer controls'}
]

export default function DashboardQuickNav(){
  const [visible,setVisible]=useState(()=>typeof window!=='undefined'&&window.location.hash.startsWith('#/workspace'))
  const [open,setOpen]=useState(false)
  const [compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.localStorage.getItem('ace_quick_nav_compact')==='true')

  useEffect(()=>{
    const sync=()=>setVisible(window.location.hash.startsWith('#/workspace'))
    window.addEventListener('hashchange',sync)
    return()=>window.removeEventListener('hashchange',sync)
  },[])

  const grouped=useMemo(()=>[
    {label:'Understand',items:shortcuts.slice(0,4)},
    {label:'Act',items:shortcuts.slice(4,7)},
    {label:'Operate',items:shortcuts.slice(7)}
  ],[])

  const jump=(tab:string)=>{
    window.dispatchEvent(new CustomEvent('ace-app-tab',{detail:tab}))
    setOpen(false)
  }

  const toggleCompact=()=>{
    const next=!compact
    setCompact(next)
    window.localStorage.setItem('ace_quick_nav_compact',String(next))
  }

  if(!visible)return null
  return <div className={'ace-quick-nav '+(compact?'compact':'')}>
    <button className="ace-quick-nav-trigger" onClick={()=>setOpen(x=>!x)} aria-expanded={open} aria-label="Open dashboard section navigator">
      <span className="ace-quick-nav-pulse"/>
      <b>{compact?'Navigate':'Dashboard navigator'}</b>
      <ChevronDown className={open?'open':''}/>
    </button>
    {open&&<div className="ace-quick-nav-menu" role="dialog" aria-label="Dashboard section navigator">
      <div className="ace-quick-nav-head">
        <div><b>Jump to a section</b><span>Move across the dashboard without scrolling through every feature.</span></div>
        <button onClick={()=>setOpen(false)} aria-label="Close dashboard navigator"><X/></button>
      </div>
      <div className="ace-quick-nav-groups">
        {grouped.map(group=><section key={group.label}>
          <h4>{group.label}</h4>
          {group.items.map(item=>{const Icon=item.icon;return <button key={item.tab} onClick={()=>jump(item.tab)}>
            <span><Icon/></span>
            <div><b>{item.label}</b><small>{item.description}</small></div>
          </button>})}
        </section>)}
      </div>
      <div className="ace-quick-nav-footer">
        <span>Existing sidebar groups stay available for the full 40+ feature set.</span>
        <button onClick={toggleCompact}>{compact?'Show full label':'Use compact mode'}</button>
      </div>
    </div>}
  </div>
}
