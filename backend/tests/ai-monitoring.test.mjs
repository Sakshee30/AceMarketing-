import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeAiMonitoringRows} from '../src/ai-monitoring.mjs'

test('AI monitoring summarizes queue provider freshness usage and quality evidence without inventing metrics',()=>{
  const now=Date.parse('2026-09-29T12:00:00Z')
  const summary=summarizeAiMonitoringRows({
    now,
    jobs:[
      {kind:'ai_hosted_task',status:'pending',created_at:'2026-09-29T11:30:00Z'},
      {kind:'ml_task',status:'unknown_outcome',created_at:'2026-09-29T11:50:00Z'},
      {kind:'signal_delivery',status:'dead_letter',created_at:'2026-09-29T11:00:00Z'}
    ],
    providerRequests:[
      {outcome:'failed',started_at:'2026-09-29T11:00:00Z',completed_at:'2026-09-29T11:00:02Z'},
      {outcome:'confirmed',started_at:'2026-09-29T11:10:00Z',completed_at:'2026-09-29T11:10:01Z'},
      {outcome:'unknown',started_at:'2026-09-29T11:20:00Z',completed_at:null}
    ],
    usage:[
      {status:'committed',reserved_units:100,actual_units:80},
      {status:'unknown',reserved_units:20,actual_units:null}
    ],
    results:[
      {task:'analyst',status:'completed',result_type:'provider_output',warnings:[],created_at:'2026-09-29T11:55:00Z'}
    ],
    evaluations:[
      {task:'lead_qualification',status:'qualified',qualified:true,sample_size:500,metrics:{brier:0.12,psi:0.08},completed_at:'2026-09-29T11:40:00Z'}
    ],
    forecasts:[
      {task:'forecast_primary',series_id:'revenue',nominal_coverage:0.9,measured_coverage:0.86,created_at:'2026-09-29T11:45:00Z'}
    ],
    anomalies:[
      {anomaly:true,triage_status:'false_positive',reviewed_at:'2026-09-29T11:45:00Z'},
      {anomaly:true,triage_status:'resolved',reviewed_at:'2026-09-29T11:46:00Z'},
      {anomaly:true,triage_status:'open',reviewed_at:null}
    ]
  })

  assert.equal(summary.queue.counts.pending,1)
  assert.equal(summary.queue.counts.unknownOutcome,1)
  assert.equal(summary.queue.oldestQueueAgeMinutes,30)
  assert.equal(summary.providers.failed,1)
  assert.equal(summary.providers.unknownOrSubmitted,1)
  assert.equal(summary.providers.failureRatePct,33.333)
  assert.equal(summary.providers.p95LatencyMs,2000)
  assert.equal(summary.usage.units,100)
  assert.equal(summary.usage.unresolvedReservations,1)
  assert.equal(summary.usage.estimatedCost,null)
  assert.equal(summary.resultFreshness[0].freshnessMinutes,5)
  assert.equal(summary.evaluationEvidence[0].calibration.brier,0.12)
  assert.equal(summary.evaluationEvidence[0].drift.psi,0.08)
  assert.equal(summary.evaluationEvidence[0].delayedLabelPerformance,null)
  assert.equal(summary.forecastCoverage[0].coverageGap,-0.04)
  assert.equal(summary.anomalyFeedback.falsePositiveRatePct,50)
  assert.ok(summary.warnings.some(item=>item.includes('unknown external outcome')))
})

test('AI monitoring leaves unavailable evaluation evidence null rather than fabricating quality scores',()=>{
  const summary=summarizeAiMonitoringRows({
    evaluations:[{task:'analyst',status:'evidence_recorded',qualified:false,metrics:{},created_at:'2026-09-29T00:00:00Z'}]
  })
  assert.equal(summary.evaluationEvidence[0].calibration.brier,null)
  assert.equal(summary.evaluationEvidence[0].drift.psi,null)
  assert.equal(summary.evaluationEvidence[0].delayedLabelPerformance,null)
  assert.equal(summary.providers.p95LatencyMs,null)
})
