"""Read all registered platforms through live authenticated API requests.

Uses existing WebBridge browser sessions. No credentials or raw responses saved.
"""
import argparse,datetime as dt,json,time,urllib.parse,urllib.request
from pathlib import Path
from content_dashboard import TZ
from content_metric_adapters import normalize
from refresh_content_metrics import atomic_json,fetch_bilibili

SESSION='contentmetrics'
PROFILES={
 'douyin':('https://creator.douyin.com/creator-micro/content/manage','/janus/douyin/creator/pc/work_list'),
 'xiaohongshu':('https://creator.xiaohongshu.com/new/note-manager?source=','/api/galaxy/v2/creator/note/user/posted'),
 'youtube':('https://studio.youtube.com/','/youtubei/v1/creator/list_creator_videos'),
 'wechat_channels':('https://channels.weixin.qq.com/platform/post/list','/post/post_list'),
 'wechat_official':('https://mp.weixin.qq.com/','/misc/appmsganalysis'),
 'x':(None,'/UserOriginalsTimeline'),
 'zhihu':('https://www.zhihu.com/creator/analytics/content-analysis/article?tab=single','/api/v4/creators/analysis/realtime/content/list'),
 'juejin':('https://juejin.cn/creator/home','/content_api/v1/article/list_by_user')}


class Bridge:
    def __init__(self,url='http://127.0.0.1:10086'):
        self.url=url.rstrip('/')+'/command'
        self.opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    def call(self,action,args=None):
        data=json.dumps({'session':SESSION,'action':action,'args':args or {}},ensure_ascii=False).encode()
        req=urllib.request.Request(self.url,data=data,headers={'Content-Type':'application/json'})
        with self.opener.open(req,timeout=65) as response:r=json.load(response)
        if not r.get('ok'):raise RuntimeError(str(r.get('error',{}).get('code','bridge_error')))
        return r['data']
    def js(self,code):
        r=self.call('evaluate',{'code':code});value=r.get('value')
        return json.loads(value) if r.get('type')=='string' and isinstance(value,str) else value


def request_matches(platform,request):
    if request.get('method') not in ('GET','POST') or request.get('status') not in (200,201):return False
    url=request['url'];path=urllib.parse.urlsplit(url).path;query=urllib.parse.parse_qs(urllib.parse.urlsplit(url).query)
    if PROFILES[platform][1] not in path:return False
    if platform=='zhihu' and query.get('type')!=['article']:return False
    if platform=='wechat_official' and query.get('action')!=['get_article_list']:return False
    return True


def replay(b,detail):
    # Keep authentication only in memory. Browser supplies cookies/Origin/Referer.
    headers={k:v for k,v in detail.get('requestHeaders',{}).items()
        if k.lower().startswith('x-') or k.lower() in ('authorization','content-type','accept')}
    options={'method':detail['method'],'credentials':'include','headers':headers}
    if detail['method']=='POST':
        body=detail.get('requestBody')
        options['body']=body if isinstance(body,str) else json.dumps(body,ensure_ascii=False,separators=(',',':'))
    code='(async()=>{const options='+json.dumps(options)+';options.signal=AbortSignal.timeout(12000);const r=await fetch('+json.dumps(detail['url'])+',options);return JSON.stringify({status:r.status,body:await r.json()})})()'
    result=b.js(code)
    if result['status'] not in (200,201):raise RuntimeError('api_http_'+str(result['status']))
    return result['body']


def profile_url(platform,publications):
    url=PROFILES[platform][0]
    if platform=='x':
        known=next((p.get('url') for p in publications if p.get('url')),None)
        if not known:raise ValueError('Verified X profile URL required')
        url='https://x.com/'+urllib.parse.urlsplit(known).path.strip('/').split('/')[0]
    return url


def prepare_requests(b,platforms,publications):
    """Reload all existing tabs concurrently; signing stays with native clients."""
    seen={}
    for platform in platforms:
        if platform not in PROFILES:continue
        rows=[p for p in publications if p['platform']==platform]
        if not rows:continue
        url=profile_url(platform,rows)
        try:b.call('find_tab',{'url':url})
        except RuntimeError:b.call('navigate',{'url':url,'newTab':True,'group_title':'内容运营看板接口更新'})
        previous=b.call('network',{'cmd':'list'})
        seen[platform]={r['requestId'] for r in previous.get('requests',[])}
        b.call('network',{'cmd':'start'})
        b.call('cdp',{'method':'Page.reload','params':{}})
    return seen


