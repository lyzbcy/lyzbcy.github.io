import importlib.util
import json
import sqlite3
from contextlib import closing
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

BASE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('health_score', (BASE/'patch/health_score.py' if (BASE/'patch/health_score.py').exists() else BASE/'health_score.py'))
hs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(hs)

class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.nut = self.root/'nutrition'
        self.nut.mkdir()
        self.records = self.root/'records.jsonl'
        self.records.write_text('', encoding='utf-8')
        self.config = {'bodyfatHistory': [{'date':'2026-09-29','bodyfat_pct':20}]}
        def mapped_path(value):
            return self.nut if str(value) == '/home/openclaw-shared/nutrition' else Path(value)
        self.patches = [patch.object(hs,'Path',mapped_path),
                        patch.object(hs,'DB_PATH',self.root/'health.db'),
                        patch.object(hs,'SHARED_DB',self.root/'shared.db'),
                        patch.object(hs,'RECORDS_PATH',str(self.records)),
                        patch.object(hs,'bc',None),
                        patch.object(hs,'now_date',lambda:'2026-09-30'),
                        patch.object(hs,'load_config',lambda:self.config),
                        patch.object(hs,'load_nutrition_data',self.load)]
        for p in self.patches: p.start()
    def tearDown(self):
        for p in reversed(self.patches): p.stop()
        self.tmp.cleanup()
    def load(self,day):
        f=self.nut/(day+'.json')
        return json.loads(f.read_text()) if f.exists() else None
    def record(self,day,calories=1800):
        (self.nut/(day+'.json')).write_text(json.dumps({'summary':{'calories':calories,'protein':150,'water':2000}}))
    def test_default_and_invalid_dates(self):
        self.record('2026-09-30')
        hs.cmd_compute(SimpleNamespace(date=None))
        with closing(sqlite3.connect(hs.DB_PATH)) as c, c:
            self.assertEqual(c.execute('SELECT date FROM health_scores').fetchall(), [('2026-09-30',)])
            with self.assertRaises(sqlite3.IntegrityError): c.execute('INSERT INTO health_scores(date) VALUES(NULL)')
        for day in ['', '2026-02-30', '20260930']:
            with self.assertRaises(ValueError): hs.compute_score(day)
    def test_refresh_and_calendar_window_and_shared_cache(self):
        for day in ['2026-09-01','2026-09-16','2026-09-17','2026-09-29','2026-09-30','2026-10-01']:
            self.record(day,700)
        old=hs.cmd_export_json()
        self.record('2026-09-29',1800)
        self.record('2026-09-30',1800)
        new=hs.cmd_export_json()
        self.assertEqual([r['date'] for r in new['history']],['2026-09-17','2026-09-29','2026-09-30'])
        self.assertEqual(new['today']['total_score'],new['history'][-1]['score'])
        self.assertGreater(new['history'][-2]['score'],old['history'][-2]['score'])
        for db in [hs.DB_PATH,hs.SHARED_DB]:
            with closing(sqlite3.connect(db)) as c, c:
                self.assertEqual(c.execute("SELECT total_score FROM health_scores WHERE date='2026-09-29'").fetchone()[0],new['history'][-2]['score'])
    def test_no_data_and_no_future_bodyfat(self):
        self.assertIsNone(hs.cmd_export_json()['today'])
        self.assertIsNone(hs.load_bodyfat('2026-09-28'))
        self.assertEqual(hs.load_bodyfat('2026-09-30'),20)
    def test_legacy_null_removed(self):
        with closing(sqlite3.connect(hs.DB_PATH)) as c, c:
            hs._ensure_schema(c)
            c.execute('DROP TRIGGER health_date_insert')
            c.execute('INSERT INTO health_scores(date) VALUES(NULL)')
        hs.cmd_export_json()
        with closing(sqlite3.connect(hs.DB_PATH)) as c, c:
            self.assertEqual(c.execute('SELECT COUNT(*) FROM health_scores WHERE date IS NULL').fetchone()[0],0)

if __name__ == '__main__': unittest.main()
