import os,signal,subprocess,sys,tempfile,time,unittest
from pathlib import Path
from check_runtime import managed_run,acquire_lock
class RuntimeTests(unittest.TestCase):
 def test_lock_excludes_overlap(self):
  with tempfile.TemporaryDirectory() as d:
   f=Path(d)/'lock';a=acquire_lock(f);self.assertIsNotNone(a);self.assertIsNone(acquire_lock(f));a.close();b=acquire_lock(f);self.assertIsNotNone(b);b.close()
 def test_timeout_kills_grandchild(self):
  with tempfile.TemporaryDirectory() as d:
   marker=Path(d)/'leaked'
   child='import time,pathlib;time.sleep(1.5);pathlib.Path('+repr(str(marker))+').write_text("leaked")'
   code='import subprocess,sys,time;subprocess.Popen([sys.executable,"-c",'+repr(child)+']);print("before-timeout",flush=True);time.sleep(20)'
   with self.assertRaises(subprocess.TimeoutExpired) as caught:managed_run([sys.executable,'-c',code],timeout=.2)
   self.assertIn('before-timeout',caught.exception.output);time.sleep(1.6);self.assertFalse(marker.exists())
 def test_stdin_is_closed_not_interactive(self):
  r=managed_run([sys.executable,'-c','import sys;print(repr(sys.stdin.read()))'],timeout=2);self.assertEqual(r.returncode,0);self.assertEqual(r.stdout.strip(),"''")
 def test_preserves_exit_status_and_error(self):
  r=managed_run([sys.executable,'-c','import sys;print("failed",file=sys.stderr);sys.exit(4)']);self.assertEqual(r.returncode,4);self.assertIn('failed',r.stderr)
 def test_parent_signal_kills_group(self):
  with tempfile.TemporaryDirectory() as d:
   marker=Path(d)/'leaked';ready=Path(d)/'ready'
   child='import time,pathlib;time.sleep(1.5);pathlib.Path('+repr(str(marker))+').write_text("leaked")'
   workload='import subprocess,sys,time,pathlib;subprocess.Popen([sys.executable,"-c",'+repr(child)+']);pathlib.Path('+repr(str(ready))+').touch();time.sleep(20)'
   wrapper='from check_runtime import managed_run;import sys;managed_run([sys.executable,"-c",'+repr(workload)+'],timeout=30)'
   p=subprocess.Popen([sys.executable,'-c',wrapper])
   for _ in range(100):
    if ready.exists():break
    time.sleep(.02)
   self.assertTrue(ready.exists());p.terminate();self.assertEqual(p.wait(timeout=5),143);time.sleep(1.6);self.assertFalse(marker.exists())
if __name__=='__main__':unittest.main()
