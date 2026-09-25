import {createHmac,randomUUID,timingSafeEqual} from 'node:crypto'
import pg from 'pg'

const {Pool}=pg
const databaseUrl=process.env.DATABASE_URL||''
const stripeSecret=process.env.STRIPE_SECRET_KEY||''
const webhookSecret=process.env.STRIPE_WEBHOOK_SECRET||''
const checkoutSuccessUrl=process.env.BILLING_CHECKOUT_SUCCESS_URL||''
const checkoutCancelUrl=process.env.BILLING_CHECKOUT_CANCEL_URL||''
const portalReturnUrl=process.env.BILLING_PORTAL_RETURN_URL||checkoutSuccessUrl
const toleranceSeconds=Number(process.env.STRIPE_WEBHOOK_TOLERANCE_SECONDS||300)
const pool=databaseUrl?new Pool({
  connectionString:databaseUrl,
  max:Number(process.env.BILLING_DB_POOL_MAX||10),
  idleTimeoutMillis:Number(process.env.DB_IDLE_TIMEOUT_MS||30000),
  connectionTimeoutMillis:Number(process.env.DB_CONNECT_TIMEOUT_MS||5000),
  ...(process.env.DB_SSL==='require'?{ssl:{rejectUnauthorized:false}}:{})
}):null

const catalog=()=>{
  try{
    const parsed=JSON.parse(process.env.BILLING_PLAN_CATALOG_JSON||'{}')
    return parsed&&typeof parsed==='object'?parsed:{}
  }catch{return {}}
}

export const billingConfigured=()=>Boolean(stripeSecret&&webhookSecret&&checkoutSuccessUrl&&checkoutCancelUrl&&Object.keys(catalog()).length)

const formBody=entries=>{
  const params=new URLSearchParams()
  for(const [key,value] of Object.entries(entries)){
    if(value==null)continue
    params.append(key,String(value))
  }
  return params
}

const stripeRequest=async(path,body)=>{
  if(!stripeSecret)throw new Error('Stripe billing is not configured')
  const response=await fetch('https://api.stripe.com'+path,{
    method:'POST',
    headers:{Authorization:'Bearer '+stripeSecret,'Content-Type':'application/x-www-form-urlencoded'},
    body:formBody(body)
  })
  const raw=await response.text()
  let data={}
  try{data=raw?JSON.parse(raw):{}}catch{data={raw:raw.slice(0,2000)}}
  if(!response.ok){
    const message=data?.error?.message||('Stripe request failed: '+response.status)
    throw new Error(message)
  }
  return data
}

const planConfig=planCode=>{
  const plan=catalog()[String(planCode)]
  if(!plan?.priceId)throw new Error('billing plan is not configured')
  return plan
}

export const createCheckoutSession=async(workspaceId,input={})=>{
  if(!checkoutSuccessUrl||!checkoutCancelUrl)throw new Error('billing checkout URLs are not configured')
  const planCode=String(input.planCode||'')
  const plan=planConfig(planCode)
  const session=await stripeRequest('/v1/checkout/sessions',{
    mode:'subscription',
    'line_items[0][price]':plan.priceId,
    'line_items[0][quantity]':1,
    client_reference_id:workspaceId,
    'metadata[workspace_id]':workspaceId,
    'metadata[plan_code]':planCode,
    'subscription_data[metadata][workspace_id]':workspaceId,
    'subscription_data[metadata][plan_code]':planCode,
    success_url:checkoutSuccessUrl,
    cancel_url:checkoutCancelUrl,
    allow_promotion_codes:'true'
  })
  return {id:session.id,url:session.url,planCode,provider:'stripe'}
}

export const createPortalSession=async(workspaceId)=>{
  if(!pool)throw new Error('billing store unavailable')
  if(!portalReturnUrl)throw new Error('billing portal return URL is not configured')
  const {rows}=await pool.query(
    `SELECT external_customer_id FROM ace_workspace_subscriptions WHERE workspace_id=$1`,
    [workspaceId]
  )
  const customer=rows[0]?.external_customer_id
  if(!customer)throw new Error('no billing customer is linked to this workspace')
  const session=await stripeRequest('/v1/billing_portal/sessions',{customer,return_url:portalReturnUrl})
  return {id:session.id,url:session.url,provider:'stripe'}
}

