import {api as sharedApi} from '../../../lib/api'
export const diagnosticsApi={
  diagnostics:()=>sharedApi.diagnostics(),
  replayDiagnostic:(issue:string)=>sharedApi.replayDiagnostic(issue),
  runDiagnosticsScan:()=>sharedApi.runDiagnosticsScan()
}
