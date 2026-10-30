import sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from content_dashboard import connect,ingest
from refresh_content_metrics import parse_bilibili,refresh


class MetricsTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.db=connect(Path(self.tmp.name)/'registry.sqlite')
        self.pub={'id':'p','content_id':'c','platform':'bilibili','format':'video','native_id':'BV1iTxe6dEiC','status':'published'}
        ingest(self.db,{'contents':[dict(id='c',title='Demo',series=None,cover=None)],'publications':[self.pub]})
    def tearDown(self):self.db.close();self.tmp.cleanup()
    def payload(self):return {'code':0,'data':{'bvid':self.pub['native_id'],'stat':{'view':0,'like':1}}}
    def test_zero_missing_and_identity(self):
        row=parse_bilibili(self.payload(),self.pub)
        self.assertEqual(row['metrics']['views'],0);self.assertIsNone(row['metrics']['favorites']);self.assertIsNone(row['metrics']['follower_gain'])
        data=self.payload();data['data']['bvid']='another'
        with self.assertRaises(ValueError):parse_bilibili(data,self.pub)
    def test_error_does_not_zero_existing_samples(self):
        ingest(self.db,{'snapshots':[{'publication_id':'p','observed_at':'2026-10-30T10:00:00+08:00','source':'test','metrics':{'views':7}}]})
        def bad(_):raise ValueError('limited')
        result=refresh(self.db,{'bilibili'},fetch=bad)
        self.assertFalse(result['ok']);self.assertEqual(result['samples'],0)
        self.assertEqual(self.db.execute('SELECT metrics FROM snapshot').fetchone()[0],'{"views": 7}')
    def test_each_success_is_bound_and_imported_once(self):
        row=parse_bilibili(self.payload(),self.pub)
        for _ in range(2):refresh(self.db,{'bilibili'},fetch=lambda _:row)
        self.assertEqual(self.db.execute('SELECT count(*) FROM snapshot').fetchone()[0],1)
    def test_unsupported_bad_data_never_becomes_valid_zero(self):
        for stat in [{},{'view':-1},{'view':True}]:
            data=self.payload();data['data']['stat']=stat
            with self.assertRaises(ValueError):parse_bilibili(data,self.pub)
        data=self.payload();data['code']=-412
        with self.assertRaises(ValueError):parse_bilibili(data,self.pub)


if __name__=='__main__':unittest.main()
