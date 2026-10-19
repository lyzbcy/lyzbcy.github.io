import test from 'node:test';
import assert from 'node:assert/strict';
import {COMMENT_LIST_PATH, isUnrepliedRequest, decodeCommentPage, fetchUnrepliedViaApi, requestHeadersForApi} from '../src/lib/comment-api.mjs';
const template = 'https://creator.douyin.com'+COMMENT_LIST_PATH+'?aweme_id=123&cursor=0&count=10&comment_select_options=0,not_replied';
const c = id => ({cid:id,aweme_id:'123',text:'测试评论',user:{nickname:'测试用户'}});
test('HTTP2 pseudo headers and cookie are excluded, browser context headers remain',()=>{
  assert.deepEqual(requestHeadersForApi({':authority':'creator.douyin.com',':method':'GET',cookie:'private',referer:'https://creator.douyin.com/', 'user-agent':'browser'}),{referer:'https://creator.douyin.com/','user-agent':'browser'});
});
test('only authenticated creator unreplied route is accepted',()=>{
  assert.ok(isUnrepliedRequest(template));
  assert.equal(isUnrepliedRequest(template.replace('0,not_replied','0')),false);
  assert.equal(isUnrepliedRequest(template.replace('creator.douyin.com','example.com')),false);
});
test('null comments with zero total is a confirmed empty result',()=>{
  assert.deepEqual(decodeCommentPage({status_code:0,comments:null,has_more:0,total:0,cursor:10},'123').comments,[]);
});
test('missing schema or authorization is not converted to empty',()=>{
  assert.throws(()=>decodeCommentPage({status_code:8},'123'),/LOGIN_EXPIRED/);
  assert.throws(()=>decodeCommentPage({status_code:0},'123'),/INVALID/);
  assert.throws(()=>decodeCommentPage({status_code:0,comments:null,has_more:0,total:3},'123'),/INVALID/);
});
test('wrong work ID or media-only comments request DOM fallback',()=>{
  assert.throws(()=>decodeCommentPage({status_code:0,comments:[c('a')],has_more:0,total:1},'456'),/UNSUPPORTED/);
  assert.throws(()=>decodeCommentPage({status_code:0,comments:[{...c('a'),text:''}],has_more:0,total:1},'123'),/UNSUPPORTED/);
});
test('pagination follows cursor and deduplicates stable comment IDs',async()=>{
  let index=0;
  const pages=[{comments:[c('a')],has_more:1,cursor:10},{comments:[c('a'),c('b')],has_more:0,cursor:20}];
  const request={get:async(url)=>{assert.equal(new URL(url).searchParams.get('cursor'),index?'10':'0');const body={status_code:0,total:2,...pages[index++]};return {status:()=>200,json:async()=>body};}};
  const result=await fetchUnrepliedViaApi(request,template,'123');
  assert.deepEqual(result.comments.map(x=>x.commentId),['a','b']);
});
test('non-advancing cursor fails instead of reporting a complete result',async()=>{
  const request={get:async()=>({status:()=>200,json:async()=>({status_code:0,comments:[c('a')],has_more:1,cursor:0,total:3})})};
  await assert.rejects(fetchUnrepliedViaApi(request,template,'123'),/cursor did not advance/);
});
test('HTTP failure is explicit',async()=>{
  await assert.rejects(fetchUnrepliedViaApi({get:async()=>({status:()=>403})},template,'123'),/HTTP/);
});
