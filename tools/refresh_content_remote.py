"""Collect Bilibili at the current machine; import/publish on the existing server.

Requires paramiko locally. Password is prompted, never saved. No new schedule.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor
import getpass
import json
from pathlib import PurePosixPath
import shlex
import time
import uuid
import paramiko
from refresh_content_metrics import fetch_bilibili

REMOTE_CODE='''
import json,os,sys
from pathlib import Path
repo,dbfile,payload,do_push=sys.argv[1:]
repo=Path(repo);sys.path.insert(0,str(repo/'tools'))
from content_dashboard import connect,ingest,export
from refresh_content_metrics import atomic_json
lock=Path(dbfile).with_suffix('.refresh.lock');fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600);os.close(fd)
db=None
try:
 db=connect(dbfile);ingest(db,json.loads(Path(payload).read_text(encoding='utf-8')))
 atomic_json(repo/'assets/data/content-dashboard.json',export(db))
 if do_push=='1':
  import subprocess
  def run(args):subprocess.run(args,cwd=repo,check=True,timeout=100)
  run(['git','add','--','assets/data/content-dashboard.json'])
  if subprocess.run(['git','diff','--cached','--quiet','--','assets/data/content-dashboard.json'],cwd=repo).returncode:
   run(['git','commit','-m','data(content): refresh real Bilibili API samples','--','assets/data/content-dashboard.json'])
   env=os.environ.copy();env.update(GIT_CONFIG_GLOBAL='/dev/null',GIT_SSH_COMMAND='ssh -o BatchMode=yes')
   subprocess.run(['git','push','origin','main'],cwd=repo,env=env,check=True,timeout=100)
 print(json.dumps({'imported':len(json.loads(Path(payload).read_text())['snapshots']),'pushed':do_push=='1'}))
finally:
 if db is not None:db.close()
 lock.unlink(missing_ok=True)
'''


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--host',required=True);p.add_argument('--user',default='root')
    p.add_argument('--key');p.add_argument('--repo',default='/home/openclaw-shared/lyzbcy.github.io')
    p.add_argument('--db',default='/home/ubuntu/.local/share/laoyu-content/registry.sqlite')
    p.add_argument('--push',action='store_true',help='Commit/push only the generated public snapshot')
    a=p.parse_args();start=time.monotonic()
    for value in (a.repo,a.db):
        if not PurePosixPath(value).is_absolute() or '..' in PurePosixPath(value).parts:p.error('Absolute server paths required')
    client=paramiko.SSHClient();client.load_system_host_keys();client.load_host_keys(str(__import__('pathlib').Path.home()/'.ssh/known_hosts'));client.set_missing_host_key_policy(paramiko.RejectPolicy())
    password=None if a.key else getpass.getpass('Server password (not saved): ')
    client.connect(a.host,username=a.user,password=password,key_filename=a.key,allow_agent=bool(a.key),look_for_keys=False,timeout=12)
    password=None
    try:
        with client.open_sftp() as sftp:
            with sftp.open(a.repo+'/assets/data/content-dashboard.json') as f:data=json.load(f)
            pubs=[pub for c in data['contents'] for pub in c['publications'] if pub['platform']=='bilibili' and pub['status']=='published']
            if not pubs:raise ValueError('No registered public Bilibili IDs; refusing empty update')
            # A failed collection leaves the server snapshot untouched.
            with ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(fetch_bilibili,pubs))
            payload=str(PurePosixPath(a.db).parent/('api-observation-'+uuid.uuid4().hex+'.json'))
            with sftp.open(payload,'w') as f:f.write(json.dumps({'snapshots':rows},ensure_ascii=False))
            owner=sftp.stat(a.db);sftp.chown(payload,owner.st_uid,owner.st_gid);sftp.chmod(payload,0o600)
        argv=['python3','-',a.repo,a.db,payload,'1' if a.push else '0']
        if a.user=='root':argv=['sudo','-u','ubuntu']+argv
        stdin,stdout,stderr=client.exec_command(' '.join(shlex.quote(x) for x in argv),timeout=150)
        stdin.write(REMOTE_CODE);stdin.channel.shutdown_write()
        output=stdout.read().decode();error=stderr.read().decode();code=stdout.channel.recv_exit_status()
        print(json.dumps({'ok':code==0,'samples':len(rows),'elapsed_seconds':round(time.monotonic()-start,3),'server_output':output[-1200:],'error':error[-1200:]},ensure_ascii=False))
        return code
    finally:client.close()


if __name__=='__main__':raise SystemExit(main())
