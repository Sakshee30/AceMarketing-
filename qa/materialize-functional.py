#!/usr/bin/env python3
"""Reproduce supplied D2 bytes; never download data or write to an application."""
from pathlib import Path
import csv,hashlib,importlib.util,json,os,sys

def main():
    private=Path(os.environ['QA_PRIVATE_ROOT']).resolve(strict=True)
    out=Path(sys.argv[1]).resolve()
    if not out.is_relative_to(private) or out==private:
        raise ValueError('Generated fixtures must be a child of this run private directory')
    spec=importlib.util.spec_from_file_location('ace_fixture_generator',Path(__file__).parent/'fixtures/generate-profiles.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.generate(out,'functional','qa_ace_v1',20261002)
    expected=json.loads((Path(__file__).parent/'fixtures/functional-source-hashes.json').read_text())
    for rel,digest in expected.items():
        actual=hashlib.sha256((out/rel).read_bytes()).hexdigest()
        if actual!=digest:raise ValueError('Supplied fixture checksum mismatch: '+rel)
    with (out/'D2_marketing/leads.csv').open(newline='',encoding='utf-8') as f:
        leads=list(csv.DictReader(f))
    with (out/'D2_marketing/campaigns.csv').open(newline='',encoding='utf-8') as f:
        campaigns=list(csv.DictReader(f))
    with (out/'D2_marketing/campaign_daily_stats.csv').open(newline='',encoding='utf-8') as f:
        campaign_daily=list(csv.DictReader(f))
    (out/'leads.json').write_text(json.dumps(leads),encoding='utf-8')
    (out/'campaigns.json').write_text(json.dumps(campaigns),encoding='utf-8')
    (out/'campaign_daily.json').write_text(json.dumps(campaign_daily),encoding='utf-8')
    (out/'source-validation.json').write_text(json.dumps({'source':'supplied AceMarketing_Dummy_Data_v1 D2_marketing','files':expected,'validated':True},indent=2)+'\n')
    print('Five original D2 files reproduced byte-for-byte; no application import performed by generator.')
if __name__=='__main__':main()
