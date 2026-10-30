"""Content/publication registry and append-only measurements. Python stdlib only."""
import argparse
import datetime as dt
import json
import math
import sqlite3
from pathlib import Path

TZ = dt.timezone(dt.timedelta(hours=8))
METRICS = ('views', 'likes', 'comments', 'favorites', 'shares', 'follower_gain')


def stamp(value):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    if parsed.tzinfo is None:
        raise ValueError('Timestamp requires timezone')
    return parsed.astimezone(TZ).isoformat(timespec='seconds')


def connect(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.executescript('''
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS content(id TEXT PRIMARY KEY, title TEXT NOT NULL, series TEXT, cover TEXT);
    CREATE TABLE IF NOT EXISTS publication(
      id TEXT PRIMARY KEY, content_id TEXT NOT NULL REFERENCES content(id), platform TEXT NOT NULL,
      account_label TEXT, format TEXT NOT NULL, native_id TEXT, url TEXT,
      published_at TEXT, status TEXT NOT NULL, collection TEXT, activity TEXT, source_title TEXT, api_native_id TEXT);
    CREATE UNIQUE INDEX IF NOT EXISTS native_post ON publication(platform,native_id) WHERE native_id IS NOT NULL;
    CREATE TABLE IF NOT EXISTS snapshot(
      publication_id TEXT REFERENCES publication(id), observed_at TEXT NOT NULL,
      data_as_of TEXT NOT NULL, source TEXT NOT NULL, metrics TEXT NOT NULL,
      PRIMARY KEY(publication_id,observed_at,source));
    ''')
    if 'api_native_id' not in {r[1] for r in db.execute('PRAGMA table_info(publication)')}:
        db.execute('ALTER TABLE publication ADD COLUMN api_native_id TEXT')
    db.execute('CREATE UNIQUE INDEX IF NOT EXISTS api_native_post ON publication(platform,api_native_id) WHERE api_native_id IS NOT NULL')
    return db


def ingest(db, data):
    """Validate the entire import before mutating it; failed imports roll back."""
    rows = data.get('snapshots', [])
    for row in rows:
        row['observed_at'] = stamp(row['observed_at'])
        row['data_as_of'] = stamp(row.get('data_as_of', row['observed_at']))
        if row['data_as_of'] > row['observed_at']:
            raise ValueError('Measurement cannot be newer than observation')
        for key, value in row['metrics'].items():
            if key not in METRICS or (value is not None and (isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0)):
                raise ValueError('Invalid metric: ' + key)
    with db:
        for row in data.get('contents', []):
            db.execute('INSERT INTO content VALUES(:id,:title,:series,:cover) ON CONFLICT(id) DO UPDATE SET title=excluded.title,series=excluded.series,cover=excluded.cover', row)
        for row in data.get('publications', []):
            if row['format'] not in ('video', 'article'):
                raise ValueError('Unknown format')
            row = dict(row)
            if row.get('published_at'):
                row['published_at'] = stamp(row['published_at'])
            columns = ('id','content_id','platform','account_label','format','native_id','url','published_at','status','collection','activity','source_title','api_native_id')
            # Publication identity cannot silently switch to another content/account.
            existing = db.execute('SELECT content_id,platform,account_label,native_id,api_native_id FROM publication WHERE id=?',(row['id'],)).fetchone()
            if existing:
                row['account_label']=row.get('account_label') or existing['account_label']
                if tuple(existing)[:3] != tuple(row.get(k) for k in ('content_id','platform','account_label')):
                    raise ValueError('Publication identity changed')
                if existing['native_id'] and row.get('native_id') and existing['native_id']!=row['native_id']:
                    raise ValueError('Native publication identity changed')
                if existing['api_native_id'] and row.get('api_native_id') and existing['api_native_id']!=row['api_native_id']:
                    raise ValueError('Metric API identity changed')
            values = [row.get(k) for k in columns]
            db.execute('INSERT INTO publication VALUES('+','.join('?' for _ in columns)+') ON CONFLICT(id) DO UPDATE SET native_id=COALESCE(excluded.native_id,publication.native_id),api_native_id=COALESCE(excluded.api_native_id,publication.api_native_id),url=COALESCE(excluded.url,publication.url),status=CASE WHEN publication.status="published" AND excluded.status="submitted" THEN publication.status ELSE excluded.status END,published_at=COALESCE(excluded.published_at,publication.published_at),collection=COALESCE(excluded.collection,publication.collection),activity=COALESCE(excluded.activity,publication.activity),source_title=COALESCE(excluded.source_title,publication.source_title)', values)
        for row in rows:
            values=(row['publication_id'],row['observed_at'],row['data_as_of'],row['source'],json.dumps(row['metrics'],sort_keys=True))
            old=db.execute('SELECT metrics,data_as_of FROM snapshot WHERE publication_id=? AND observed_at=? AND source=?',(values[0],values[1],values[3])).fetchone()
            if old and (old['metrics'] != values[4] or old['data_as_of'] != values[2]):
                raise ValueError('An observed snapshot is immutable')
            db.execute('INSERT OR IGNORE INTO snapshot VALUES(?,?,?,?,?)',values)


def import_douyin(db, source):
    """Explicit ID, exact export title, or explicit title prefix + publish minute."""
    observed=stamp(source['generated_at'])
    snapshots=[]
    for pub in db.execute("SELECT * FROM publication WHERE platform='douyin'"):
        def matches(w):
            if pub['native_id'] and str(w.get('item_id')) == pub['native_id']:
                return True
            if not pub['source_title']:
                return False
            if w.get('title') == pub['source_title']:
                return True
            # Export titles include a truncated description. A prefix alone is
            # insufficient: the explicitly registered publication minute must match.
            try:
                minute=stamp(w['publish_time'].replace(' ','T')+'+08:00')[:16]
                return w.get('title','').startswith(pub['source_title']+' ') and minute == pub['published_at'][:16]
            except (ValueError,KeyError,TypeError):
                return False
        rows=[w for w in source.get('all_works',[]) if matches(w)]
        if len(rows) != 1:
            continue
        row=rows[0]
        snapshots.append(dict(publication_id=pub['id'],observed_at=observed,data_as_of=observed,
            source='douyin-creator-export',metrics={k:row.get('play_count' if k=='views' else k) for k in METRICS}))
    ingest(db,{'snapshots':snapshots})
    return len(snapshots)


def export(db):
    contents=[]
    for c in db.execute('SELECT * FROM content ORDER BY id DESC'):
        content=dict(c); pubs=[]
        for p in db.execute('SELECT * FROM publication WHERE content_id=? ORDER BY format DESC,platform',(c['id'],)):
            pub=dict(p); samples=[]
            for s in db.execute('SELECT * FROM snapshot WHERE publication_id=? ORDER BY data_as_of,observed_at',(p['id'],)):
                item=dict(s);item['metrics']=json.loads(item['metrics']);samples.append(item)
            pub['snapshots']=samples;pub['latest']=samples[-1] if samples else None
            # Real samples only: do not interpolate missing 24h/7d observations.
            pub['windows']={}
            if p['published_at']:
                birth=dt.datetime.fromisoformat(p['published_at'])
                for hours in (24,168):
                    target=birth+dt.timedelta(hours=hours)
                    candidates=[s for s in samples if abs((dt.datetime.fromisoformat(s['data_as_of'])-target).total_seconds())<=3600]
                    pub['windows'][str(hours)]=min(candidates,key=lambda s:abs((dt.datetime.fromisoformat(s['data_as_of'])-target).total_seconds())) if candidates else None
            pubs.append(pub)
        content['publications']=pubs;contents.append(content)
    return {'schema':1,'generated_at':dt.datetime.now(TZ).isoformat(timespec='seconds'),'contents':contents,
            'definitions':{'views':'平台原始播放/阅读/曝光，门槛不同，不代表跨平台去重人数','missing':'null 为未采集或不支持，不是 0','window':'24h/7d 只使用目标时点前后1小时内的真实采样',
            'platform_views':{'x':'帖子浏览/曝光，不是视频播放','wechat_official':'当前接口为近30天阅读人数UV，不是累计阅读次数','zhihu':'内容分析PV；赞列为赞同数'}}}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db',required=True)
    sub=parser.add_subparsers(dest='action',required=True)
    sub.add_parser('import').add_argument('file')
    sub.add_parser('douyin').add_argument('file')
    sub.add_parser('export').add_argument('file')
    args=parser.parse_args(); db=connect(args.db)
    try:
        if args.action=='import':ingest(db,json.loads(Path(args.file).read_text(encoding='utf-8-sig')))
        elif args.action=='douyin':print('Matched publications:',import_douyin(db,json.loads(Path(args.file).read_text(encoding='utf-8-sig'))))
        else:
            out=Path(args.file);out.parent.mkdir(parents=True,exist_ok=True)
            temp=out.with_suffix(out.suffix+'.tmp');temp.write_text(json.dumps(export(db),ensure_ascii=False,indent=2)+'\n',encoding='utf-8');temp.replace(out)
    finally:db.close()


if __name__=='__main__':main()
