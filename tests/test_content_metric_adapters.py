import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from content_metric_adapters import normalize,number
from collect_content_browser import request_matches,collect_api


class AdapterTests(unittest.TestCase):
    def pub(self,native='id',**extra):return dict(id='publication',native_id=native,**extra)
    def test_eight_live_contracts_normalize_true_zero(self):
        fixtures={
         'douyin':{'status_code':0,'aweme_list':[{'aweme_id':'id','statistics':{'play_count':0}}]},
         'xiaohongshu':{'code':0,'success':True,'data':{'notes':[{'id':'id','view_count':0}]}},
         'youtube':{'videos':[{'videoId':'id','publicMetrics':{'externalViewCount':'0'}}]},
         'wechat_channels':{'errCode':0,'data':{'list':[{'objectId':'id','readCount':0}]}},
         'wechat_official':{'base_resp':{'ret':0},'article_list':[{'msg_id':'id','item_idx':1,'total_read_uv':0}]},
         'x':{'data':{'rest_id':'id','legacy':{'favorite_count':0},'views':{'count':'0'}}},
         'zhihu':{'data':[{'article':{'url_token':'id'},'pv':0}]},
         'juejin':{'err_no':0,'data':[{'article_id':'id','article_info':{'view_count':0}}]}}
        for platform,payload in fixtures.items():
            with self.subTest(platform=platform):
                p=self.pub('id_1' if platform=='wechat_official' else 'id')
                rows,missing=normalize(platform,payload,[p]);self.assertFalse(missing)
                self.assertEqual(rows[0]['metrics']['views'],0)
                self.assertIsNone(rows[0]['metrics']['follower_gain'])
    def test_other_account_or_missing_counter_is_not_zero(self):
        rows,missing=normalize('youtube',{'videos':[{'videoId':'other','publicMetrics':{'externalViewCount':'999'}}]},[self.pub()])
        self.assertEqual(rows,[]);self.assertEqual(missing,['publication'])
        rows,missing=normalize('youtube',{'videos':[{'videoId':'id','publicMetrics':{}}]},[self.pub()])
        self.assertFalse(rows);self.assertTrue(missing)
    def test_explicit_channel_binding_requires_description_and_exact_time(self):
        payload={'errCode':0,'data':{'list':[{'objectId':'new-token','createTime':1793361505,'desc':{'description':'Exact title\nBody'},'readCount':7}]}}
        p=self.pub(source_title='Exact title',published_at='2026-10-30T19:58:25+08:00')
        self.assertEqual(normalize('wechat_channels',payload,[p])[0][0]['metrics']['views'],7)
        p['published_at']='2026-10-30T19:58:26+08:00';self.assertFalse(normalize('wechat_channels',payload,[p])[0])
    def test_mp_source_and_observation_dates_remain_distinct(self):
        payload={'base_resp':{'ret':0},'article_list':[{'msg_id':1,'item_idx':1,'total_read_uv':12}]}
        rows,_=normalize('wechat_official',payload,[self.pub('1_1')],observed_at='2026-10-31T02:00:00+08:00',data_as_of='2026-10-30T23:59:59+08:00')
        self.assertIn('30d-read-uv',rows[0]['source']);self.assertNotEqual(rows[0]['data_as_of'],rows[0]['observed_at'])
    def test_bad_and_rejected_counters_fail(self):
        for value in [-1,True,'1.2万',float('nan')]:
            with self.assertRaises(ValueError):number(value)
        with self.assertRaises(ValueError):normalize('xiaohongshu',{'code':-100,'success':False},[self.pub()])
    def test_public_slug_is_not_replaced_by_metric_api_id(self):
        payload={'base_resp':{'ret':0},'article_list':[{'msg_id':1,'item_idx':1,'total_read_uv':12}]}
        pub=self.pub('public-shortlink-slug',api_native_id='1_1')
        rows,missing=normalize('wechat_official',payload,[pub]);self.assertFalse(missing)
        self.assertEqual(rows[0]['metrics']['views'],12);self.assertEqual(pub['native_id'],'public-shortlink-slug')
    def test_capture_ignores_wrong_content_type_or_action(self):
        request={'url':'https://www.zhihu.com/api/v4/creators/analysis/realtime/content/list?type=answer','method':'GET','status':200}
        self.assertFalse(request_matches('zhihu',request))
        request['url']=request['url'].replace('answer','article');self.assertTrue(request_matches('zhihu',request))
        request={'url':'https://mp.weixin.qq.com/misc/appmsganalysis?action=report','method':'GET','status':200}
        self.assertFalse(request_matches('wechat_official',request))
    def test_empty_latest_filter_does_not_hide_matching_published_response(self):
        class FakeBridge:
            def call(self,action,args=None):
                if action=='find_tab':return {}
                if action=='network' and args['cmd']=='list':
                    return {'requests':[{'requestId':rid,'method':'GET','status':200,'url':'https://creator.douyin.com/janus/douyin/creator/pc/work_list'} for rid in ['published','empty-filter']]}
                if action=='network' and args['cmd']=='detail':
                    rows=[] if args['requestId']=='empty-filter' else [{'aweme_id':'id','statistics':{'play_count':7}}]
                    return {'body':{'status_code':0,'aweme_list':rows}}
                raise AssertionError(action)
        samples,missing=collect_api(FakeBridge(),'douyin',[self.pub()],old_ids={'previous-run'})
        self.assertFalse(missing);self.assertEqual(samples[0]['metrics']['views'],7)


if __name__=='__main__':unittest.main()
