"""Batch API measurements -> existing private registry -> atomic public snapshot.

No login, screenshots, publication or scheduling. Stdlib only.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import datetime as dt
import json
import os
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request
from content_dashboard import connect, ingest, export, import_douyin, TZ


def atomic_json(path, data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_suffix(path.suffix+'.tmp')
    temp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    temp.replace(path)


def parse_bilibili(payload, publication):
    if payload.get('code') != 0:
        raise ValueError('Bilibili rejected request: '+str(payload.get('code')))
    data=payload.get('data') or {}
    if data.get('bvid') != publication['native_id']:
        raise ValueError('Returned video identity differs')
    stat=data.get('stat')
    if not isinstance(stat,dict) or not stat:
        raise ValueError('Metrics missing; preserve old sample')
    fields={'views':'view','likes':'like','comments':'reply','favorites':'favorite','shares':'share'}
    metrics={key:stat.get(field) for key,field in fields.items()}
    metrics['follower_gain']=None
    if not any(value is not None for value in metrics.values()):
        raise ValueError('No measurable counters')
    for value in metrics.values():
        if value is not None and (isinstance(value,bool) or not isinstance(value,int) or value<0):
            raise ValueError('Invalid counter; preserve old sample')
    now=dt.datetime.now(TZ).isoformat(timespec='seconds')
    return {'publication_id':publication['id'],'observed_at':now,'data_as_of':now,
            'source':'bilibili-public-api','metrics':metrics}


def fetch_bilibili(publication, timeout=12):
    if not re.fullmatch(r'BV[0-9A-Za-z]{10}',publication.get('native_id') or ''):
        raise ValueError('A verified native BV ID is required')
    url='https://api.bilibili.com/x/web-interface/view?'+urllib.parse.urlencode({'bvid':publication['native_id']})
    request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':'https://www.bilibili.com/'})
    with urllib.request.urlopen(request,timeout=timeout) as response:
        data=json.load(response)
    return parse_bilibili(data,publication)


def refresh(db, platforms, douyin_export=None, workers=3, fetch=fetch_bilibili):
    result={'ok':True,'samples':0,'errors':[],'platforms':{}}
    if 'bilibili' in platforms:
        pubs=[dict(p) for p in db.execute("SELECT * FROM publication WHERE platform='bilibili' AND status='published'")]
        count=0
        with ThreadPoolExecutor(max_workers=min(max(workers,1),3)) as pool:
            jobs={pool.submit(fetch,p):p for p in pubs}
            for job in as_completed(jobs):
                try:
                    row=job.result()
                    ingest(db,{'snapshots':[row]})
                    count+=1
                except Exception as error:
                    result['errors'].append({'platform':'bilibili','publication_id':jobs[job]['id'],'error':str(error)[:250]})
        result['platforms']['bilibili']={'registered':len(pubs),'sampled':count}
        result['samples']+=count
    if 'douyin' in platforms:
        if douyin_export:
            try:
                count=import_douyin(db,json.loads(Path(douyin_export).read_text(encoding='utf-8-sig')))
                result['samples']+=count
                result['platforms']['douyin']={'matched':count,'source':'existing_creator_export','fresh_collection_triggered':False}
            except Exception as error:
                result['errors'].append({'platform':'douyin','error':str(error)[:250]})
        else:
            result['errors'].append({'platform':'douyin','error':'Provide --douyin-export from existing collector; no synthetic refresh timestamp'})
    result['ok']=not result['errors']
    return result


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db',required=True,help='Existing private SQLite registry, never a public repository file')
    p.add_argument('--platforms',default='bilibili',help='Comma separated: bilibili,douyin')
    p.add_argument('--registry',action='append',default=[],help='Verified registry import JSON; repeatable')
    p.add_argument('--douyin-export')
    p.add_argument('--export',required=True,help='Generated public snapshot path')
    p.add_argument('--report',help='Private compact per-platform receipt')
    p.add_argument('--workers',type=int,default=3)
    a=p.parse_args();platforms=set(a.platforms.split(','))
    if platforms-{'bilibili','douyin'}:p.error('Unimplemented platforms: '+','.join(sorted(platforms-{'bilibili','douyin'})))
    if not Path(a.db).is_file():p.error('Initialize/import the private registry first; refusing an empty replacement DB')
    lock=Path(a.db).with_suffix('.refresh.lock')
    try:fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    except FileExistsError:p.error('Another refresh may be running; inspect lock instead of overlapping')
    started=time.monotonic();db=None
    try:
        os.close(fd);db=connect(a.db)
        for path in a.registry:ingest(db,json.loads(Path(path).read_text(encoding='utf-8-sig')))
        result=refresh(db,platforms,a.douyin_export,a.workers)
        # Zero successful collection leaves the previous public snapshot untouched.
        result['exported']=result['samples']>0
        if result['exported']:atomic_json(a.export,export(db))
        result['elapsed_seconds']=round(time.monotonic()-started,3)
        if a.report:atomic_json(a.report,result)
        print(json.dumps(result,ensure_ascii=False))
        return 0 if result['ok'] else 1
    finally:
        if db is not None:db.close()
        lock.unlink(missing_ok=True)


if __name__=='__main__':raise SystemExit(main())
