import importlib.util
import tempfile
import unittest
from pathlib import Path

spec=importlib.util.spec_from_file_location('dashboard',Path(__file__).parents[1]/'tools/content_dashboard.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)


class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.db=m.connect(Path(self.temp.name)/'data.sqlite')
        self.pub=dict(id='p',content_id='c',platform='youtube',account_label='owner',format='video',native_id='id',url=None,published_at='2026-10-30T10:00:00+08:00',status='published',collection=None,activity=None,source_title=None)
        m.ingest(self.db,dict(contents=[dict(id='c',title='Test',series='series',cover=None)],publications=[self.pub]))
    def tearDown(self):self.db.close();self.temp.cleanup()
    def row(self,value=0,at='2026-10-30T11:00:00+08:00'):
        return dict(publication_id='p',observed_at=at,source='test',metrics={'views':value,'likes':None})
    def test_zero_and_missing_are_distinct(self):
        m.ingest(self.db,{'snapshots':[self.row()]});p=m.export(self.db)['contents'][0]['publications'][0]
        self.assertEqual(p['latest']['metrics']['views'],0);self.assertIsNone(p['latest']['metrics']['likes'])
        self.assertIsNone(p['windows']['24'])
    def test_idempotent_and_immutable(self):
        m.ingest(self.db,{'snapshots':[self.row()]});m.ingest(self.db,{'snapshots':[self.row()]})
        self.assertEqual(self.db.execute('SELECT count(*) FROM snapshot').fetchone()[0],1)
        with self.assertRaises(ValueError):m.ingest(self.db,{'snapshots':[self.row(10)]})
    def test_invalid_import_is_atomic(self):
        with self.assertRaises(ValueError):m.ingest(self.db,{'snapshots':[self.row(4),self.row(-1,at='2026-10-30T12:00:00+08:00')]})
        self.assertEqual(self.db.execute('SELECT count(*) FROM snapshot').fetchone()[0],0)
    def test_publication_identity_cannot_switch(self):
        with self.assertRaises(ValueError):m.ingest(self.db,{'publications':[dict(self.pub,account_label='other')]})
        with self.assertRaises(ValueError):m.ingest(self.db,{'publications':[dict(self.pub,native_id='other')]})
    def test_partial_registry_cannot_erase_confirmed_identity(self):
        m.ingest(self.db,{'publications':[dict(self.pub,account_label=None,native_id=None,status='submitted')]})
        p=m.export(self.db)['contents'][0]['publications'][0]
        self.assertEqual(p['native_id'],'id');self.assertEqual(p['account_label'],'owner');self.assertEqual(p['status'],'published')
    def test_window_uses_real_aligned_sample(self):
        m.ingest(self.db,{'snapshots':[self.row(30,'2026-10-31T10:20:00+08:00')]})
        p=m.export(self.db)['contents'][0]['publications'][0]
        self.assertEqual(p['windows']['24']['metrics']['views'],30)
        self.assertIsNone(p['windows']['168'])
    def test_wrong_timezone_and_nonfinite_rejected(self):
        for value in [float('nan'),float('inf'),True]:
            with self.assertRaises(ValueError):m.ingest(self.db,{'snapshots':[self.row(value)]})
        with self.assertRaises(ValueError):m.stamp('2026-10-30T10:00:00')
    def test_douyin_no_fuzzy_title_binding(self):
        self.assertEqual(m.import_douyin(self.db,{'generated_at':'2026-10-30T12:00:00+08:00','all_works':[{'title':'Test','play_count':999}]}),0)
    def test_explicit_title_prefix_requires_minute_and_unique_row(self):
        p=dict(self.pub,platform='douyin',source_title='Test',native_id=None)
        # Start a separate explicitly bound platform publication.
        p['id']='douyin';m.ingest(self.db,{'publications':[p]})
        data={'generated_at':'2026-10-30T12:00:00+08:00','all_works':[{'title':'Test description…','publish_time':'2026-10-30 10:00:32','play_count':10}]}
        self.assertEqual(m.import_douyin(self.db,data),1)
        data['all_works'][0]['publish_time']='2026-10-30 09:00:32'
        self.assertEqual(m.import_douyin(self.db,data),0)
        data['all_works'][0]['publish_time']='2026-10-30 10:00:32';data['all_works']*=2
        self.assertEqual(m.import_douyin(self.db,data),0)


if __name__=='__main__':unittest.main()
