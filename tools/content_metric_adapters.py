"""Normalize verified creator API responses, preserving null vs actual zero."""
import datetime as dt
from content_dashboard import TZ

FIELDS=('views','likes','comments','favorites','shares','follower_gain')
SOURCES={
 'douyin':'douyin-creator-api','xiaohongshu':'xiaohongshu-creator-api',
 'youtube':'youtube-studio-api','wechat_channels':'wechat-channels-creator-api',
 'wechat_official':'wechat-official-30d-read-uv-api','x':'x-post-impressions-api',
 'zhihu':'zhihu-creator-api','juejin':'juejin-creator-api'}


def number(value):
    if value is None:return None
    if isinstance(value,bool):raise ValueError('Boolean is not a metric')
    if isinstance(value,str):
        if not value.isdigit():raise ValueError('Metric string is not an integer')
        value=int(value)
    if not isinstance(value,(int,float)) or value<0 or value!=value or value==float('inf'):
        raise ValueError('Invalid metric')
    return value


def mapped(row, fields):
    return {key:number(row.get(fields[key])) if key in fields else None for key in FIELDS}


def tweets(obj):
    if isinstance(obj,dict):
        if 'rest_id' in obj and 'legacy' in obj and 'views' in obj:yield obj
        for value in obj.values():yield from tweets(value)
    elif isinstance(obj,list):
        for value in obj:yield from tweets(value)


def normalize(platform, payload, publications, observed_at=None, data_as_of=None):
    observed_at=observed_at or dt.datetime.now(TZ).isoformat(timespec='seconds')
    rows=[]
    if platform=='douyin':
        if payload.get('status_code')!=0:raise ValueError('Douyin request rejected')
        rows=[(str(r['aweme_id']),r.get('statistics',{}),r) for r in payload.get('aweme_list',[])]
        fields={'views':'play_count','likes':'digg_count','comments':'comment_count','favorites':'collect_count','shares':'share_count'}
    elif platform=='xiaohongshu':
        if payload.get('code')!=0 or not payload.get('success'):raise ValueError('Xiaohongshu request rejected')
        rows=[(r['id'],r,r) for r in payload.get('data',{}).get('notes',[])]
        fields={'views':'view_count','likes':'likes','comments':'comments_count','favorites':'collected_count','shares':'shared_count'}
    elif platform=='youtube':
        if 'videos' not in payload:raise ValueError('Studio videos missing or session expired')
        rows=[(r['videoId'],r.get('publicMetrics',{}),r) for r in payload['videos']]
        fields={'views':'externalViewCount','likes':'likeCount','comments':'commentCount'}
    elif platform=='wechat_channels':
        if payload.get('errCode')!=0:raise ValueError('Channels request rejected')
        rows=[(r['objectId'],r,r) for r in payload.get('data',{}).get('list',[])]
        fields={'views':'readCount','likes':'likeCount','comments':'commentCount','favorites':'favCount','shares':'forwardCount','follower_gain':'followCount'}
    elif platform=='wechat_official':
        if payload.get('base_resp',{}).get('ret')!=0:raise ValueError('Official Account request rejected')
        rows=[(str(r['msg_id'])+'_'+str(r['item_idx']),r,r) for r in payload.get('article_list',[])]
        fields={'views':'total_read_uv'}
    elif platform=='x':
        rows=[(r['rest_id'],dict(r['legacy'],impressions=r['views'].get('count')),r) for r in tweets(payload)]
        fields={'views':'impressions','likes':'favorite_count','comments':'reply_count','favorites':'bookmark_count','shares':'retweet_count'}
    elif platform=='zhihu':
        if 'data' not in payload:raise ValueError('Zhihu content analysis missing')
        rows=[(str(r.get('article',{}).get('url_token')),r,r) for r in payload['data'] if 'article' in r]
        fields={'views':'pv','likes':'upvote','comments':'comment','favorites':'collect','shares':'share','follower_gain':'new_follow_uv'}
    elif platform=='juejin':
        if payload.get('err_no')!=0:raise ValueError('Juejin request rejected')
        rows=[(str(r['article_id']),r.get('article_info',{}),r) for r in payload.get('data',[])]
        fields={'views':'view_count','likes':'digg_count','comments':'comment_count','favorites':'collect_count'}
    else:raise ValueError('Unknown adapter')
    snapshots=[];missing=[]
    for pub in publications:
        candidates=[r for r in rows if r[0]==str(pub.get('api_native_id') or pub.get('native_id'))]
        if not candidates and platform=='wechat_channels' and pub.get('source_title') and pub.get('published_at'):
            # Channels export tokens change; require two explicitly registered stable facts.
            candidates=[r for r in rows if r[2].get('desc',{}).get('description','').startswith(pub['source_title']) and
                dt.datetime.fromtimestamp(r[2]['createTime'],TZ)==dt.datetime.fromisoformat(pub['published_at'])]
        if len(candidates)!=1:
            missing.append(pub['id']);continue
        metrics=mapped(candidates[0][1],fields)
        if all(v is None for v in metrics.values()):
            missing.append(pub['id']);continue
        snapshots.append({'publication_id':pub['id'],'observed_at':observed_at,
            'data_as_of':data_as_of or observed_at,'source':SOURCES[platform],'metrics':metrics})
    return snapshots,missing
