"""Refresh the already-running installed app using its normal IPC command."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

p=argparse.ArgumentParser()
p.add_argument('--cdp',default='http://127.0.0.1:9487')
p.add_argument('--private-dir',type=Path,required=True)
a=p.parse_args()
if a.private_dir.resolve().is_relative_to(Path(__file__).resolve().parents[2]):
    p.error('Private receipt must stay outside blog repository')
with sync_playwright() as pw:
    b=pw.chromium.connect_over_cdp(a.cdp)
    pages=[g for c in b.contexts for g in c.pages if g.evaluate("!!window.api?.send")]
    if len(pages)!=1:raise RuntimeError('Expected one installed app page')
    page=pages[0]
    busy=page.evaluate("() => {const s=document.querySelector('#app').__vue_app__.config.globalProperties.$pinia._s.get('engine');return s.running||s.publishing||Object.keys(s.activeTasks).length>0;}")
    if busy:raise RuntimeError('App is busy; wait for its current operation')
    page.set_default_timeout(240000)
    result=page.evaluate("async()=>await window.api.send('sync_platform_status',{fetch_reasons:false})")
    data=result.get('data',{})
    if result.get('status')!='ok' or not data.get('complete') or not data.get('list_complete') or data.get('unknown_statuses') or data.get('persistence_failures'):
        raise RuntimeError('Platform sync incomplete; retain old public snapshot')
    a.private_dir.mkdir(parents=True,exist_ok=True)
    (a.private_dir/'installed-sync.json').write_text(json.dumps({'captured_at':datetime.now(timezone.utc).isoformat(),'result':result},ensure_ascii=False),encoding='utf8')
    print(json.dumps({'platform_total':data['platform_total'],'updated':data['updated'],'complete':True}))
