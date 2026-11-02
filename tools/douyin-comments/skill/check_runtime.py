import os,signal,subprocess,fcntl,time
from pathlib import Path

def acquire_lock(file):
    handle=open(file,'a')
    try:fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:handle.close();return None
    return handle

def managed_run(cmd,*,cwd=None,text=True,capture_output=True,timeout=180,stdout_log=None,**kwargs):
    """Bound stages, preserve live collection progress, and clean the entire process group."""
    live=open(stdout_log,'w+b') if stdout_log else None
    if live:os.chmod(stdout_log,0o600)
    try:
        with subprocess.Popen(cmd,cwd=cwd,text=text,stdout=live if live else subprocess.PIPE,
                              stderr=subprocess.STDOUT if live else subprocess.PIPE,
                              stdin=subprocess.DEVNULL,start_new_session=True,**kwargs) as proc:
            def terminate():
                try:os.killpg(proc.pid,signal.SIGTERM)
                except ProcessLookupError:pass
                try:proc.wait(timeout=2)
                except subprocess.TimeoutExpired:pass
                try:os.killpg(proc.pid,signal.SIGKILL)
                except ProcessLookupError:pass
            def on_signal(sig,frame):
                terminate()
                raise SystemExit(128+sig)
            def collect(wait):
                if not live:return proc.communicate(timeout=wait)
                proc.wait(timeout=wait);live.flush();live.seek(0);out=live.read()
                return (out.decode('utf-8','replace'),'') if text else (out,b'')
            old={s:signal.signal(s,on_signal) for s in (signal.SIGTERM,signal.SIGINT)}
            try:
                try:out,err=collect(timeout)
                except subprocess.TimeoutExpired:
                    terminate();out,err=collect(5)
                    raise subprocess.TimeoutExpired(cmd,timeout,output=out,stderr=err)
                return subprocess.CompletedProcess(cmd,proc.returncode,out,err)
            finally:
                for sig,handler in old.items():signal.signal(sig,handler)
    finally:
        if live:live.close()
