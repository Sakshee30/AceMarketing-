"""Exact-match QA-branch repairs; removed after materialization."""
from pathlib import Path
import hashlib,json
repairs=json.loads(Path('qa/final-repairs.json').read_text())
assert set(repairs)=={'backend/src/index.mjs','backend/src/store.mjs','.github/workflows/ci.yml'}
for name,item in repairs.items():
    p=Path(name);assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256'],('source drift',name)
    text=p.read_text()
    for before,after in item['replacements']:
        assert text.count(before)==1,(name,'ambiguous replacement');text=text.replace(before,after)
    p.write_text(text)
p=Path('backend/src/platform/workspace-access.mjs');assert 'listActorWorkspaces' not in p.read_text();p.write_text(p.read_text()+'\n'+Path('qa/list-workspaces.mjs.txt').read_text())
p=Path('qa/run.py');s=p.read_text()
s=s.replace("    scripts=sorted(p for p in ROOT.rglob('*')","    command('systemd',['bash','qa/verify-systemd.sh'])\n    scripts=sorted(p for p in ROOT.rglob('*')")
s=s.replace("'qa/tests/stream-client.test.mjs']","'qa/tests/stream-client.test.mjs','qa/workspace-visibility.test.mjs']")
needle="    pgdirs=sorted(Path('/usr/lib/postgresql').glob('*/bin'),reverse=True)";assert s.count(needle)==1;s=s.replace(needle,"    command('release-gate-self-tests',['python3','qa/test_release_gate.py'])\n"+needle)
needle="    # An actual in-cluster dump/restore smoke, not a fresh-host disaster-recovery claim.";assert s.count(needle)==1
s=s.replace(needle,"""    # Quiesce source writers before table-content reconciliation.
    for name,process,log in PROCESSES:
      if name in ('api','worker','web') and process.poll() is None:
        process.terminate()
        try:process.wait(timeout=15)
        except subprocess.TimeoutExpired:process.kill();process.wait()
"""+needle)
start=s.index("        a=subprocess.check_output([str(pgdir/'psql'),app_admin");end=s.index("\n\nif __name__",start)
s=s[:start]+"""        compare_env={**app_env,'QA_SOURCE_DATABASE_URL':app_admin,'QA_RESTORED_DATABASE_URL':restored,
          'QA_CANDIDATE':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()}
        if command('restore-content-reconciliation',['node','qa/restore-check.mjs'],compare_env):
          restored_env={**app_env,'DATABASE_URL':app_env['DATABASE_URL'].replace('/qa_http','/qa_restore'),
            'PORT':'3002','QA_API_URL':'http://127.0.0.1:3002'}
          restored_api=spawn('restored-api',['node','backend/src/index.mjs'],{k:v for k,v in restored_env.items() if k!='QA_ADMIN_DATABASE_URL'})
          if ready('http://127.0.0.1:3002/api/health',restored_api):
            command('restored-authenticated-api',['node','qa/restore-api.mjs'],restored_env)
          else:record('restored-authenticated-api','FAIL','Restored API did not become ready')
"""+s[end:]
needle="    with (REPORTS/'checksums.sha256').open('w') as f:";assert s.count(needle)==1;s=s.replace(needle,"    subprocess.run(['python3','qa/write_case_status.py',str(REPORTS),sha],cwd=ROOT,check=True)\n"+needle);p.write_text(s)
p=Path('qa/seed.mjs');text=p.read_text();needle="writeFileSync(process.env.QA_ACTORS_FILE,JSON.stringify(actors),{mode:0o600})";assert text.count(needle)==1
text=text.replace(needle,"""await withWorkspace('ws_default',()=>mutateState(state=>{
 state.members=[]
 state.workspaces=core.workspaces.map(ws=>({id:ws.workspace_id,name:ws.name,status:ws.fixture_state,tenantId:ws.tenant_id}))
}))
"""+needle);p.write_text(text)
for name in ['qa/browser/production.spec.ts','qa/browser/navigation.spec.ts']:
    p=Path(name);text=p.read_text().replace("from '@playwright/test'","from '../browser-guard'")
    if 'navigation.spec.ts' in name:
        text=text.replace("  await page.waitForLoadState('networkidle')","  await expect(page.locator('.product-body .ace-state-loading')).toHaveCount(0)")
        text=text.replace("  await expect(page.locator('.workspace-section-error')).toHaveCount(0)","  await expect(page.locator('.workspace-section-error,.product-body .ace-state-error')).toHaveCount(0)")
        text=text.replace("await page.waitForLoadState('networkidle');expect(errors).toEqual([])","await expect(page.locator('.ace-state-loading')).toHaveCount(0);expect(errors).toEqual([])")
    p.write_text(text)
p=Path('qa/playwright.config.ts');p.write_text(p.read_text().replace('workers:1','workers:3'))
p=Path('qa/tests/business-api.test.mjs');p.write_text(p.read_text().replace("approver=actors.find(x=>x.id.endsWith('000002'))","approver=actors.find(x=>x.id.endsWith('000003'))")+'\n'+Path('qa/extra-business-tests.mjs.txt').read_text())
p=Path('qa/tests/api.test.mjs');p.write_text(p.read_text().replace('AUTH-007 support: tampered token rejected','AUTH token-integrity support: tampered token rejected'))
p=Path('.github/workflows/prelive-qualification.yml');s=p.read_text();a=s.index('  prepare:\n');b=s.index('  qualification:\n',a)
s=s[:a]+'''  prepare:
    runs-on: ubuntu-latest
    outputs:
      candidate: ${{ steps.source.outputs.candidate }}
    steps:
      - uses: actions/checkout@v4
        with:
          persist-credentials: false
      - name: Freeze candidate
        id: source
        run: echo "candidate=$(git rev-parse HEAD)" >> "$GITHUB_OUTPUT"
'''+s[b:];p.write_text(s)
