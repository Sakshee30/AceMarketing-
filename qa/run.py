#!/usr/bin/env python3
"""Run reproducible checks inside a no-egress namespace and disposable PG cluster.
Never targets a caller database. Raw ephemeral credentials live outside reports.
"""
from __future__ import annotations
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
REPORTS=ROOT/'artifacts'/'prelive'
REPORTS.mkdir(parents=True,exist_ok=True)
PRIVATE=Path(tempfile.mkdtemp(prefix='acemarketing-qa-'))
RESULTS=[]
PROCESSES=[]
BASE_ENV={k:os.environ[k] for k in ('PATH','HOME','LANG') if k in os.environ}
BASE_ENV.update(CI='true',QA_ISOLATED='1',QA_PRIVATE_ROOT=str(PRIVATE),QA_REPORTS=str(REPORTS),DB_SSL='disable')
REDACT=[]

def clean(value:str)->str:
    for secret in REDACT:
        if secret:value=value.replace(secret,'[REDACTED_TEST_SECRET]')
    return value

def record(name:str,status:str,detail:str='',seconds:float=0):
    RESULTS.append(dict(name=name,status=status,detail=clean(detail),seconds=round(seconds,3)))
    print(status,name,clean(detail)[:180],flush=True)

def command(name,args,env=None,timeout=300):
    started=time.monotonic()
    try:
        p=subprocess.run(args,cwd=ROOT,env=env or BASE_ENV,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,timeout=timeout)
        (REPORTS/(name+'.log')).write_text(clean(p.stdout))
        record(name,'PASS' if p.returncode==0 else 'FAIL',f'exit={p.returncode}; see {name}.log',time.monotonic()-started)
        return p.returncode==0
    except subprocess.TimeoutExpired as e:
        output=e.stdout or b''
        if isinstance(output,bytes):output=output.decode(errors='replace')
        (REPORTS/(name+'.log')).write_text(clean(output))
        record(name,'BLOCKED','command exceeded explicit timeout',time.monotonic()-started)
        return False

