import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {embeddedDatabase} from '../src/database.mjs'
import {completeJob,enqueueJob,leaseJobs} from '../src/queue.mjs'

test('queue leasing can isolate webhook jobs from the general worker pool',{skip:embeddedDatabase},async()=>{
  const workspaceId='ws_worker_lease_'+randomUUID().replaceAll('-','')
  const webhook=await enqueueJob({
    workspaceId,
    kind:'webhook_delivery',
    payload:{deliveryId:'delivery_'+randomUUID()},
    idempotencyKey:'webhook-'+randomUUID()
  })
  const general=await enqueueJob({
    workspaceId,
    kind:'signal_delivery',
    payload:{deliveryId:'signal_'+randomUUID()},
    idempotencyKey:'general-'+randomUUID()
  })

  const webhookWorker='webhook_'+randomUUID()
  const webhookJobs=await leaseJobs({
    workerId:webhookWorker,
    limit:10,
    includeKinds:['webhook_delivery']
  })
  const leasedWebhook=webhookJobs.find(job=>job.id===webhook.id)
  assert.ok(leasedWebhook)
  assert.equal(webhookJobs.some(job=>job.id===general.id),false)
  await completeJob(leasedWebhook.id,{test:true},{
    workerId:webhookWorker,
    fencingToken:leasedWebhook.fencing_token
  })

  const generalWorker='general_'+randomUUID()
  const generalJobs=await leaseJobs({
    workerId:generalWorker,
    limit:10,
    excludeKinds:['webhook_delivery']
  })
  const leasedGeneral=generalJobs.find(job=>job.id===general.id)
  assert.ok(leasedGeneral)
  await completeJob(leasedGeneral.id,{test:true},{
    workerId:generalWorker,
    fencingToken:leasedGeneral.fencing_token
  })
})
