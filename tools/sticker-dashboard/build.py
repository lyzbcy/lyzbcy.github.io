"""Allowlisted, deterministic export of private WeChat observations."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import shutil
import re
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
    single_rows=[]
    reports_covered=0
    report_dates=Counter()
    shard_payloads={}
    report_scope=raw.get('reports_collection',{})
    if report_scope and not report_scope.get('complete'):
        raise ValueError('Incomplete report collection cannot replace public snapshot')
    if report_scope and any(r['StikerID'] not in raw.get('reports',{}) or r['StikerID'] not in raw.get('details',{}) for r in rows if r['Status']==7):
        raise ValueError('Daily report scope is missing an online album')
    shards=ROOT/'assets/data/sticker-albums'
    shards.mkdir(parents=True,exist_ok=True)
    preview_target=ROOT/'assets/sticker-dashboard/previews'
    preview_target.mkdir(parents=True,exist_ok=True)
    for r in rows:
        sid=r['StikerID']
        if not re.fullmatch(r'[A-Za-z0-9_-]{1,120}',sid):raise ValueError('Unsafe platform ID')
        detail=raw.get('details',{}).get(sid,{})
        if detail and detail.get('StikerID') != sid:
            raise ValueError('Detail identity mismatch')
        report=raw.get('reports',{}).get(sid,{})
        if report and report.get('Summary',{}).get('StikerID') != sid:
            raise ValueError('Report identity mismatch')
        daily={}
        seen=set()
        for metric in report.get('Report',[]):
            md5=metric.get('Md5','').lower()
            date=metric.get('DataTime')
            sends=count(metric.get('SendNum'))
            if not date or sends is None or (md5,date) in seen:raise ValueError('Invalid or duplicate single-sticker metric')
            seen.add((md5,date))
            daily.setdefault(md5,[]).append({'date':date,'sends':sends})
        if report:reports_covered+=1
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
            records=daily.get(item.get('md5','').lower(),[])
            metric=records[0] if len(records)==1 else {}
            stickers.append({'index':i,'meaning':unit(item.get('meaning',{})), 'preview':src,
                             'daily_sends':metric.get('sends'), 'daily_date':metric.get('date'), 'daily_records':records})
            for metric in records:
                single_rows.append([sid,i,unit(item.get('meaning',{})),metric['date'],metric['sends'],src])
                report_dates[metric['date']]+=1
        shard_url=None
        if stickers:
            shard_url='/assets/data/sticker-albums/'+sid+'.json'
            shard_payloads[sid]=json.dumps({'schema':1,'id':sid,'name':r['Name'],'stickers':stickers,'wechat_url':detail.get('WxappJumpUrl') or None},ensure_ascii=False,separators=(',',':'))
        downloads=count(r.get('TotalDownloadNum'))
        sends=count(r.get('TotalSendNum'))
        try:
            reward_yuan_list=float(r.get('Rewards') or 0)
        except ValueError:
            reward_yuan_list=None
        albums.append({'id':sid,'name':r['Name'],'status':STATUS.get(r['Status'],'未知状态'),
                       'downloads':downloads,'sends':sends,'ratio':round(sends/downloads,2) if downloads and sends is not None else None,
                       'opened_at':r.get('OpenTime') or None,'platform_data_at':r.get('DataTime') or None,
                       'reward_yuan':reward_yuan_list,
                       'preview_count':len(previews),'stickers':stickers if previews else [],
                       'sticker_count':len(stickers),'detail_url':shard_url,
                       'wechat_url': (detail.get('WxappJumpUrl') or None) if previews else None})
    # 历史保留：平台单图日报只含最近统计日；旧日期逐条并入新导出，不整体覆盖。
    # 同(专辑,单图,统计日)以新报告为准；统计日最多保留 31 个（约一个月滚动窗口）。
    daily_target = ROOT / 'assets/data/sticker-daily.json'
    merged_rows = list(single_rows)
    ordered_dates = list(report_dates.keys())
    if daily_target.exists():
        try:
            prev = json.loads(daily_target.read_text('utf8'))
            prev_ids = list(prev.get('album_ids', []))
            prev_dates = list(prev.get('date_labels', []))
            current_keys = {(r[0], r[1], r[3]) for r in single_rows}
            for r in prev.get('rows', []):
                ai, idx, meaning, di, sends, preview = r
                if not (isinstance(ai, int) and isinstance(di, int)):
                    continue
                if ai >= len(prev_ids) or di >= len(prev_dates):
                    continue
                sid, date = prev_ids[ai], prev_dates[di]
                if (sid, idx, date) in current_keys:
                    continue
                merged_rows.append([sid, idx, meaning, date, sends, preview])
                if date not in ordered_dates:
                    ordered_dates.append(date)
        except (ValueError, KeyError, TypeError, OSError):
            pass
    if len(ordered_dates) > 31:
        keep = set(ordered_dates[:31])
        merged_rows = [r for r in merged_rows if r[3] in keep]
        ordered_dates = ordered_dates[:31]
    single_rows = merged_rows
    report_dates = Counter(r[3] for r in single_rows)
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
    # 收益排行榜：收入 = 赞赏(元) + 热度(豆)/10 × 0.9（口径 2026-11-14 用户提供）。
    # income 快照缺失时保留上一版排行榜，不用空数据覆盖。
    income = raw.get('income') or {}
    old_revenue = None
    if data_path.exists():
        try:
            old_revenue = json.loads(data_path.read_text('utf8')).get('revenue')
        except (ValueError, OSError, KeyError):
            old_revenue = None
    revenue_block = None
    income_rows = income.get('list') or []
    tips_total = sum(a.get('reward_yuan') or 0 for a in albums)
    if income_rows and not income.get('error'):
        reward_by_id, heat_by_id = {}, {}
        for it in income_rows:
            sid = it.get('StikerID')
            if not sid:
                continue
            heat_by_id[sid] = heat_by_id.get(sid, 0.0) + float(it.get('Hot') or 0)
        leaderboard = []
        total_reward = total_heat_income = 0.0
        for a in albums:
            reward_yuan = round(a.get('reward_yuan') or 0.0, 2)
            hot = heat_by_id.get(a['id'], 0.0)
            heat_income = round(hot / 10.0 * 0.9, 2)
            rev = round(reward_yuan + heat_income, 2)
            a['reward_yuan'] = reward_yuan
            a['hot_beans'] = int(hot)
            a['revenue_yuan'] = rev
            total_reward += reward_yuan
            total_heat_income += heat_income
            if rev > 0:
                leaderboard.append({'id': a['id'], 'name': a['name'], 'revenue': rev,
                                    'reward': reward_yuan, 'hot': int(hot)})
        leaderboard.sort(key=lambda x: (-x['revenue'], -x['reward'], x['id']))
        total_hot = float(income.get('summary', {}).get('total_hot') or 0)
        account_heat = round(total_hot / 10.0 * 0.9, 2)
        revenue_block = {'schema': 1,
                         'formula': '收入(元) = 赞赏(元) + 热度(豆)/10 × 0.9',
                         'captured_at': income.get('captured_at') or raw['captured_at'],
                         'total_yuan': round(total_reward + account_heat, 2),
                         'reward_yuan': round(total_reward, 2),
                         'heat_income_yuan': account_heat,
                         'total_hot': int(total_hot),
                         'albums_with_income': sum(1 for a in albums if a.get('revenue_yuan', 0) > 0),
                         'account_tips_note': '平台收益页按套的热度列当前全为 0，热度收益暂只能账号级展示，不参与按弹排名',
                         'leaderboard': leaderboard[:20]}
    else:
        revenue_block = old_revenue
    if revenue_block:
        summary['revenue_yuan'] = revenue_block.get('total_yuan')
    cached_images=sum(bool(p.get('file')) for pp in raw.get('previews',{}).values() for p in pp)
    direct_images=sum(bool(p.get('public_url')) for pp in raw.get('previews',{}).values() for p in pp)
    result={'schema':1,'captured_at':raw['captured_at'],'source':'微信表情开放平台 / 表情包一键制作',
            'source_fingerprint':hashlib.sha256(json.dumps(rows,sort_keys=True).encode()).hexdigest(),
            'summary':summary,'history':history[-90:],'albums':albums,'revenue':revenue_block,
            'single_metrics':{'url':'/assets/data/sticker-daily.json','albums':reports_covered,'scope':sum(r['Status']==7 for r in rows),'records':len(single_rows),'dates':dict(report_dates),'period_kind':'platform_daily'},
            'media':{'mode':'direct_first_limited_cache','direct_links':'仅采用无登录、博客Referer验证通过的图片直链',
                     'preview_albums':sum(bool(a['preview_count']) for a in albums),
                     'preview_images':sum(a['preview_count'] for a in albums),'cached_images':cached_images,'direct_images':direct_images}}
    data_path.parent.mkdir(exist_ok=True)
    for sid,payload in shard_payloads.items():
        shard=shards/(sid+'.json')
        temporary=shard.with_suffix('.tmp')
        temporary.write_text(payload,encoding='utf8')
        temporary.replace(shard)
    tmp=data_path.with_suffix('.tmp')
    tmp.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    tmp.replace(data_path)
    single_rows.sort(key=lambda r:(-r[4],r[0],r[1],r[3]))
    album_ids=sorted({r[0] for r in single_rows})
    album_indices={sid:i for i,sid in enumerate(album_ids)}
    date_labels=list(report_dates)
    date_indices={date:i for i,date in enumerate(date_labels)}
    compact_rows=[[album_indices[r[0]],r[1],r[2],date_indices[r[3]],r[4],r[5]] for r in single_rows]
    singles={'schema':1,'captured_at':raw['captured_at'],'period_kind':'platform_daily','columns':['album_index','index','meaning','date_index','sends','preview'],'album_ids':album_ids,'date_labels':date_labels,'dates':dict(report_dates),'rows':compact_rows}
    target=ROOT/'assets/data/sticker-daily.json'
    tmp=target.with_suffix('.tmp')
    tmp.write_text(json.dumps(singles,ensure_ascii=False,separators=(',',':')),encoding='utf8')
    tmp.replace(target)
    print(json.dumps({'summary':summary,'media':result['media'],'json_bytes':data_path.stat().st_size},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser()
    p.add_argument('--private-dir',type=Path,required=True)
    build(p.parse_args().private_dir)
