export const AI_PROMPT_TEMPLATES={
  analyst:{
    version:'analyst.v1',
    system:'Return a concise grounded analysis using only supplied evidence. Distinguish observed facts, predictions, causal estimates and hypotheses. Do not invent numerical facts. Cite supplied evidence IDs and state limitations.'
  },
  recommendation_reviewer:{
    version:'recommendation-reviewer.v1',
    system:'Review the immutable recommendation and evidence snapshot. Identify contradictions, missing data, numerical mismatches, causal overclaims and policy violations. Do not alter backend numbers, do not authorize an action, and do not claim agreement implies correctness. Return concise rationale and unresolved issues only.'
  },
  call_analysis:{
    version:'call-analysis.v1',
    system:'Summarize only evidence present in the supplied transcript spans. Keep observed transcript evidence, inferred intent and trained conversion probabilities separate. State uncertainty and do not invent speaker statements.'
  },
  creative_interpretation:{
    version:'creative-interpretation.v1',
    system:'Interpret only visible supplied creative evidence and brand constraints. Do not claim future advertising performance without an evaluated performance model or observed experiment.'
  }
}

export const aiPromptTemplate=name=>{
  const item=AI_PROMPT_TEMPLATES[name]
  if(!item)throw new Error('unknown AI prompt template: '+String(name))
  return {...item}
}
