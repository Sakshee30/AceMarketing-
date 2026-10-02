import hashlib,pathlib,tempfile,unittest
from release_gate import evaluate
class GateTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=pathlib.Path(self.temp.name);self.sha='a'*40
        self.path=self.root/'evidence.json';self.path.write_text('{"observed":true}');self.plan=[{'test_id':'QA-001'}]
        self.case={'test_id':'QA-001','candidate':self.sha,'status':'PASS','scope_complete':True,'evidence':[{'path':'evidence.json','sha256':hashlib.sha256(self.path.read_bytes()).hexdigest()}]}
    def tearDown(self):self.temp.cleanup()
    def check(self,cases):return evaluate(self.plan,cases,self.root,self.sha)['completeEvidence']
    def test_missing_case_fails(self):self.assertFalse(self.check([]))
    def test_real_complete_case_passes_case_gate_only(self):self.assertTrue(self.check([self.case]))
    def test_partial_smoke_never_passes(self):self.case['scope_complete']=False;self.assertFalse(self.check([self.case]))
    def test_stale_candidate_fails(self):self.case['candidate']='b'*40;self.assertFalse(self.check([self.case]))
    def test_retry_only_flaky_fails(self):self.case['status']='FLAKY';self.assertFalse(self.check([self.case]))
    def test_modified_evidence_fails(self):self.path.write_text('changed');self.assertFalse(self.check([self.case]))
    def test_unapproved_exclusion_fails(self):self.case['status']='NOT APPLICABLE';self.assertFalse(self.check([self.case]))
    def test_duplicate_case_fails(self):self.assertFalse(self.check([self.case,self.case]))
    def test_no_evidence_fails(self):self.case['evidence']=[];self.assertFalse(self.check([self.case]))
    def test_path_escape_fails(self):self.case['evidence'][0]['path']='../elsewhere';self.assertFalse(self.check([self.case]))
if __name__=='__main__':
    import os,xml.etree.ElementTree as ET
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(GateTests);result=unittest.TextTestRunner(verbosity=2).run(suite)
    root=ET.Element('testsuite',name='RELEASE_EVIDENCE_GATE_SELF_TESTS',tests=str(result.testsRun),failures=str(len(result.failures)),errors=str(len(result.errors)))
    failures={str(t):msg for t,msg in result.failures+result.errors}
    for name in unittest.defaultTestLoader.getTestCaseNames(GateTests):
        case=ET.SubElement(root,'testcase',name=name,classname='GateTests')
        for ident,msg in failures.items():
            if ident.startswith(name+' '):ET.SubElement(case,'failure',message='Gate regression').text=msg
    ET.ElementTree(root).write(pathlib.Path(os.environ.get('QA_REPORTS','.'))/'release-gate.junit.xml',encoding='utf-8',xml_declaration=True)
    raise SystemExit(0 if result.wasSuccessful() else 1)
