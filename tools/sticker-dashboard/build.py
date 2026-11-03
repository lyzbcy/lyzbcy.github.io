"""Allowlisted, deterministic export of private WeChat observations."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import shutil
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[2]
STATUS = {1:'已保存',2:'待审核',3:'审核中',4:'未通过审核',5:'审核通过',6:'已预约上架',7:'已上架',8:'已下架',9:'强制下架',10:'预约上架失败',11:'限制投稿'}

def count(value):
    if isinstance(value, bool) or not str(value).isdigit():
        return None
    return int(value)

def unit(value):
    if isinstance(value, str):
        try: value = json.loads(value)
        except ValueError: return ''
    return next((v.get('content','') for v in value.get('Unit',[]) if v.get('lang') == 'zh_cn'), '') if isinstance(value,dict) else ''

def build(private_dir):
    raw = json.loads((private_dir / 'platform-private.json').read_text('utf8'))
    rows = raw['list']['List']
    if raw['list'].get('base_resp',{}).get('ret') != 0 or not rows:
        raise ValueError('Empty or failed list cannot replace public data')
    if len({r['StikerID'] for r in rows}) != len(rows):
        raise ValueError('Duplicate platform IDs')
    albums=[]
    preview_target=ROOT/'assets/sticker-dashboard/previews'
    preview_target.mkdir(parents=True,exist_ok=True)
    for r in rows:
        sid=r['StikerID']
        detail=raw.get('details',{}).get(sid,{})
        if detail and detail.get('StikerID') != sid:
            raise ValueError('Detail identity mismatch')
        report=raw.get('reports',{}).get(sid,{})
        if report and report.get('Summary',{}).get('StikerID') != sid:
            raise ValueError('Report identity mismatch')
        daily={v.get('Md5','').lower():v for v in report.get('Report',[])}
        previews={x['index']:x for x in raw.get('previews',{}).get(sid,[])}
        stickers=[]
        for i,item in enumerate(detail.get('StikerJson',{}).get('Item',[]),1):
            preview=previews.get(i,{})
            filename=preview.get('file')
            src=None
            if preview.get('public_url'):
                u=urlsplit(preview['public_url'])
                if u.scheme!='https' or u.netloc!='sticker.weixin.qq.com' or u.path!='/cgi-bin/mmemoticon-bin/getmedia' or set(parse_qs(u.query))!={'fileid'} or not preview.get('verified_at'):
                    raise ValueError('Unverified or unsafe public image URL')
                src=preview['public_url']
            if filename:
                if Path(filename).name != filename or not filename.endswith('.webp'):
                    raise ValueError('Invalid preview filename')
                shutil.copyfile(private_dir/'previews'/filename,preview_target/filename)
                src='/assets/sticker-dashboard/previews/'+filename
            metric=daily.get(item.get('md5','').lower(),{})
            stickers.append({'index':i,'meaning':unit(item.get('meaning',{})), 'preview':src,
                             'daily_sends':count(metric.get('SendNum')), 'daily_date':metric.get('DataTime') or None})
        downloads=count(r.get('TotalDownloadNum'))
        sends=count(r.get('TotalSendNum'))
        albums.append({'id':sid,'name':r['Name'],'status':STATUS.get(r['Status'],'未知状态'),
                       'downloads':downloads,'sends':sends,'ratio':round(sends/downloads,2) if downloads and sends is not None else None,
                       'opened_at':r.get('OpenTime') or None,'platform_data_at':r.get('DataTime') or None,
                       'preview_count':len(previews),'stickers':stickers,
                       'wechat_url': detail.get('WxappJumpUrl') or None})
    albums.sort(key=lambda r:(-(r['sends'] or 0),-(r['downloads'] or 0),r['id']))
    # Preserve a small history of comparable full-list observations, never invent growth.
    data_path=ROOT/'assets/data/sticker-dashboard.json'
    history=[]
    if data_path.exists():
        old=json.loads(data_path.read_text('utf8'))
        history=old.get('history',[])
        old_map={r['id']:r for r in old['albums']}
        same_day=old.get('captured_at','')[:10] == raw['captured_at'][:10]
        for a in albums:
            prev=old_map.get(a['id'])
            if prev and (not same_day or prev.get('change_since')):
                a['change_since']=prev['change_since'] if same_day else old['captured_at']
                for metric,change in [('sends','send_change'),('downloads','download_change')]:
                    baseline=prev[metric]
                    if same_day:
                        baseline=baseline-prev[change] if baseline is not None and prev.get(change) is not None else None
                    a[change]=a[metric]-baseline if a[metric] is not None and baseline is not None else None
    summary={'total':len(albums),'statuses':dict(Counter(a['status'] for a in albums)),
             'downloads':sum(a['downloads'] or 0 for a in albums),'sends':sum(a['sends'] or 0 for a in albums),
             'download_coverage':sum(a['downloads'] is not None for a in albums),
             'send_coverage':sum(a['sends'] is not None for a in albums),
             'used_albums':sum((a['sends'] or 0)>0 for a in albums)}
    point={'captured_at':raw['captured_at'],**summary}
    history=[p for p in history if p['captured_at'][:10]!=raw['captured_at'][:10]]+[point]
    cached_images=sum(bool(p.get('file')) for pp in raw.get('previews',{}).values() for p in pp)
    direct_images=sum(bool(p.get('public_url')) for pp in raw.get('previews',{}).values() for p in pp)
    result={'schema':1,'captured_at':raw['captured_at'],'source':'微信表情开放平台 / 表情包一键制作',
            'source_fingerprint':hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),
            'summary':summary,'history':history[-90:],'albums':albums,
            'media':{'mode':'direct_first_limited_cache','direct_links':'仅采用无登录、博客Referer验证通过的图片直链',
                     'preview_albums':sum(bool(a['preview_count']) for a in albums),
                     'preview_images':sum(a['preview_count'] for a in albums),'cached_images':cached_images,'direct_images':direct_images}}
    data_path.parent.mkdir(exist_ok=True)
    tmp=data_path.with_suffix('.tmp')
    tmp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    tmp.replace(data_path)
    print(json.dumps({'summary':summary,'media':result['media'],'json_bytes':data_path.stat().st_size},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--private-dir',type=Path,required=True)
    build(p.parse_args().private_dir)
