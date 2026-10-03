#!/usr/bin/env python3
"""Generate local-only, deterministic AceMarketing-neutral data. No application writes.
Standard library only. Refuses non-empty output directories. IDs are fixture IDs,
not claims about AceMarketing's database schema, role enums or provider contracts.
"""
from __future__ import annotations
import argparse, csv, gzip, hashlib, io, json, re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable

VERSION = 'ace.dummy.v1'
SEED = 20261002
START = datetime(2026, 7, 3, tzinfo=timezone.utc)
END = datetime(2026, 10, 1, tzinfo=timezone.utc)
PERSONAS = ['owner','administrator','marketing_operator','analyst','viewer','approver','support_operator','billing_operator']
PROVIDERS = ['META','GOOG','XADS','TIK','LINK','PIN','MS']

def iso(t: datetime) -> str:
    return t.isoformat(timespec='milliseconds').replace('+00:00','Z')

def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')

def write_csv(path: Path, records: list[dict[str, Any]]) -> None:
    if not records: raise ValueError('Use a declared-header file for an empty table')
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(records[0])); w.writeheader(); w.writerows(records)

def key(run_id: str, kind: str, n: int) -> str:
    return f'{run_id}_{kind}_{n:06d}'

def generate(out: Path, profile: str, run_id: str, seed: int=SEED) -> dict[str, Any]:
    if not re.fullmatch(r'qa_[A-Za-z0-9_]{3,50}',run_id):
        raise ValueError('run-id must begin qa_ and contain only 3-50 alphanumeric/underscore characters after it')
    if out.is_symlink(): raise ValueError('Output must not be a symlink')
    if out.exists() and any(out.iterdir()): raise ValueError('Refusing to overwrite a non-empty directory')
    out.mkdir(parents=True,exist_ok=True)
    scale=profile=='scale'
    nt,nw,nu,nl,nc,ne=(50,100,1000,100000,1000,1000000) if scale else (4,8,32,10000,100,100000)
    core=out if scale else out/'D1_core'; market=out if scale else out/'D2_marketing'
    core.mkdir(parents=True,exist_ok=True); market.mkdir(parents=True,exist_ok=True)
    def common():return {'fixture_version':VERSION,'run_id':run_id,'synthetic':True}
    tenants=[];workspaces=[];users=[];members=[]
    for i in range(1,nt+1):
        state='active' if scale or i!=4 else 'suspended'
        names=['Cedar Training QA','Orion Commerce QA','Empty Workspace QA','Suspended Tenant QA']
        tenants.append({**common(),'tenant_id':key(run_id,'tenant',i),'name':f'Scale Tenant QA {i:03d}' if scale else names[i-1],
                        'status':state,'canary':f'QA_TENANT_{i:03d}_PRIVATE_CANARY','currency':'INR','timezone':'UTC'})
    for i in range(1,nw+1):
        ti=(i-1)//2+1
        state='active' if scale or ti<3 else ('empty' if ti==3 else 'suspended')
        workspaces.append({**common(),'workspace_id':key(run_id,'workspace',i),'tenant_id':key(run_id,'tenant',ti),
                           'name':f'QA Workspace {i:03d}','fixture_state':state,'timezone':'UTC','currency':'INR'})
    per_t=nu//nt
    for i in range(1,nu+1):
        ti=(i-1)//per_t+1; j=(i-1)%per_t; wi=(ti-1)*2+1+(j%2 if scale else (1 if j in [4,7] else 0))
        status='active' if scale else ('disabled' if j==6 else 'invited' if j==7 else 'active')
        persona=PERSONAS[j%len(PERSONAS)]
        u={**common(),'user_id':key(run_id,'user',i),'tenant_id':key(run_id,'tenant',ti),
           'email':f'{run_id}.user{i:06d}@example.test','display_name':f'QA User {i:06d}',
           'logical_persona':persona,'account_state':status,'credential_ref':f'QA_USER_{i:06d}_PASSWORD',
           'app_role_mapping':'UNRESOLVED','home_workspace_id':key(run_id,'workspace',wi)}
        users.append(u)
        members.append({**common(),'membership_id':key(run_id,'membership',i),'tenant_id':u['tenant_id'],
                        'workspace_id':u['home_workspace_id'],'user_id':u['user_id'],'logical_persona':persona,
                        'membership_state':status,'app_role_mapping':'UNRESOLVED'})
    for name,rs in [('tenants',tenants),('workspaces',workspaces),('users',users),('memberships',members)]:write_csv(core/(name+'.csv'),rs)
    active_ws=list(range(1,nw+1)) if scale else [1,2,3,4]
    campaigns=[]
    for i in range(1,nc+1):
        wi=active_ws[(i-1)%len(active_ws)];ti=(wi-1)//2+1
        campaigns.append({**common(),'campaign_id':key(run_id,'campaign',i),'tenant_id':key(run_id,'tenant',ti),
          'workspace_id':key(run_id,'workspace',wi),'name':f'QA Campaign {i:04d}','provider_code':PROVIDERS[(i-1)%len(PROVIDERS)],
          'provider_account_id':f'SIM_ACCOUNT_{ti:03d}','provider_campaign_id':f'SIM_CAMPAIGN_{i:06d}',
          'current_state':['active','paused','completed'][(i-1)%3], 'start_at':iso(START),'end_at':iso(END),
          'currency':'INR','budget_minor':10000000,'outbound_enabled':False})
    write_csv(market/'campaigns.csv',campaigns)
    leads=[]
    for i in range(1,nl+1):
        c=campaigns[(i-1)%nc]
        day=(i*37+seed)%88
        t=START+timedelta(days=day,hours=(i*7)%20,minutes=i%50)
        stage='customer' if i%10==0 else 'qualified' if i%5==0 else ['new','contacted','lost'][i%3]
        consent='revoked' if i%17==0 else 'denied' if i%4==0 else 'granted'
        leads.append({**common(),'lead_id':key(run_id,'lead',i),'tenant_id':c['tenant_id'],'workspace_id':c['workspace_id'],
          'campaign_id':c['campaign_id'],'source_record_id':f'SIM_LEAD_{i:07d}', 'display_name':f'Synthetic Lead {i:07d}',
          'email':f'{run_id}.lead{i:07d}@example.test','recipient_id':f'SIM_RECIPIENT_{i:07d}',
          'phone_e164':'','stage':stage,'marketing_consent':consent,'analytics_consent':'granted',
          'created_at':iso(t+timedelta(minutes=3)),'updated_at':iso(t+timedelta(minutes=9)),
          'expected_score_band':'high' if i%5==0 else 'low','currency':'INR'})
    write_csv(market/'leads.csv',leads)
    daily=[]
    for ci,c in enumerate(campaigns,1):
        for d in range(90):
            # Provider aggregate fixture, distinct source from first-party tracking events.
            daily.append({**common(),'stat_id':key(run_id,'stat',(ci-1)*90+d+1),
              'tenant_id':c['tenant_id'],'workspace_id':c['workspace_id'],'campaign_id':c['campaign_id'],
              'provider_code':c['provider_code'],'date':(START+timedelta(days=d)).date().isoformat(),
              'currency':'INR','spend_minor':1000+((ci+d+seed)%10)*100,'impressions':100+(ci+d)%40,
              'clicks':10+(ci+d)%7,'source_kind':'provider_daily_aggregate'})
    write_csv(market/'campaign_daily_stats.csv',daily)
    type_counts={};currency_totals={'revenue_minor':0,'refunds_minor':0}
    event_path=market/('events.ndjson.gz' if scale else 'events.ndjson')
    fh=event_path.open('wb')
    gz=gzip.GzipFile(filename='',mode='wb',fileobj=fh,mtime=0,compresslevel=4) if scale else fh
    text=io.TextIOWrapper(gz,encoding='utf-8',newline='\n')
    try:
        for i,l in enumerate(leads,1):
            t=datetime.fromisoformat(l['created_at'].replace('Z','+00:00'))-timedelta(minutes=3)
            kinds=['ad.impression','ad.click','page.view','lead.created','lead.updated',
                   'lead.qualified' if i%5==0 else 'page.view',
                   'payment.succeeded' if i%10==0 else 'page.view',
                   'payment.refunded' if i%50==0 else 'page.view','form.view','page.view']
            for step,kind in enumerate(kinds):
                n=(i-1)*10+step+1
                amount=100000+(i%7)*10000 if kind=='payment.succeeded' else 10000 if kind=='payment.refunded' else 0
                occurred=t+timedelta(minutes=step)
                e={**common(),'event_id':key(run_id,'event',n),'tenant_id':l['tenant_id'],'workspace_id':l['workspace_id'],
                  'campaign_id':l['campaign_id'],'lead_id':l['lead_id'],'event_type':kind,'occurred_at':iso(occurred),
                  'received_at':iso(occurred+timedelta(seconds=5)), 'currency':'INR','amount_minor':amount,
                  'idempotency_key':key(run_id,'event',n), 'source_kind':'first_party_tracking',
                  'analytics_consent':'granted','anonymous_id':key(run_id,'anon',i),
                  'click_id':f'SIM_CLICK_{i:07d}', 'parent_event_id':key(run_id,'event',(i-1)*10+7) if kind=='payment.refunded' else ''}
                text.write(json.dumps(e,ensure_ascii=False,separators=(',',':'))+'\n')
                type_counts[kind]=type_counts.get(kind,0)+1
                if kind=='payment.succeeded':currency_totals['revenue_minor']+=amount
                if kind=='payment.refunded':currency_totals['refunds_minor']+=amount
    finally:
        text.close()
        if not fh.closed:fh.close()
    exp={'scope':'fixture integrity, not application qualification','profile':profile,'run_id':run_id,'seed':seed,
         'window_start_inclusive':iso(START),'window_end_exclusive':iso(END),'days':90,
         'row_counts':{'tenants':nt,'workspaces':nw,'users':nu,'memberships':nu,'campaigns':nc,'leads':nl,
                       'campaign_daily_stats':90*nc,'events':ne},'event_type_counts':type_counts,
         'first_party':{**currency_totals,'net_revenue_minor':currency_totals['revenue_minor']-currency_totals['refunds_minor'],
                        'created_leads':nl,'qualified_leads':nl//5,'customers':nl//10,'refund_events':nl//50},
         'provider_daily':{k:sum(r[k] for r in daily) for k in ['spend_minor','impressions','clicks']},
         'warnings':['Provider daily impressions/clicks are NOT first-party event totals; do not sum or force equality between independent sources.',
                     'Marketing consent does not authorize delivery. recipient_id values require a simulator; phone_e164 is intentionally blank.',
                     'Role, state, event, ID and field names are fixture contracts. Map and validate against the frozen app schema before loading.',
                     'Empty/suspended core workspaces have no marketing records; scale profile is independent.']}
    write_json(market/'expected_reconciliation.json',exp)
    write_json(out/'profile_manifest.json',{'version':VERSION,'profile':profile,'run_id':run_id,'seed':seed,
      'clock_utc':'2026-10-02T00:00:00Z','description':'Local synthetic files only. No import executed.',
      'counts':exp['row_counts'],'schema_status':'NEUTRAL_FIXTURE_SCHEMA_MAPPING_REQUIRED'})
    return exp

def main()->None:
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--profile',choices=['functional','scale'],required=True)
    p.add_argument('--run-id',required=True);p.add_argument('--out',type=Path,required=True)
    p.add_argument('--seed',type=int,default=SEED)
    a=p.parse_args()
    try: print(json.dumps(generate(a.out,a.profile,a.run_id,a.seed)['row_counts'],indent=2))
    except (ValueError,OSError) as e:p.exit(2,f'Generation refused: {e}\n')
if __name__=='__main__':main()