const signatureParts=header=>{
  const parts={}
  for(const segment of String(header||'').split(',')){
    const [key,value]=segment.split('=')
    if(key&&value){
      parts[key]=parts[key]||[]
      parts[key].push(value)
    }
  }
  return parts
}

export const verifyStripeWebhook=(rawBody,signatureHeader)=>{
  if(!webhookSecret)throw new Error('Stripe webhook secret is not configured')
  const parts=signatureParts(signatureHeader)
  const timestamp=Number(parts.t?.[0]||0)
  if(!timestamp||Math.abs(Math.floor(Date.now()/1000)-timestamp)>toleranceSeconds)throw new Error('Stripe webhook timestamp outside tolerance')
  const expected=createHmac('sha256',webhookSecret).update(String(timestamp)+'.'+rawBody).digest()
  const matches=(parts.v1||[]).some(value=>{
    try{
      const candidate=Buffer.from(value,'hex')
      return candidate.length===expected.length&&timingSafeEqual(candidate,expected)
    }catch{return false}
  })
  if(!matches)throw new Error('invalid Stripe webhook signature')
  let event
  try{event=JSON.parse(rawBody)}catch{throw new Error('invalid Stripe webhook JSON')}
  if(!event?.id||!event?.type)throw new Error('invalid Stripe webhook event')
  return event
}

const statusMap=value=>({
  trialing:'trial',
  active:'active',
  past_due:'past_due',
  unpaid:'past_due',
  paused:'suspended',
  canceled:'cancelled',
  incomplete:'past_due',
  incomplete_expired:'cancelled'
}[String(value)]||'active')

const configuredPlanByPrice=priceId=>{
  for(const [code,plan] of Object.entries(catalog()))if(plan?.priceId===priceId)return {code,plan}
  return null
}

const workspaceFromObject=async object=>{
  const direct=object?.metadata?.workspace_id||object?.client_reference_id
  if(direct)return String(direct)
  const subscription=typeof object?.subscription==='string'?object.subscription:object?.id?.startsWith?.('sub_')?object.id:null
  const customer=typeof object?.customer==='string'?object.customer:null
  if(!pool||(!subscription&&!customer))return null
  const {rows}=await pool.query(
    `SELECT workspace_id FROM ace_workspace_subscriptions
     WHERE ($1::text IS NOT NULL AND external_subscription_id=$1)
        OR ($2::text IS NOT NULL AND external_customer_id=$2)
     LIMIT 1`,
    [subscription,customer]
  )
  return rows[0]?.workspace_id||null
}

const updateSubscription=async(workspaceId,patch={})=>{
  if(!pool)return null
  const current=await pool.query(`SELECT * FROM ace_workspace_subscriptions WHERE workspace_id=$1`,[workspaceId])
  if(!current.rowCount){
    await pool.query(
      `INSERT INTO ace_workspace_subscriptions (workspace_id,plan_code,status,entitlements)
       VALUES ($1,$2,$3,$4::jsonb)`,
      [workspaceId,patch.planCode||'usage',patch.status||'active',JSON.stringify(patch.entitlements||{})]
    )
  }
  const existing=(await pool.query(`SELECT * FROM ace_workspace_subscriptions WHERE workspace_id=$1`,[workspaceId])).rows[0]
  const entitlements=patch.entitlements?{...(existing.entitlements||{}),...patch.entitlements}:existing.entitlements
  const {rows}=await pool.query(
    `UPDATE ace_workspace_subscriptions SET
       plan_code=COALESCE($2,plan_code),
       status=COALESCE($3,status),
       entitlements=$4::jsonb,
       billing_provider='stripe',
       external_customer_id=COALESCE($5,external_customer_id),
       external_subscription_id=COALESCE($6,external_subscription_id),
       provider_price_id=COALESCE($7,provider_price_id),
       current_period_start=COALESCE($8,current_period_start),
       current_period_end=COALESCE($9,current_period_end),
       trial_ends_at=$10,
       cancel_at_period_end=COALESCE($11,cancel_at_period_end),
       updated_at=now()
     WHERE workspace_id=$1 RETURNING *`,
    [workspaceId,patch.planCode||null,patch.status||null,JSON.stringify(entitlements||{}),patch.customerId||null,patch.subscriptionId||null,patch.priceId||null,patch.periodStart||null,patch.periodEnd||null,patch.trialEndsAt||null,patch.cancelAtPeriodEnd??null]
  )
  return rows[0]
}

