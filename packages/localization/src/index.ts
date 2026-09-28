export type LocaleFormatOptions={
  locale?:string
  timeZone?:string
}

const safeLocale=(locale?:string)=>{
  const candidate=locale||globalThis.navigator?.language||'en-US'
  try{return Intl.getCanonicalLocales(candidate)[0]||'en-US'}catch{return 'en-US'}
}

export const resolveLocale=(locale?:string)=>safeLocale(locale)

export const resolveTimeZone=(timeZone?:string)=>{
  if(timeZone)return timeZone
  try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'}catch{return 'UTC'}
}

const asDate=(value:Date|string|number)=>{
  const date=value instanceof Date?value:new Date(value)
  return Number.isNaN(date.getTime())?null:date
}

export const formatNumber=(value:number,options?:Intl.NumberFormatOptions&LocaleFormatOptions)=>{
  const {locale,...intlOptions}=options||{}
  return new Intl.NumberFormat(resolveLocale(locale),intlOptions).format(value)
}

export const formatCurrency=(value:number,currency:string,options?:Intl.NumberFormatOptions&LocaleFormatOptions)=>{
  const {locale,...intlOptions}=options||{}
  return new Intl.NumberFormat(resolveLocale(locale),{style:'currency',currency,...intlOptions}).format(value)
}

export const formatDate=(value:Date|string|number,options?:Intl.DateTimeFormatOptions&LocaleFormatOptions)=>{
  const date=asDate(value)
  if(!date)return '—'
  const {locale,timeZone,...intlOptions}=options||{}
  return new Intl.DateTimeFormat(resolveLocale(locale),{timeZone:resolveTimeZone(timeZone),...intlOptions}).format(date)
}

export const formatDateTime=(value:Date|string|number,options?:Intl.DateTimeFormatOptions&LocaleFormatOptions)=>{
  return formatDate(value,{dateStyle:'medium',timeStyle:'short',...options})
}

export const formatRelativeTime=(value:number,unit:Intl.RelativeTimeFormatUnit,options?:Intl.RelativeTimeFormatOptions&LocaleFormatOptions)=>{
  const {locale,...intlOptions}=options||{}
  return new Intl.RelativeTimeFormat(resolveLocale(locale),{numeric:'auto',...intlOptions}).format(value,unit)
}

export const currentFormattingContext=(locale?:string,timeZone?:string)=>({
  locale:resolveLocale(locale),
  timeZone:resolveTimeZone(timeZone)
})
