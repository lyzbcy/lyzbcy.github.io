import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec=importlib.util.spec_from_file_location('sticker_export',Path(__file__).with_name('build.py'))
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ExportTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.root=Path(self.tmp.name)
        module.ROOT=self.root/'blog'
        (module.ROOT/'assets/data').mkdir(parents=True)
        self.private=self.root/'private'
        self.private.mkdir()
        self.raw={'captured_at':'2026-11-03T12:00:00+08:00','list':{'base_resp':{'ret':0},'List':[{'StikerID':'a','Name':'测试','Status':7,'TotalSendNum':'0','TotalDownloadNum':None,'SendNum':999,'DownloadNum':999,'private_account':'SECRET'}]},'details':{},'reports':{},'previews':{},'password':'SECRET'}
    def tearDown(self):self.tmp.cleanup()
    def export(self):
        (self.private/'platform-private.json').write_text(json.dumps(self.raw),encoding='utf8')
        with contextlib.redirect_stdout(io.StringIO()):module.build(self.private)
        return json.loads((module.ROOT/'assets/data/sticker-dashboard.json').read_text('utf8'))
    def test_null_zero_and_private_fields(self):
        d=self.export()
        self.assertEqual(d['albums'][0]['sends'],0)
        self.assertIsNone(d['albums'][0]['downloads'])
        self.assertIsNone(d['albums'][0]['ratio'])
        self.assertNotIn('SECRET',json.dumps(d))
        self.assertEqual(d['summary']['download_coverage'],0)
    def test_duplicate_does_not_replace_snapshot(self):
        self.export()
        target=module.ROOT/'assets/data/sticker-dashboard.json'
        old=target.read_bytes()
        self.raw['list']['List']*=2
        with self.assertRaises(ValueError):self.export()
        self.assertEqual(target.read_bytes(),old)
    def test_same_day_keeps_growth_baseline(self):
        self.raw['list']['List'][0]['TotalSendNum']='100'
        self.export()
        self.raw['captured_at']='2026-11-04T12:00:00+08:00'
        self.raw['list']['List'][0]['TotalSendNum']='120'
        self.assertEqual(self.export()['albums'][0]['send_change'],20)
        self.raw['captured_at']='2026-11-04T15:00:00+08:00'
        self.raw['list']['List'][0]['TotalSendNum']='125'
        self.assertEqual(self.export()['albums'][0]['send_change'],25)
    def test_single_dates_are_preserved_without_mixing(self):
        md5='a'*32
        self.raw['details']={'a':{'StikerID':'a','StikerJson':{'Item':[{'md5':md5,'meaning':{'Unit':[{'lang':'zh_cn','content':'抱抱'}]}}]}}}
        self.raw['reports']={'a':{'Summary':{'StikerID':'a'},'Report':[{'Md5':md5,'DataTime':'11月1日','SendNum':0},{'Md5':md5,'DataTime':'11月2日','SendNum':5}]}}
        d=self.export()
        single=json.loads((module.ROOT/'assets/data/sticker-daily.json').read_text('utf8'))
        self.assertEqual(len(single['rows']),2)
        self.assertEqual({single['date_labels'][r[3]]:r[4] for r in single['rows']},{'11月1日':0,'11月2日':5})
        detail=json.loads((module.ROOT/'assets/data/sticker-albums/a.json').read_text('utf8'))
        self.assertIsNone(detail['stickers'][0]['daily_sends'])
        self.assertEqual(len(detail['stickers'][0]['daily_records']),2)
        self.assertEqual(d['albums'][0]['stickers'],[])
    def test_duplicate_single_record_rejected(self):
        self.raw['reports']={'a':{'Summary':{'StikerID':'a'},'Report':[{'Md5':'a'*32,'DataTime':'11月2日','SendNum':0}]*2}}
        with self.assertRaises(ValueError):self.export()

if __name__=='__main__':unittest.main()
