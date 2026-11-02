import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function runFixture(scenario){
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'comment-collection-fixture-'));
  try {
    fs.mkdirSync(path.join(temp,'src/lib'),{recursive:true});
    fs.mkdirSync(path.join(temp,'comments-output'));
    const date=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
    fs.writeFileSync(path.join(temp,'comments-output/list-works.json'),JSON.stringify({works:[{title:'fixture',publishText:'发布于'+date+' 12:00'}]}));
    let source=fs.readFileSync(path.join(root,'src/collect-unreplied.mjs'),'utf8');
    for(const name of ['./douyin-browser.mjs','./lib/comment-page.mjs','./lib/works-panel.mjs','./lib/comment-ops.mjs'])source=source.replaceAll("from '"+name+"'","from './fake.mjs'");
    fs.writeFileSync(path.join(temp,'src/collect-unreplied.mjs'),source);
    for(const name of ['recent-works.mjs','comment-api.mjs','collection-runtime.mjs'])fs.copyFileSync(path.join(root,'src/lib',name),path.join(temp,'src/lib',name));
    fs.writeFileSync(path.join(temp,'src/fake.mjs'),`
      import fs from 'node:fs';
      export const DEFAULT_COMMENT_PAGE_URL='https://creator.douyin.com/creator-micro/interactive/comment',DEFAULT_USER_DATA_DIR='fixture';
      const stats={ready:0,select:0,close:0};
      const page={on(){},url(){return DEFAULT_COMMENT_PAGE_URL;},waitForTimeout:async()=>{}};
      export async function launchPersistentPage(){return {page,context:{close:async()=>{stats.close++;fs.writeFileSync(process.env.STATS,JSON.stringify(stats));}}};}
      export async function ensureCommentPageReady(){stats.ready++;}
      export async function findTargetWorkWithRetry(){stats.select++;if(process.env.SCENARIO==='permanent'||stats.select===1)throw Error('locator.click timeout');}
      export async function hasCommentStatusFilter(){return process.env.SCENARIO!=='unsupported';}
      export async function applyUnrepliedCommentsFilter(){return {applied:true};}
      export async function collectComments(){return [{commentId:'fixture-cid',workId:'123',username:'fixture',commentText:'hello'}];}
    `);
    const result=spawnSync(process.execPath,[path.join(temp,'src/collect-unreplied.mjs')],{encoding:'utf8',timeout:5000,env:{...process.env,SCENARIO:scenario,STATS:path.join(temp,'stats.json')}});
    return {status:result.status,output:result.stdout+result.stderr,payload:JSON.parse(fs.readFileSync(path.join(temp,'comments-output/unreplied-latest.json'),'utf8')),stats:JSON.parse(fs.readFileSync(path.join(temp,'stats.json'),'utf8'))};
  } finally {fs.rmSync(temp,{recursive:true,force:true});}
}

test('collector recovers a page click failure and returns fresh full coverage',()=>{
  const r=runFixture('transient');assert.equal(r.status,0,r.output);
  assert.equal(r.payload.complete,true);assert.equal(r.payload.count,1);assert.equal(r.payload.workResults[0].status,'checked');
  assert.deepEqual(r.stats,{ready:2,select:2,close:1});
});
test('collector aborts after failed recovery and never claims empty success',()=>{
  const r=runFixture('permanent');assert.equal(r.status,1,r.output);
  assert.equal(r.payload.complete,false);assert.equal(r.payload.workResults[0].status,'error');assert.equal(r.stats.select,2);assert.equal(r.stats.close,1);
});
test('old works without a native unreplied filter retain explicit unsupported coverage',()=>{
  const r=runFixture('unsupported');assert.equal(r.status,0,r.output);
  assert.equal(r.payload.complete,true);assert.equal(r.payload.workResults[0].status,'unsupported_filter');
});
