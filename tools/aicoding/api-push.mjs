#!/usr/bin/env node
/* GitHub REST API 通道推送(github.com:443 被断但 api.github.com 可达时使用)
   从本地 HEAD 提取文件内容,通过 contents API 更新到远端 main。
   凭证从 git credential manager 读取,不落盘。 */
import { execSync } from 'node:child_process';

const REPO = 'lyzbcy/lyzbcy.github.io';
const FILES = process.argv.slice(2);
if (!FILES.length) { console.error('用法: node api-push.mjs <file...>'); process.exit(1); }

const cred = execSync('git credential fill', { input: 'protocol=https\nhost=github.com\n' })
  .toString().split('\n').filter(Boolean);
const token = cred.find(l => l.startsWith('password=')).slice(9);
if (!token) { console.error('未取到凭证'); process.exit(1); }

const MSG = execSync('git log -1 --pretty=%B').toString().trim();
console.log(`commit message: ${MSG.slice(0, 60)}...`);

const api = async (path, opt = {}) => {
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    ...opt,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opt.headers || {}),
    },
  });
  return res;
};

for (const f of FILES) {
  const local = execSync(`git show HEAD:${f.replace(/\\/g, '/')}`).toString('base64');
  let sha = null;
  const get = await api(f);
  if (get.status === 200) sha = (await get.json()).sha;
  else if (get.status !== 404) { console.error(`${f}: GET ${get.status},跳过`); continue; }
  const put = await api(f, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `${MSG} [api-push:${f}]`, content: local, sha, branch: 'main' }),
  });
  console.log(`${f}: PUT ${put.status}${put.status === 200 || put.status === 201 ? ' ✓' : ' ✗ ' + (await put.text()).slice(0, 120)}`);
}
