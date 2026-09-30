import type {ReactNode} from 'react'

export type OnboardingStep={
  id:string
  label:string
  state:'locked'|'available'|'active'|'complete'|'error'
}

export function OnboardingJourney({steps,children}:{steps:readonly OnboardingStep[];children?:ReactNode}){
  const active=steps.find(step=>step.state==='active')
  return <section aria-labelledby="onboarding-journey-title" data-active-step={active?.id||''}>
    <h1 id="onboarding-journey-title">Workspace onboarding</h1>
    <ol aria-label="Onboarding progress">
      {steps.map(step=><li key={step.id} aria-current={step.state==='active'?'step':undefined}>
        <span>{step.label}</span> <small>{step.state}</small>
      </li>)}
    </ol>
    {children}
  </section>
}
