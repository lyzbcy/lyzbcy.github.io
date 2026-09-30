import ast
import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

BASE = Path(__file__).resolve().parent
tree = ast.parse((BASE/'aggregate.py').read_text(encoding='utf-8'))
node = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name=='load_fish_health')
scope={'sys':sys,'json':json}
exec(compile(ast.Module(body=[node],type_ignores=[]),'<fish consumer>','exec'),scope)
load = scope['load_fish_health']
generator = BASE/'generate_nutrition_data.py'
if not generator.exists(): generator = BASE.parent/'generate_nutrition_data.py'
spec=importlib.util.spec_from_file_location('nutrition_generator',generator)
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ConsumerTests(unittest.TestCase):
    def test_repeated_refresh(self):
        with patch('subprocess.run',side_effect=[SimpleNamespace(stdout='{"today":{"total_score":38}}'),SimpleNamespace(stdout='{"today":{"total_score":88}}')]) as run:
            self.assertEqual(load('2026-09-29')['today']['total_score'],38)
            self.assertEqual(load('2026-09-29')['today']['total_score'],88)
            self.assertEqual(run.call_count,2)
            self.assertIn('export',run.call_args.args[0])
            self.assertTrue(run.call_args.kwargs['check'])
    def test_failure_is_not_silently_cached(self):
        with patch('subprocess.run',side_effect=subprocess.CalledProcessError(1,['export'])):
            with self.assertRaises(subprocess.CalledProcessError): load('2026-09-29')
    def test_bodyweight_fields(self):
        with tempfile.TemporaryDirectory() as directory:
            p=Path(directory)/'records.jsonl'
            p.write_text('\n'.join(json.dumps(r) for r in [
                {'action':'bodyweight','date':'2026-08-31','weight':73.1},
                {'action':'bodyweight','date':'2026-09-01','value':73.2},
                {'action':'bodyweight','date':'2026-09-02','value':0}]))
            self.assertEqual([r['weight'] for r in module.get_bodyweight_history(str(p))],[73.1,73.2])
    def test_nutrition_export_failure_stops_generation(self):
        with patch.object(module.os.path,'exists',return_value=True), patch.object(module.subprocess,'run',side_effect=subprocess.CalledProcessError(1,['export'])):
            with self.assertRaises(RuntimeError): module._load_health_score()

if __name__=='__main__': unittest.main()
