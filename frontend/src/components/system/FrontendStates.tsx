import type {ReactNode} from 'react'

type StateAction={
  label:string
  onClick:()=>void
}

type StateProps={
  title:string
  description?:string
  action?:StateAction
  children?:ReactNode
  compact?:boolean
}

function StatePanel({
  kind,
  title,
  description,
  action,
  children,
  compact=false
}:StateProps&{kind:'loading'|'empty'|'error'|'forbidden'|'degraded'|'stale'}){
  const live=kind==='error'?'assertive':'polite'
  return <section
    className={'ace-state-panel ace-state-'+kind+(compact?' compact':'')}
    role={kind==='error'?'alert':'status'}
    aria-live={live}
    aria-busy={kind==='loading'?'true':undefined}
  >
    <span className="ace-state-indicator" aria-hidden="true"/>
    <div className="ace-state-content">
      <strong>{title}</strong>
      {description&&<p>{description}</p>}
      {children}
    </div>
    {action&&<button type="button" className="ace-state-action" onClick={action.onClick}>{action.label}</button>}
  </section>
}

export const LoadingState=(props:StateProps)=><StatePanel kind="loading" {...props}/>
export const EmptyState=(props:StateProps)=><StatePanel kind="empty" {...props}/>
export const ErrorState=(props:StateProps)=><StatePanel kind="error" {...props}/>
export const ForbiddenState=(props:StateProps)=><StatePanel kind="forbidden" {...props}/>
export const DegradedState=(props:StateProps)=><StatePanel kind="degraded" {...props}/>
export const StaleState=(props:StateProps)=><StatePanel kind="stale" {...props}/>
