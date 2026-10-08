import gzip,json,pathlib
p=json.loads(gzip.decompress(pathlib.Path('/home/aceqa/execution-20261003/qa/fixtures/plan.json.gz').read_bytes()))
for s in p:
 if s['test_id'].split('-')[0] in ('BASE','AUTH','TEN','UI','MET','PERF','UAT'):print(json.dumps(s))