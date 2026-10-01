import {simulatePolicyExpression} from '../../../../../../src/platform/policy-engine.mjs'

export const handleSimulateRule=({
  expression,
  input={},
  simulate=simulatePolicyExpression
})=>simulate({expression,input})
