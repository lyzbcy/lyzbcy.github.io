import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from content_metric_adapters import normalize
from collect_content_browser import request_matches,profile_url,collect_api

class AddedPlatformTests(unittest.TestCase):
 def pub(self,**extra):return dict(id='p',native_id='public-id',url='https://weibo.com/123/public-id',**extra)
 def test_kuaishou_actual_zero_and_unsupported_metrics(self):
  rows,missing=normalize('kuaishou',{'result':1,'data':{'list':[{'workId':'public-id','playCount':0,'likeCount':0,'commentCount':0}]}},[self.pub()])
  self.assertFalse(missing);self.assertEqual(rows[0]['metrics']['views'],0)
  self.assertIsNone(rows[0]['metrics']['shares']);self.assertIsNone(rows[0]['metrics']['favorites'])
 def test_weibo_reads_not_video_plays(self):
  payload={'ok':1,'data':{'list':[{'mblogid':'public-id','idstr':'9007199254740993123','user':{'idstr':'123'},'reads_count':77,'attitudes_count':0,'comments_count':0,'reposts_count':0,'page_info':{'media_info':{'play_count':999}}}]}}
  rows,missing=normalize('weibo',payload,[self.pub()]);self.assertFalse(missing)
  self.assertEqual(rows[0]['metrics']['views'],77);self.assertIn('post-read',rows[0]['source'])
  self.assertIsNone(rows[0]['metrics']['favorites'])
  payload['data']['list'][0]['user']['idstr']='999'
  self.assertEqual(normalize('weibo',payload,[self.pub()])[0],[])
 def test_missing_counter_is_not_fabricated_zero(self):
  payload={'ok':1,'data':{'list':[{'mblogid':'public-id','user':{'idstr':'123'},'attitudes_count':0}]}}
  rows,_=normalize('weibo',payload,[self.pub()]);self.assertIsNone(rows[0]['metrics']['views'])
  rows,missing=normalize('kuaishou',{'result':1,'data':{'list':[{'workId':'other','playCount':9}]}},[self.pub()]);self.assertFalse(rows);self.assertEqual(missing,['p'])
 def test_login_or_schema_errors_do_not_produce_samples(self):
  for platform,payload in [('kuaishou',{'result':-1}),('weibo',{'ok':0}),('kuaishou',{'result':1,'data':{}}),('weibo',{'ok':1,'data':{'list':None}})]:
   with self.subTest(platform=platform,payload=payload),self.assertRaises(ValueError):normalize(platform,payload,[self.pub()])
 def test_capture_only_exact_read_endpoints(self):
  for platform,url,method in [('kuaishou','https://cp.kuaishou.com/rest/cp/works/v2/video/pc/photo/list','POST'),('weibo','https://weibo.com/ajax/statuses/mymblog?uid=123','GET')]:
   req={'url':url,'method':method,'status':200};self.assertTrue(request_matches(platform,req))
   for change in [{'url':url.replace('.com/','.com.evil/')} ,{'method':'DELETE'},{'url':url.replace('/list','/list/delete') if platform=='kuaishou' else url.replace('mymblog','destroy')}]:
    self.assertFalse(request_matches(platform,dict(req,**change)))
 def test_weibo_profile_uses_verified_account_in_post_url(self):
  self.assertEqual(profile_url('weibo',[self.pub()]),'https://weibo.com/u/123')
  p=self.pub();p['url']='https://weibo.com/unverified';
  with self.assertRaises(ValueError):profile_url('weibo',[p])
 def test_separate_youtube_native_lists_are_merged_by_registered_identity(self):
  class Bridge:
   def call(self,action,args=None):
    if action=='find_tab':return {}
    if action=='network' and args['cmd']=='list':return {'requests':[{'requestId':rid,'method':'POST','status':200,'url':'https://studio.youtube.com/youtubei/v1/creator/list_creator_videos'} for rid in ['long','short']]}
    if action=='network' and args['cmd']=='detail':return {'body':{'videos':[{'videoId':args['requestId'],'publicMetrics':{'externalViewCount':'258' if args['requestId']=='short' else '0'}}]}}
    raise AssertionError(action)
  pubs=[{'id':rid,'native_id':rid} for rid in ['long','short']]
  rows,missing=collect_api(Bridge(),'youtube',pubs,old_ids={'prior'})
  self.assertFalse(missing);self.assertEqual({r['publication_id']:r['metrics']['views'] for r in rows},{'long':0,'short':258})

if __name__=='__main__':unittest.main()
