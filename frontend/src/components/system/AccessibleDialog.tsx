import {useEffect,useRef,type KeyboardEvent,type ReactNode} from 'react'

type AccessibleDialogProps={
  ariaLabel:string
  children:ReactNode
  onClose:()=>void
  className?:string
  closeOnBackdrop?:boolean
  closeOnEscape?:boolean
}

const focusableSelector=[
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

export function AccessibleDialog({
  ariaLabel,
  children,
  onClose,
  className='connector-modal',
  closeOnBackdrop=true,
  closeOnEscape=true
}:AccessibleDialogProps){
  const rootRef=useRef<HTMLDivElement|null>(null)
  const restoreRef=useRef<HTMLElement|null>(null)

  useEffect(()=>{
    restoreRef.current=document.activeElement instanceof HTMLElement?document.activeElement:null
    const root=rootRef.current
    const first=root?.querySelector<HTMLElement>(focusableSelector)
    requestAnimationFrame(()=>first?.focus())
    return()=>{requestAnimationFrame(()=>restoreRef.current?.focus?.())}
  },[])

  const onKeyDown=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==='Escape'&&closeOnEscape){
      event.preventDefault()
      onClose()
      return
    }
    if(event.key!=='Tab')return
    const nodes=[...(rootRef.current?.querySelectorAll<HTMLElement>(focusableSelector)||[])]
      .filter(node=>node.offsetParent!==null)
    if(!nodes.length){
      event.preventDefault()
      rootRef.current?.focus()
      return
    }
    const first=nodes[0]
    const last=nodes[nodes.length-1]
    if(event.shiftKey&&document.activeElement===first){
      event.preventDefault()
      last.focus()
    }else if(!event.shiftKey&&document.activeElement===last){
      event.preventDefault()
      first.focus()
    }
  }

  return <div
    ref={rootRef}
    className={className}
    role="dialog"
    aria-modal="true"
    aria-label={ariaLabel}
    tabIndex={-1}
    onKeyDown={onKeyDown}
    onMouseDown={event=>{
      if(closeOnBackdrop&&event.target===event.currentTarget)onClose()
    }}
  >
    {children}
  </div>
}
