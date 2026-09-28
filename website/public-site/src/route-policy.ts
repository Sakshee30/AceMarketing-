export type PublicRoutePolicy={
  path:string
  view:'site'|'pricing'|'demo'|'company'|'resources'|'case-studies'|'privacy'|'terms'|'security'|'solutions'|'industries'|'agents-public'|'integrations-public'
  title:string
  description:string
  index:boolean
  cache:'public-cacheable'|'private-no-store'|'dynamic'
}

export const publicRoutePolicies:PublicRoutePolicy[]=[
  {path:'/',view:'site',title:'AceMarketing | First-party marketing intelligence',description:'Connect acquisition signals, improve lead quality, activate stronger outcomes and measure revenue across the complete customer journey.',index:true,cache:'public-cacheable'},
  {path:'/pricing',view:'pricing',title:'Pricing | AceMarketing',description:'Explore AceMarketing plans, capabilities and product-fit guidance.',index:true,cache:'public-cacheable'},
  {path:'/demo',view:'demo',title:'Book a demo | AceMarketing',description:'Book a guided AceMarketing product walkthrough.',index:true,cache:'dynamic'},
  {path:'/company',view:'company',title:'Company | AceMarketing',description:'Learn about the AceMarketing platform and operating principles.',index:true,cache:'public-cacheable'},
  {path:'/resources',view:'resources',title:'Resources | AceMarketing',description:'Guides, tools and product resources for first-party marketing operations.',index:true,cache:'public-cacheable'},
  {path:'/case-studies',view:'case-studies',title:'Case studies | AceMarketing',description:'Explore customer acquisition and measurement workflows supported by AceMarketing.',index:true,cache:'public-cacheable'},
  {path:'/privacy',view:'privacy',title:'Privacy | AceMarketing',description:'AceMarketing privacy information and data-handling principles.',index:true,cache:'public-cacheable'},
  {path:'/terms',view:'terms',title:'Terms | AceMarketing',description:'AceMarketing product-use terms and conditions.',index:true,cache:'public-cacheable'},
  {path:'/security',view:'security',title:'Security | AceMarketing',description:'AceMarketing security architecture and verification-status information.',index:true,cache:'public-cacheable'},
  {path:'/solutions',view:'solutions',title:'Solutions | AceMarketing',description:'Explore AceMarketing solutions across signal quality, conversion and measurement.',index:true,cache:'public-cacheable'},
  {path:'/industries',view:'industries',title:'Industries | AceMarketing',description:'Explore industry workflows supported by the AceMarketing platform.',index:true,cache:'public-cacheable'},
  {path:'/agents',view:'agents-public',title:'AI agents | AceMarketing',description:'Explore governed AceMarketing agents for acquisition and conversion workflows.',index:true,cache:'public-cacheable'},
  {path:'/integrations',view:'integrations-public',title:'Integrations | AceMarketing',description:'Connect advertising, CRM, messaging, analytics and revenue systems.',index:true,cache:'public-cacheable'}
]

export const policyForPath=(pathname:string)=>{
  const normalized=pathname.length>1?pathname.replace(/\/$/,''):pathname
  return publicRoutePolicies.find(item=>item.path===normalized)||publicRoutePolicies[0]
}
