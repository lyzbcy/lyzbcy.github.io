import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('comment_runner', Path(__file__).with_name('run-check.py'))
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class CollectionOnlyTests(unittest.TestCase):
    def test_positive_collection_cannot_generate_or_send_replies(self):
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder)
            data = output / 'unreplied-latest.json'
            def collect(command, **kwargs):
                self.assertIn('comments:collect', command)
                self.assertIn('--days', command)
                self.assertNotIn('comments:reply', command)
                data.write_text(json.dumps({'comments':[{'username':'user','commentText':'hello'}], 'selection':{'days':30}, 'workResults':[]}))
                os.utime(data, (time.time()+1, time.time()+1))
                return subprocess.CompletedProcess(command,0,stdout='collected',stderr='')
            with patch.object(runner,'OUTPUT_DIR',output), patch.object(runner,'UNREPLIED_FILE',data), \
                 patch.object(runner,'works_needs_refresh',return_value=False), \
                 patch.object(runner,'memory_available_mb',return_value=1000), \
                 patch.object(runner,'run',side_effect=AssertionError('LLM/refresh/frequency command forbidden')), \
                 patch.object(runner.subprocess,'run',side_effect=collect) as collect_mock, \
                 patch.object(runner,'mark_check_done') as mark, \
                 patch.object(runner,'cleanup_old_logs'), \
                 patch.object(sys,'argv',['run-check.py','--collect-only']), \
                 contextlib.redirect_stdout(io.StringIO()) as captured:
                runner.main()
                self.assertIn('collect_only',captured.getvalue())
                self.assertEqual(collect_mock.call_count,1)
                mark.assert_not_called()

    def test_empty_report_discloses_unsupported_and_failed_coverage(self):
        report = runner.build_empty_report('OK',{'selection':{'days':30,'eligibleWorks':3,'from':'2026-09-20','to':'2026-10-19'},'workResults':[{'status':'checked'},{'status':'unsupported_filter'},{'status':'error'}]})
        self.assertIn('实际检查 1 个',report)
        self.assertIn('不支持未回复筛选 1 个',report)
        self.assertIn('检查失败 1 个',report)
        self.assertIn('不代表没有未回复评论',report)


if __name__ == '__main__':
    unittest.main()
