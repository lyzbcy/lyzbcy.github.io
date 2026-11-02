import test from 'node:test';
import assert from 'node:assert/strict';
import {recoverReadOnlyUi,settlePending,boundedResponse} from '../src/lib/collection-runtime.mjs';
import {findTargetWorkWithRetry} from '../src/lib/works-panel.mjs';

test('transient read-only UI failure reloads once before a successful retry',async()=>{
  const events=[];let attempts=0;
  const result=await recoverReadOnlyUi(async()=>{events.push('read');if(++attempts===1)throw Error('locator.click timeout');return 'checked';},async()=>{events.push('reload');});
  assert.equal(result,'checked');assert.deepEqual(events,['read','reload','read']);
});
test('permanent page failure is attempted twice, not once per remaining work',async()=>{
  let calls=0,reloads=0;
  await assert.rejects(recoverReadOnlyUi(async()=>{calls++;throw Error('blocked');},async()=>{reloads++;}),/blocked/);
  assert.equal(calls,2);assert.equal(reloads,1);
});
test('expired login is not retried as a page failure',async()=>{
  await assert.rejects(recoverReadOnlyUi(async()=>{throw Error('LOGIN_EXPIRED');},async()=>{throw Error('must not reload');}),/LOGIN_EXPIRED/);
});
test('unfinished response bodies and pending sets have bounded waits',async()=>{
  await assert.rejects(boundedResponse(new Promise(()=>{}),5),/COMMENT_RESPONSE_TIMEOUT/);
  assert.equal(await settlePending(new Set([new Promise(()=>{})]),5),false);
  assert.equal(await settlePending(new Set([Promise.resolve()]),5),true);
});
test('a late failed response remains handled after timeout',async()=>{
  let fail;const operation=new Promise((_,reject)=>{fail=reject;});
  await assert.rejects(boundedResponse(operation,5),/TIMEOUT/);fail(Error('late'));
  await new Promise(resolve=>setTimeout(resolve,5));
});
test('selector clicks receive the UI timeout and retries share the total budget',async()=>{
  const original=Date.now;let now=0,calls=0;
  Date.now=()=>now;
  const sheet={first(){return this;},isVisible:async()=>false};
  const trigger={first(){return this;},click:async opts=>{calls++;assert.equal(opts.timeout,8000);now=21000;throw Error('locator.click timeout');}};
  const page={locator:selector=>selector.startsWith('.douyin')?sheet:trigger};
  try {
    await assert.rejects(findTargetWorkWithRetry(page,{workTitle:'fixture',timeoutMs:20000,uiTimeoutMs:8000}),/budget/);
    assert.equal(calls,1);
  } finally {Date.now=original;}
});