const secondsDate=value=>value?new Date(Number(value)*1000).toISOString():null

export const processStripeEvent=async event=>{
  if(!pool)throw new Error('billing store unavailable')
  const existing=await pool.query(`SELECT * FROM ace_billing_events WHERE provider='stripe' AND provider_event_id=$1`,[event.id])
  if(existing.rowCount&&existing.rows[0].status==='processed')return {duplicate:true,workspaceId:existing.rows[0].workspace_id}
  const object=event.data?.object||{}
  const workspaceId=await workspaceFromObject(object)
  const eventRowId=existing.rows[0]?.id||'be_'+randomUUID()
  if(!existing.rowCount){
    await pool.query(
      `INSERT INTO ace_billing_events (id,provider,provider_event_id,workspace_id,event_type,payload_summary,status)
       VALUES ($1,'stripe',$2,$3,$4,$5::jsonb,'received')`,
      [eventRowId,event.id,workspaceId,event.type,JSON.stringify({objectId:object.id||null,customer:object.customer||null,subscription:object.subscription||null})]
    )
  }
  try{
    if(event.type==='checkout.session.completed'){
      if(!workspaceId)throw new Error('checkout session missing workspace metadata')
      const planCode=String(object.metadata?.plan_code||'')
      const plan=planCode?planConfig(planCode):null
      await updateSubscription(workspaceId,{planCode:planCode||undefined,status:'active',entitlements:plan?.entitlements||undefined,customerId:object.customer||null,subscriptionId:object.subscription||null,priceId:plan?.priceId||null})
    }else if(event.type.startsWith('customer.subscription.')){
      if(!workspaceId)throw new Error('subscription event could not be mapped to a workspace')
      const item=object.items?.data?.[0]
      const priceId=item?.price?.id||null
      const configured=configuredPlanByPrice(priceId)
      await updateSubscription(workspaceId,{
        planCode:configured?.code||object.metadata?.plan_code||undefined,
        status:event.type==='customer.subscription.deleted'?'cancelled':statusMap(object.status),
        entitlements:configured?.plan?.entitlements||undefined,
        customerId:object.customer||null,
        subscriptionId:object.id||null,
        priceId,
        periodStart:secondsDate(item?.current_period_start||object.current_period_start),
        periodEnd:secondsDate(item?.current_period_end||object.current_period_end),
        trialEndsAt:secondsDate(object.trial_end),
        cancelAtPeriodEnd:Boolean(object.cancel_at_period_end)
      })
    }else if(event.type==='invoice.payment_failed'){
      if(workspaceId)await updateSubscription(workspaceId,{status:'past_due',customerId:object.customer||null,subscriptionId:object.subscription||null})
    }else if(event.type==='invoice.paid'){
      if(workspaceId)await updateSubscription(workspaceId,{status:'active',customerId:object.customer||null,subscriptionId:object.subscription||null})
    }else{
      await pool.query(`UPDATE ace_billing_events SET status='ignored',processed_at=now() WHERE id=$1`,[eventRowId])
      return {ignored:true,workspaceId}
    }
    await pool.query(`UPDATE ace_billing_events SET workspace_id=$2,status='processed',processed_at=now(),error=NULL WHERE id=$1`,[eventRowId,workspaceId])
    return {processed:true,workspaceId,eventType:event.type}
  }catch(error){
    const message=error instanceof Error?error.message:String(error)
    await pool.query(`UPDATE ace_billing_events SET workspace_id=$2,status='failed',error=$3,processed_at=now() WHERE id=$1`,[eventRowId,workspaceId,message]).catch(()=>{})
    throw error
  }
}

export const billingEventHistory=async(workspaceId,limit=50)=>{
  if(!pool)return []
  const {rows}=await pool.query(
    `SELECT provider_event_id,event_type,status,error,received_at,processed_at
     FROM ace_billing_events WHERE workspace_id=$1 ORDER BY received_at DESC LIMIT $2`,
    [workspaceId,Math.max(1,Math.min(200,Number(limit)||50))]
  )
  return rows
}

export const closeBillingProvider=async()=>{if(pool)await pool.end()}
