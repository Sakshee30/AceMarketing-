import {Component,useEffect,useRef} from 'react'

type BoundaryProps={
  children:any
  label?:string
}

type BoundaryState={
  error:Error|null
}

export class FrontendAppBoundary extends Component<BoundaryProps,BoundaryState>{
  constructor(props:BoundaryProps){
    super(props)
    this.state={error:null}
  }

  static getDerivedStateFromError(error:Error){
    return {error}
  }

  componentDidCatch(error:Error,info:any){
    try{
      console.error('ace frontend boundary',this.props.label||'application',error,info?.componentStack||'')
    }catch{}
  }

  private retry=()=>{
    this.setState({error:null})
  }

  render(){
    if(!this.state.error)return this.props.children
    return <main className="frontend-fatal-boundary" role="alert" aria-live="assertive">
      <div className="frontend-fatal-card">
        <span className="frontend-fatal-kicker">RECOVERABLE FRONTEND ERROR</span>
        <h1>AceMarketing could not render this application view.</h1>
        <p>{this.state.error.message||'An unexpected rendering error occurred.'}</p>
        <div className="frontend-fatal-actions">
          <button onClick={this.retry}>Retry view</button>
          <button onClick={()=>window.location.reload()}>Reload application</button>
        </div>
        <small>Your backend data is not changed by this recovery screen.</small>
      </div>
    </main>
  }
}

export function RouteAnnouncer({
  label,
  focusSelector,
  titlePrefix='AceMarketing'
}:{
  label:string
  focusSelector?:string
  titlePrefix?:string
}){
  const last=useRef('')
  useEffect(()=>{
    if(!label||last.current===label)return
    last.current=label
    document.title=label+' · '+titlePrefix
    const id=window.setTimeout(()=>{
      if(!focusSelector)return
      const target=document.querySelector<HTMLElement>(focusSelector)
      if(!target)return
      const active=document.activeElement as HTMLElement|null
      if(active&&['INPUT','TEXTAREA','SELECT'].includes(active.tagName))return
      if(!target.hasAttribute('tabindex'))target.setAttribute('tabindex','-1')
      target.focus({preventScroll:true})
    },40)
    return()=>window.clearTimeout(id)
  },[label,focusSelector,titlePrefix])

  return <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{label}</div>
}


type WidgetBoundaryProps={
  children:any
  label:string
}

type WidgetBoundaryState={
  failed:boolean
}

export class FrontendWidgetBoundary extends Component<WidgetBoundaryProps,WidgetBoundaryState>{
  constructor(props:WidgetBoundaryProps){
    super(props)
    this.state={failed:false}
  }

  static getDerivedStateFromError(){
    return {failed:true}
  }

  componentDidCatch(error:Error,info:any){
    try{
      console.error('ace frontend widget boundary',this.props.label,error,info?.componentStack||'')
    }catch{}
  }

  private retry=()=>{
    this.setState({failed:false})
  }

  render(){
    if(!this.state.failed)return this.props.children
    return <div className="ace-widget-recovery" role="status" aria-live="polite">
      <span>{this.props.label} is temporarily unavailable.</span>
      <button type="button" onClick={this.retry}>Retry</button>
    </div>
  }
}
