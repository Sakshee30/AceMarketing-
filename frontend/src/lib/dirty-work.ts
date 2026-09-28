import {useEffect} from 'react'

export type DirtyWorkRegistration={
  key:string
  label:string
  dirty:boolean
  scope?:'feature'|'workspace'|'session'
}

type DirtyWorkRecord=Omit<DirtyWorkRegistration,'dirty'>&{updatedAt:number}

const registry=new Map<string,DirtyWorkRecord>()
const CHANGE_EVENT='ace-dirty-work-change'

const emit=()=>{
  if(typeof window==='undefined')return
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT,{detail:getDirtyWork()}))
}

export const setDirtyWork=(registration:DirtyWorkRegistration)=>{
  if(!registration.dirty){
    if(registry.delete(registration.key))emit()
    return
  }
  registry.set(registration.key,{
    key:registration.key,
    label:registration.label,
    scope:registration.scope||'feature',
    updatedAt:Date.now()
  })
  emit()
}

export const clearDirtyWork=(key:string)=>{
  if(registry.delete(key))emit()
}

export const getDirtyWork=()=>[...registry.values()].sort((a,b)=>a.updatedAt-b.updatedAt)

export const hasDirtyWork=()=>registry.size>0

export const describeDirtyWork=()=>{
  const items=getDirtyWork()
  if(!items.length)return ''
  if(items.length===1)return items[0].label
  return items.slice(0,3).map(item=>item.label).join(', ')+(items.length>3?' and '+(items.length-3)+' more':'')
}

export const confirmDiscardDirtyWork=(destinationLabel='another page')=>{
  const label=describeDirtyWork()
  if(!label)return true
  return window.confirm(
    'You have unsaved work in '+label+'.\n\nLeave this work and continue to '+destinationLabel+'?'
  )
}

export const useDirtyWork=(registration:DirtyWorkRegistration)=>{
  const {key,label,dirty,scope='feature'}=registration
  useEffect(()=>{
    setDirtyWork({key,label,dirty,scope})
    return()=>clearDirtyWork(key)
  },[key,label,dirty,scope])
}

export const installBeforeUnloadDirtyWorkGuard=()=>{
  if(typeof window==='undefined')return()=>{}
  const handler=(event:BeforeUnloadEvent)=>{
    if(!hasDirtyWork())return
    event.preventDefault()
    event.returnValue=''
  }
  window.addEventListener('beforeunload',handler)
  return()=>window.removeEventListener('beforeunload',handler)
}

export const dirtyWorkChangeEvent=CHANGE_EVENT