def collect_api(b,platform,publications,old_ids=None):
    url=profile_url(platform,publications)
    try:b.call('find_tab',{'url':url})
    except RuntimeError:b.call('navigate',{'url':url,'newTab':True,'group_title':'内容运营看板接口更新'})
    def available():
        network=b.call('network',{'cmd':'list'})
        return [r for r in network.get('requests',[]) if request_matches(platform,r) and r['requestId'] not in (old_ids or set())]
    requests=available()
    if not requests:
        # A batch reload may still be processing. Avoid serial page navigation.
        if old_ids is None:
            b.call('network',{'cmd':'start'});b.call('navigate',{'url':url})
        if platform=='youtube':
            b.js("(()=>{const a=[...document.querySelectorAll('a')].find(x=>(x.getAttribute('href')||'').includes('/videos'));if(a)a.click();return true})()")
        if platform=='wechat_official':
            b.js("(()=>{const a=document.querySelector('a[href*=appmsganalysis]');if(a)a.click();return true})()")
        deadline=time.monotonic()+20
        while not requests and time.monotonic()<deadline:
            time.sleep(.8);requests=available()
    if not requests:raise RuntimeError('read_api_not_observed_login_or_navigation_needed')
    best=None
    # A page can fetch empty draft/filter lists after the actual published list.
    # Select by verified identities rather than whichever response arrived last.
    for request in reversed(requests[-8:]):
        detail=b.call('network',{'cmd':'detail','requestId':request['requestId']})
        result=detail.get('body')
        if isinstance(result,str):result=json.loads(result)
        if not isinstance(result,dict):continue
        asof=None
        if platform=='wechat_official':
            end=int(urllib.parse.parse_qs(urllib.parse.urlsplit(detail['url']).query)['end_timestamp'][0])
            day=dt.datetime.fromtimestamp(end,TZ).date()
            asof=dt.datetime.combine(day,dt.time(23,59,59),TZ).isoformat()
            if dt.datetime.fromisoformat(asof)>dt.datetime.now(TZ):raise ValueError('MP data date is newer than observation')
        try:sample=normalize(platform,result,publications,data_as_of=asof)
        except ValueError:continue
        if best is None or len(sample[0])>len(best[0]):best=sample
        if not sample[1]:return sample
    if best is None:raise RuntimeError('fresh_api_response_missing_or_rejected')
    return best


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--snapshot',default='https://lyzbcy.github.io/assets/data/content-dashboard.json')
    p.add_argument('--platforms',default='all');p.add_argument('--daemon-url',default='http://127.0.0.1:10086')
    p.add_argument('--bindings',help='Verified registration amendments, never auth headers')
    p.add_argument('--output',required=True);p.add_argument('--report',required=True)
    a=p.parse_args();start=time.monotonic()
    if a.snapshot.startswith('https://'):
        with urllib.request.urlopen(a.snapshot,timeout=15) as response:data=json.load(response)
    else:data=json.loads(Path(a.snapshot).read_text(encoding='utf-8'))
    pubs=[dict(pub) for c in data['contents'] for pub in c['publications']]
    amendments=json.loads(Path(a.bindings).read_text(encoding='utf-8')).get('publications',[]) if a.bindings else []
    amendments={r['id']:r for r in amendments}
    pubs=[dict(p,**{k:v for k,v in amendments.get(p['id'],{}).items() if k!='id'}) for p in pubs]
    selected=list(PROFILES)+['bilibili'] if a.platforms=='all' else a.platforms.split(',')
    if set(selected)-set(PROFILES)-{'bilibili'}:p.error('Unknown platform')
    b=Bridge(a.daemon_url);observations=[];report={'platforms':{},'errors':[]}
    report['phase']='refreshing_native_api_requests';atomic_json(a.report,report)
    seen=prepare_requests(b,selected,pubs)
    for platform in selected:
        report['current_platform']=platform
        atomic_json(a.report,report)
        rows=[p for p in pubs if p['platform']==platform]
        if not rows:
            report['platforms'][platform]={'status':'no_registered_publication','samples':0};continue
        try:
            if platform=='bilibili':samples=[fetch_bilibili(p) for p in rows];missing=[]
            else:samples,missing=collect_api(b,platform,rows,seen.get(platform))
            observations.extend(samples)
            report['platforms'][platform]={'status':'ok' if not missing else 'partial','samples':len(samples),'missing':missing}
            if missing:report['errors'].append({'platform':platform,'reason':'registered_identity_missing'})
        except Exception as error:
            report['platforms'][platform]={'status':'failed','samples':0}
            report['errors'].append({'platform':platform,'reason':str(error)[:150]})
        atomic_json(a.report,report)
    # Standard import only: no generated JSON editing and no fabricated samples.
    atomic_json(a.output,{'publications':list(amendments.values()),'snapshots':observations})
    report.update(ok=not report['errors'],samples=len(observations),elapsed_seconds=round(time.monotonic()-start,3))
    atomic_json(a.report,report);print(json.dumps(report,ensure_ascii=False))
    return 0 if report['ok'] else 1


if __name__=='__main__':raise SystemExit(main())