def write_summary():
    sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    catalog=json.loads(gzip.decompress((ROOT/'qa/fixtures/plan.json.gz').read_bytes()))
    summary={'schemaVersion':'qa.execution.v1','candidate':sha,'utc':dt.datetime.now(dt.timezone.utc).isoformat(),
      'runtime':subprocess.check_output(['node','--version'],text=True).strip(),
      'executedStages':RESULTS,'offlineQualified':False,'productionQualified':False,
      'scopeNote':'Executed checks are supporting evidence, not completion of every source scenario.',
      'sourceScenarioCount':len(catalog),'notQualified':['full 356-scenario acceptance','provider native wire/sandbox qualification','AI real-runtime and efficacy','full load/soak','full Docker/native deployment and restore matrix','manual accessibility','human UAT'],
      'nativeSuiteNote':'Per-file real PG database under bootstrap role; many existing tests inject mocks. Restricted-role evidence is separate.'}
    (REPORTS/'execution-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    suite=ET.Element('testsuite',name='PRELIVE_STAGE_EXECUTION',tests=str(len(RESULTS)),failures=str(sum(r['status']=='FAIL' for r in RESULTS)),skipped=str(sum(r['status']=='BLOCKED' for r in RESULTS)))
    for r in RESULTS:
      c=ET.SubElement(suite,'testcase',name=r['name'],classname='prelive.stage',time=str(r['seconds']))
      if r['status']=='FAIL':ET.SubElement(c,'failure',message=r['detail'])
      if r['status']=='BLOCKED':ET.SubElement(c,'skipped',message=r['detail'])
    ET.ElementTree(suite).write(REPORTS/'stages.junit.xml',encoding='utf-8',xml_declaration=True)
    with (REPORTS/'checksums.sha256').open('w') as f:
      for path in sorted(REPORTS.rglob('*')):
        if path.is_file() and path.name!='checksums.sha256':
          f.write(hashlib.sha256(path.read_bytes()).hexdigest()+'  '+str(path.relative_to(REPORTS))+'\n')

def spawn(name,args,env):
    log=(PRIVATE/(name+'.log')).open('w')
    p=subprocess.Popen(args,cwd=ROOT,env=env,stdout=log,stderr=subprocess.STDOUT)
    PROCESSES.append((name,p,log))
    return p

def ready(url,proc,seconds=40):
    end=time.monotonic()+seconds
    while time.monotonic()<end:
      if proc.poll() is not None:return False
      try:
        with urllib.request.urlopen(url,timeout=1) as r:
          if r.status==200:return True
      except Exception:time.sleep(.25)
    return False

def main():
    if os.environ.get('QA_ISOLATED')!='1':raise RuntimeError('Use qa/run-isolated.sh')
    interfaces=set(os.listdir('/sys/class/net'))
    # /sys may be shared across namespaces: verify the actual namespace interfaces.
    actual=json.loads(subprocess.check_output(['ip','-json','link'],text=True))
    if {i['ifname'] for i in actual}!={'lo'}:raise RuntimeError('Namespace must have loopback ONLY')
    try:
      with socket.create_connection(('203.0.113.1',443),timeout=.3):
        raise RuntimeError('Unexpected outbound route')
    except OSError:pass
    record('network-isolation','PASS','Loopback-only namespace; external connection denied')
    scripts=sorted(p for p in ROOT.rglob('*') if p.suffix in ('.mjs','.cjs','.js') and not any(x in p.relative_to(ROOT).parts for x in ('node_modules','.git','dist','artifacts')))
    syntax=[]
    for p in scripts:
      r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True,env=BASE_ENV)
      syntax.append({'path':str(p.relative_to(ROOT)),'status':'PASS' if r.returncode==0 else 'FAIL','diagnostic':r.stderr})
    (REPORTS/'syntax.json').write_text(json.dumps(syntax,indent=2))
    record('all-runtime-syntax','FAIL' if any(s['status']=='FAIL' for s in syntax) else 'PASS',f'{len(syntax)} files checked')
    native=sorted(str(p.relative_to(ROOT)) for folder in ('backend/tests','tests') for p in (ROOT/folder).rglob('*.test.mjs'))
    (REPORTS/'discovered-native-tests.json').write_text(json.dumps(native,indent=2))
    literal=[]
    for p in (ROOT/'backend').rglob('*.mjs'):
      for n,line in enumerate(p.read_text().splitlines(),1):
        if "url.pathname === '/api/" in line or "url.pathname==='/api/" in line:literal.append({'file':str(p.relative_to(ROOT)),'line':n,'source':line.strip()})
    (REPORTS/'route-discovery.json').write_text(json.dumps({'note':'Literal route candidates only; regex/dynamic routes and semantics require reconciliation.','candidates':literal},indent=2))
    command('independent-oracles',['node','--test','--test-reporter=spec','--test-reporter-destination=stdout','--test-reporter=junit','--test-reporter-destination='+str(REPORTS/'oracles.junit.xml'),'qa/tests/golden.test.mjs','qa/tests/token.test.mjs','qa/tests/tracking-input.test.mjs','qa/tests/stream-client.test.mjs'])
    pgdirs=sorted(Path('/usr/lib/postgresql').glob('*/bin'),reverse=True)
    if not pgdirs:raise RuntimeError('PostgreSQL server binaries unavailable')
    pgdir=pgdirs[0]; env={**BASE_ENV,'PATH':str(pgdir)+':'+BASE_ENV['PATH']}
    data=PRIVATE/'pgdata';sock=PRIVATE/'socket';sock.mkdir()
    subprocess.run([str(pgdir/'initdb'),'-D',str(data),'--username=qa_bootstrap','--auth=trust','--no-locale','--encoding=UTF8'],env=env,check=True,stdout=subprocess.DEVNULL)
    subprocess.run([str(pgdir/'pg_ctl'),'-D',str(data),'-l',str(PRIVATE/'postgres.log'),'-o',f'-h 127.0.0.1 -p 54329 -k {sock} -c max_connections=300','-w','start'],env=env,check=True,stdout=subprocess.DEVNULL)
    admin='postgresql://qa_bootstrap@127.0.0.1:54329/postgres'
    def sql(statement):
      p=subprocess.run([str(pgdir/'psql'),admin,'-X','-v','ON_ERROR_STOP=1','-c',statement],env=env,text=True,capture_output=True)
      if p.returncode:raise RuntimeError(clean(p.stderr))
    sql('CREATE DATABASE qa_template')
    template_env={**env,'DATABASE_URL':admin.replace('/postgres','/qa_template'),'NODE_ENV':'test'}
    if not command('migrations',['npm','run','migrate'],template_env):return
    command('migration-idempotency',['npm','run','migrate'],template_env)
    native_env={**env,'NODE_ENV':'test','QA_NATIVE_ADMIN_URL':admin,'CONNECTOR_ENCRYPTION_KEY':secrets.token_hex(32),'AUTH_REQUIRED':'true'}
    command('native-regression',['node','--import','./qa/native-db.mjs','--test','--test-concurrency=2','--test-force-exit','--test-timeout=90000','--test-reporter=spec','--test-reporter-destination=stdout','--test-reporter=junit','--test-reporter-destination='+str(REPORTS/'native.junit.xml'),*native],native_env,timeout=1200)
    # Keep type/build results independent so one failure does not erase other evidence.
    command('typecheck',['npm','run','check:frontend'],env)
    built=command('production-bundle',['./node_modules/.bin/vite','build'],env)
    command('backend-architecture',['npm','run','backend:architecture'],env)
    command('customer-bundle',['npm','run','build:customer-app'],env)
    command('public-bundle',['npm','run','build:public-site'],{**env,'PUBLIC_SITE_ORIGIN':'https://acemarketing.example.test'})
    command('control-bundle',['npm','run','build:platform-admin'],env)
    app_password=secrets.token_hex(32); REDACT.append(app_password)
    sql("CREATE ROLE qa_app LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD '"+app_password+"'")
    sql('CREATE DATABASE qa_http TEMPLATE qa_template')
    app_admin=admin.replace('/postgres','/qa_http')
    p=subprocess.run([str(pgdir/'psql'),app_admin,'-X','-v','ON_ERROR_STOP=1','-c','GRANT USAGE ON SCHEMA public TO qa_app; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO qa_app; GRANT USAGE,SELECT ON ALL SEQUENCES IN SCHEMA public TO qa_app;'],env=env,capture_output=True,text=True)
    if p.returncode:raise RuntimeError(p.stderr)
    app_env={**env,'NODE_ENV':'production','AUTH_REQUIRED':'true','DATABASE_URL':f'postgresql://qa_app:{app_password}@127.0.0.1:54329/qa_http',
      'JWT_SECRET':secrets.token_hex(48),'CONNECTOR_ENCRYPTION_KEY':secrets.token_hex(48),'CONNECTOR_OAUTH_STATE_SECRET':secrets.token_hex(48),
      'ADMIN_EMAIL':'bootstrap@example.test','ADMIN_PASSWORD_HASH':'qa:invalid-not-a-login-credential','DEFAULT_WORKSPACE_ID':'qa_ace_v1_workspace_000001',
      'CORS_ALLOWED_ORIGINS':'http://127.0.0.1:4173,http://127.0.0.1:4174,http://127.0.0.1:4175,http://127.0.0.1:4176',
      'PORT':'3001','RATE_LIMIT_PER_MINUTE':'50000','ACE_DEPLOYMENT_MODE':'full','WORKER_RUN_SCHEDULERS':'false','WORKER_POLL_MS':'200',
      'QA_ACTORS_FILE':str(PRIVATE/'actors.json'),'QA_API_URL':'http://127.0.0.1:3001','QA_ADMIN_DATABASE_URL':app_admin}
    REDACT.extend(app_env[k] for k in ('JWT_SECRET','CONNECTOR_ENCRYPTION_KEY','CONNECTOR_OAUTH_STATE_SECRET'))
    if not command('fixture-seed',['node','qa/seed.mjs'],app_env):return
    actors=json.loads((PRIVATE/'actors.json').read_text());REDACT.extend(a['password'] for a in actors)
    api=spawn('api',['node','backend/src/index.mjs'],{k:v for k,v in app_env.items() if k!='QA_ADMIN_DATABASE_URL'})
    if not ready('http://127.0.0.1:3001/api/health',api):
      record('authenticated-api-startup','FAIL','API did not become healthy; see api.log');return
    record('authenticated-api-startup','PASS','Real API: NODE_ENV=production; auth enabled; restricted PostgreSQL role')
    worker=spawn('worker',['node','backend/src/worker.mjs'],{k:v for k,v in app_env.items() if k!='QA_ADMIN_DATABASE_URL'})
    command('authenticated-api',['node','--test','--test-concurrency=1','--test-force-exit','--test-timeout=90000','--test-reporter=spec','--test-reporter-destination=stdout','--test-reporter=junit','--test-reporter-destination='+str(REPORTS/'api.junit.xml'),'qa/tests/api.test.mjs','qa/tests/business-api.test.mjs'],app_env,timeout=300)
    if built:
      web=spawn('web',['node','scripts/static-server.mjs','--dir=dist/frontend','--host=127.0.0.1','--port=4173','--api-target=http://127.0.0.1:3001'],app_env)
      if ready('http://127.0.0.1:4173/healthz',web):
        command('production-browser',['./node_modules/.bin/playwright','test','--config=qa/playwright.config.ts'],app_env,timeout=900)
      else:record('production-browser','BLOCKED','Static production server did not become ready')
    else:record('production-browser','BLOCKED','No production frontend artifact')
    record('worker-runtime','PASS' if worker.poll() is None else 'FAIL','Worker liveness only; business completion checked in API suite')
    # An actual in-cluster dump/restore smoke, not a fresh-host disaster-recovery claim.
    dump=PRIVATE/'qa.dump'
    ok=command('backup-smoke',[str(pgdir/'pg_dump'),app_admin,'-Fc','-f',str(dump)],env)
    if ok:
      sql('CREATE DATABASE qa_restore')
      restored=admin.replace('/postgres','/qa_restore')
      if command('restore-smoke',[str(pgdir/'pg_restore'),'-d',restored,'--exit-on-error',str(dump)],env):
        a=subprocess.check_output([str(pgdir/'psql'),app_admin,'-Atc','SELECT count(*) FROM ace_workspace_state'],env=env,text=True)
        b=subprocess.check_output([str(pgdir/'psql'),restored,'-Atc','SELECT count(*) FROM ace_workspace_state'],env=env,text=True)
        record('restore-state-count','PASS' if a==b else 'FAIL',f'workspace snapshots source={a.strip()} restored={b.strip()}')

if __name__=='__main__':
    os.chdir(ROOT)
    try:main()
    except Exception as exc:record('harness','BLOCKED',str(exc))
    finally:
      for name,p,log in reversed(PROCESSES):
        if p.poll() is None:
          p.terminate()
          try:p.wait(timeout=12)
          except subprocess.TimeoutExpired:p.kill();p.wait()
        log.close()
        path=PRIVATE/(name+'.log')
        if path.exists():(REPORTS/(name+'.log')).write_text(clean(path.read_text(errors='replace')))
      data=PRIVATE/'pgdata'
      if data.exists():
        bins=sorted(Path('/usr/lib/postgresql').glob('*/bin/pg_ctl'),reverse=True)
        if bins:subprocess.run([str(bins[0]),'-D',str(data),'-m','fast','-w','stop'],capture_output=True)
      write_summary()
      shutil.rmtree(PRIVATE)
    sys.exit(1 if any(r['status']!='PASS' for r in RESULTS) else 0)
