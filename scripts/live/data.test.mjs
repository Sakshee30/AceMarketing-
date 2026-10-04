import test from 'node:test'
import assert from 'node:assert/strict'
import {randomSource,customer,leadInput,eventInput,supervisedRows,matrixRows,forecastInput} from './data.mjs'
import {trackingInputError} from '../../backend/src/tracking-input.mjs'

test('seeded acquisition mixes channels but preserves identities and purchase values across stages',()=>{
  const random=randomSource(42)
  const people=Array.from({length:100},(_,index)=>customer(random,index,'test_run'))
  assert.equal(new Set(people.map(person=>person.id)).size,100)
  assert.equal(new Set(people.map(person=>person.source)).size,5)
  for(const person of people){
    assert.ok(person.email.endsWith('@example.com'))
    for(const event of ['page_view','lead','purchase']){
      const body=eventInput(person,event)
      assert.equal(trackingInputError(body),null)
      assert.equal(body.customerId,leadInput(person).externalLeadId)
      assert.equal(body.campaign,person.campaign)
      assert.equal(body.value,event==='purchase'?person.value:0)
      assert.match(body.emailSha256,/^[a-f0-9]{64}$/)
      assert.match(body.phoneSha256,/^[a-f0-9]{64}$/)
      assert.equal(body.email,undefined)
      assert.equal(body.synthetic,true)
    }
  }
})
test('historical training labels mature after prediction, with both outcomes in every time split',()=>{
  for(const task of ['lead_qualification','paid_conversion','customer_churn','future_customer_value']){
    const rows=supervisedRows(randomSource(42),task)
    assert.ok(rows.length>=100)
    for(const row of rows){
      assert.ok(Date.parse(row.feature_available_at)<=Date.parse(row.prediction_cutoff))
      assert.ok(Date.parse(row.label_observed_at)>Date.parse(row.prediction_cutoff))
      assert.ok(Date.parse(row.label_observed_at)<Date.now())
      assert.equal(row.features.label,undefined)
      assert.equal(row.features.converted,undefined)
    }
    if(task!=='future_customer_value')for(const [start,end] of [[0,.5],[.5,.7],[.7,.85],[.85,1]]){
      assert.deepEqual([...new Set(rows.slice(Math.floor(rows.length*start),Math.floor(rows.length*end)).map(row=>row.label))].sort(),[0,1])
    }
  }
})
test('forecast inputs are chronological historical observations with a weekly cycle',()=>{
  const request=forecastInput(randomSource(7))
  assert.equal(request.history.length,70)
  assert.equal(request.season_length,7)
  assert.equal(request.horizon,7)
  assert.equal(request.timezone,'Asia/Kolkata')
  for(let n=1;n<request.history.length;n++)assert.ok(Date.parse(request.history[n].timestamp)>Date.parse(request.history[n-1].timestamp))
  assert.ok(request.history.every(point=>point.value>=0&&Date.parse(point.timestamp)<Date.now()))
})
test('matrix rows have unique entities, finite features, and an intentional anomaly',()=>{
  const rows=matrixRows(randomSource(8))
  assert.equal(new Set(rows.map(row=>row.entity_id)).size,rows.length)
  assert.ok(rows.every(row=>Object.values(row.features).every(Number.isFinite)))
  assert.equal(rows.at(-1).features.conversion_rate,.98)
})
