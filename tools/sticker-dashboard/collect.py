"""Read the bound WeChat account through StickerEngine; never publish a work.

Raw API snapshots stay in --private-dir, outside the blog repository.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import time
from datetime import datetime, timedelta, timezone
import io
import json
from pathlib import Path
import sys
import types
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--engine-src', type=Path, required=True, help='Directory containing the sticker_engine package')
parser.add_argument('--dependency-dir', type=Path)
parser.add_argument('--private-dir', type=Path, required=True)
parser.add_argument('--preview-albums', type=int, default=3)
args = parser.parse_args()
if args.private_dir.resolve().is_relative_to(ROOT):
    parser.error('private-dir must be outside the public blog repository')
if not 0 <= args.preview_albums <= 10:
    parser.error('preview-albums must be 0..10')
if args.dependency_dir:
    sys.path.insert(0, str(args.dependency_dir))
sys.path.insert(0, str(args.engine_src))
# Import the read-only publishing modules without loading the generation stack.
pkg = types.ModuleType('sticker_engine')
pkg.__path__ = [str(args.engine_src / 'sticker_engine')]
pkg.resources_path = lambda: args.engine_src / 'sticker_engine/resources'
sys.modules['sticker_engine'] = pkg
from sticker_engine.publish.browser import BrowserSession
from sticker_engine.publish.config import PublishConfig
from sticker_engine.publish.platform_data import LIST_URL, PlatformDataError, parse_list, read_detail, read_json
from sticker_engine.publish.parallel_read import iter_details_parallel
from sticker_engine.publish.sticker_metrics import parse_report, save_snapshot
from sticker_engine.config.paths import resolve_paths, current_platform
from playwright.sync_api import sync_playwright
from PIL import Image

args.private_dir.mkdir(parents=True, exist_ok=True)
media = args.private_dir / 'previews'
media.mkdir(exist_ok=True)
now = lambda: datetime.now(timezone(timedelta(hours=8))).isoformat(timespec='seconds')
snapshot = {'schema': 1, 'captured_at': now(), 'details': {}, 'reports': {}, 'previews': {}, 'errors': [],
            'direct_link_check': {'status': 'login_required', 'checked_at': now()}}
with sync_playwright() as pw:
    session = BrowserSession(PublishConfig(), playwright=pw)
    anonymous = pw.request.new_context(extra_http_headers={'Referer':'https://lyzbcy.github.io/'})
    try:
        page = session.start(headless=True)
        body = None
        if session.can_reuse_session:
            try:
                body = read_json(page, LIST_URL)
            except PlatformDataError:
                pass
        if body is None:
            if not session.ensure_login(page):
                raise RuntimeError('WeChat login failed; previous public snapshot retained')
            body = read_json(page, LIST_URL)
        source_rows = body['List']
        if len({r['StikerID'] for r in source_rows}) != len(source_rows):
            raise ValueError('Duplicate platform IDs')
        def empty_placeholder(row):
            return (row.get('Status') == 0 and row.get('Name') == '' and not row.get('OpenTime')
                    and all(str(row.get(k)) == '0' for k in
                            ('TotalSendNum','TotalDownloadNum','SendNum','DownloadNum')))
        rows = parse_list({'base_resp': body['base_resp'],
                           'List': [r for r in source_rows if not empty_placeholder(r)]})
        snapshot['source_list_count'] = len(source_rows)
        snapshot['excluded_untitled_placeholder_count'] = len(source_rows)-len(rows)
        snapshot['list'] = {'base_resp': body['base_resp'], 'List': rows}
        print(json.dumps({'source_rows':len(source_rows),'named_albums':len(rows),
                          'online':sum(r['Status']==7 for r in rows)}),flush=True)
        selected = sorted((r for r in rows if r['Status'] == 7),
                          key=lambda r: (int(r['TotalSendNum']), int(r['TotalDownloadNum'])), reverse=True)[:10]
        for rank, row in enumerate(selected):
            sid = row['StikerID']
            detail = read_detail(page, sid)
            snapshot['details'][sid] = detail
            if rank >= args.preview_albums:
                continue
            try:
                snapshot['reports'][sid] = read_json(page, 'https://sticker.weixin.qq.com/cgi-bin/mmemoticon-bin/stikerreport?stikerid=' + quote(sid) + '&f=json')
            except Exception as exc:
                snapshot['errors'].append({'id': sid, 'kind': 'daily_report', 'error': type(exc).__name__})
            items = detail.get('StikerJson', {}).get('Item', [])
            snapshot['previews'][sid] = []
            for index, item in enumerate(items):
                url = 'https://sticker.weixin.qq.com/cgi-bin/mmemoticon-bin/getmedia?fileid=' + quote(item['bigurl'], safe='')
                public_response=anonymous.get(url,timeout=15000)
                try:
                    if public_response.ok:
                        Image.open(io.BytesIO(public_response.body())).verify()
                        snapshot['previews'][sid].append({'index':index+1,'public_url':url,'verified_at':now()})
                        continue
                except (ValueError, OSError):
                    pass
                finally:
                    public_response.dispose()
                response = page.context.request.get(url, timeout=15000)
                try:
                    content = response.body()
                    if not response.ok:
                        raise ValueError('media HTTP error')
                    image = Image.open(io.BytesIO(content))
                    image.seek(0)
                    image = image.convert('RGBA')
                    image.thumbnail((240, 240))
                    filename = sid + '-' + str(index + 1).zfill(2) + '.webp'
                    image.save(media / filename, 'WEBP', quality=76, method=6)
                    snapshot['previews'][sid].append({'index': index + 1, 'file': filename, 'direct_link_checked_at':now()})
                finally:
                    response.dispose()
            print(json.dumps({'rank': rank + 1, 'name': row['Name'], 'preview_count': len(items)}, ensure_ascii=False), flush=True)
        # Full numeric coverage does not require downloading the full image library.
        online=[r for r in rows if r['Status']==7]
        ids=[r['StikerID'] for r in online]
        missing=[sid for sid in ids if sid not in snapshot['details']]
        for sid,detail,error in iter_details_parallel(page,missing,lambda:False,lambda m:None):
            if error:
                raise RuntimeError('Single-sticker detail collection incomplete; retain previous snapshot')
            snapshot['details'][sid]=detail
        paths=resolve_paths(current_platform())
        binding=json.loads((paths.user_data/'resource_library/device.json').read_text('utf8'))
        account=binding['account_id']
        state = page.context.storage_state()
        def fetch_reports(batch):
            # A separate request context per worker; the browser login stays in memory.
            from playwright.sync_api import sync_playwright
            completed = []
            with sync_playwright() as worker:
                api = worker.request.new_context(storage_state=state)
                try:
                    for row in batch:
                        sid = row['StikerID']
                        url = 'https://sticker.weixin.qq.com/cgi-bin/mmemoticon-bin/stikerreport?stikerid=' + quote(sid) + '&f=json'
                        for attempt in range(3):
                            response = api.get(url, timeout=15000)
                            try:
                                if response.status in (429,503):
                                    raise RuntimeError('Daily reports throttled; retained previous public data')
                                report = response.json()
                                if response.ok and report.get('base_resp',{}).get('ret') == 0:
                                    completed.append((sid, report))
                                    break
                            finally:
                                response.dispose()
                            if attempt == 2:
                                raise RuntimeError('Daily report request failed: '+sid)
                            time.sleep(.35)
                finally:
                    api.dispose()
            return completed
        work = [r for r in online if r['StikerID'] not in snapshot['reports']]
        with ThreadPoolExecutor(max_workers=3) as workers:
            for offset in range(0, len(work), 30):
                group=work[offset:offset+30]
                for result in workers.map(fetch_reports,[group[i::3] for i in range(3)]):
                    snapshot['reports'].update(result)
                print(json.dumps({'daily_reports':len(snapshot['reports']),'scope':len(online)}),flush=True)
        for row in online:
            sid=row['StikerID']
            report=snapshot['reports'][sid]
            detail=snapshot['details'][sid]
            if report.get('Summary',{}).get('StikerID') != sid:
                raise RuntimeError('Daily report ID mismatch: '+sid)
            if report.get('Report') == []:
                # A successful empty report has no single-sticker data to publish.
                continue
            parsed=parse_report(report,detail,sid,row['Name'],account)
            current=json.loads((paths.user_data/'resource_library/device.json').read_text('utf8'))
            if current['account_id']!=account:raise RuntimeError('Bound account changed')
            save_snapshot(paths.user_data,account,parsed)
        # 收益明细：incomepage 分页拉全（每套赞赏/热度），失败不阻断主采集
        try:
            income_url = 'https://sticker.weixin.qq.com/cgi-bin/mmemoticon-bin/incomepage'
            start_ts, end_ts = 0, int(time.time()) + 366 * 86400
            income_list, page_num, total_pages = [], 1, 1
            income_summary = {}
            while page_num <= total_pages and page_num <= 400:
                resp = page.context.request.post(
                    income_url, timeout=20000,
                    multipart={'ReqType': 'all', 'StartTime': str(start_ts),
                               'EndTime': str(end_ts), 'PageNum': str(page_num),
                               'PageLimit': '50'})
                body = resp.json()
                if resp.status != 200 or body.get('base_resp', {}).get('ret') != 0:
                    raise RuntimeError('incomepage ret != 0')
                lst = body.get('StikerIncomeList', [])
                income_list.extend(lst)
                income_summary = {'total_reward_cents': body.get('TotalReward'),
                                  'total_hot': body.get('TotalHot'),
                                  'total_unaccounted_cents': body.get('TotalUnaccounted'),
                                  'total_pages': total_pages}
                total_pages = int(body.get('TotalPageNum') or 1)
                page_num += 1
            if page_num % 20 == 1:
                pass
            print(json.dumps({'income_pages': page_num - 1, 'income_records': len(income_list)}), flush=True)
            snapshot['income'] = {'summary': income_summary, 'list': income_list,
                                  'captured_at': now()}
        except Exception as exc:
            snapshot['income'] = {'error': type(exc).__name__ + ': ' + str(exc)[:80],
                                  'captured_at': now()}
            print(json.dumps({'income_error': str(exc)[:80]}), flush=True)
        snapshot['reports_collection']={'scope':'all_online','requested':len(ids),'successful':sum(s in snapshot['reports'] for s in ids),'complete':all(s in snapshot['reports'] for s in ids),'captured_at':now()}
        if not snapshot['reports_collection']['complete']:
            raise RuntimeError('Incomplete daily reports; previous public snapshot retained')
        snapshot['finished_at'] = now()
        tmp = args.private_dir / 'platform-private.tmp'
        tmp.write_text(json.dumps(snapshot, ensure_ascii=False), encoding='utf8')
        tmp.replace(args.private_dir / 'platform-private.json')
        print(json.dumps({'total': len(rows), 'statuses': dict(Counter(r['Status'] for r in rows)), 'errors': snapshot['errors']}, ensure_ascii=False))
    finally:
        anonymous.dispose()
        session.close()
