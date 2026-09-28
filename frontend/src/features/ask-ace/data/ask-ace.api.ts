import {api} from '../../../lib/api'

export type AskAceInsight={
  label:string
  value:string|number
  note?:string
  source?:string
  evidenceId?:string
  kind?:'observed'|'prediction'|'causal_estimate'|'hypothesis'
}

export type AskAceJourneyEvent={
  type?:string
  title:string
  detail?:string
  at?:string
  source?:string
  event?:string|null
  value?:string|number|null
  destination?:string|null
  status?:string|null
}

export type AskAceResponse={
  answer:string
  confidence?:string
  intent?:string
  insights?:AskAceInsight[]
  followUps?:string[]
  journey?:{
    id?:string
    name?:string
    source?:string
    campaign?:string
  }
  journeyTimeline?:AskAceJourneyEvent[]
  generatedAt?:string
  evidenceIds?:string[]
  warnings?:string[]
  engine?:string
}

export const askAceApi={
  ask:(question:string,options?:{signal?:AbortSignal})=>api.askAce(question,options) as Promise<AskAceResponse>
}
