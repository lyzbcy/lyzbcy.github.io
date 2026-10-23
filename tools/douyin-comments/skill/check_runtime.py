import os,signal,subprocess,fcntl,time
from pathlib import Path

def acquire_lock(file):
    handle=open(file,'a')
    try:fcntl.flock(handle,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:handle.close();return None
    return handle

def managed_run(cmd,*,cwd=None,text=True,capture_output=True,timeout=180,**kwargs):
    """Bound each stage and kill its entire process group on timeout or parent signal."""
    with subprocess.Popen(cmd,cwd=cwd,text=text,stdout=subprocess.PIPE,stderr=subprocess.PIPE,
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
        old={s:signal.signal(s,on_signal) for s in (signal.SIGTERM,signal.SIGINT)}
        try:
            try:out,err=proc.communicate(timeout=timeout)
            except subprocess.TimeoutExpired:
                terminate();out,err=proc.communicate(timeout=5)
                raise subprocess.TimeoutExpired(cmd,timeout,output=out,stderr=err)
            return subprocess.CompletedProcess(cmd,proc.returncode,out,err)
        finally:
            for sig,handler in old.items():signal.signal(sig,handler)
