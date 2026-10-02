#!/usr/bin/env node
// Run only the data declaration in a fresh VM. No DOM, require, process or network.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function arrayDeclaration(source, name) {
  const start = new RegExp('(?:const|let|var)\\s+' + name + '\\s*=\\s*\\[').exec(source);
  if (!start) throw new Error(`Missing data array: ${name}`);
  let depth = 1, quote = '', comment = '', escaped = false;
  const begin = start.index + start[0].length - 1;
  for (let i = begin + 1; i < source.length; i++) {
    const c = source[i], next = source[i + 1];
    if (comment === 'line') { if (c === '\n') comment = ''; continue; }
    if (comment === 'block') { if (c === '*' && next === '/') { comment = ''; i++; } continue; }
    if (quote) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '/' && next === '/') { comment = 'line'; i++; }
    else if (c === '/' && next === '*') { comment = 'block'; i++; }
    else if (c === "'" || c === '"' || c === '`') quote = c;
    else if (c === '[') depth++;
    else if (c === ']' && --depth === 0) return source.slice(begin, i + 1);
  }
  throw new Error(`Unclosed array: ${name}`);
}

function readArray(file, name, optional = false) {
  const source = fs.readFileSync(file, 'utf8');
  if (optional && !new RegExp('(?:const|let|var)\\s+' + name + '\\s*=').test(source)) return [];
  return vm.runInNewContext('(' + arrayDeclaration(source, name) + ')',
    { imageBasePath: '/assets/image%20library/noodle-tier-images/' },
    { timeout: 1000, contextCodeGeneration: { strings: false, wasm: false } });
}

function exportData(root, kind) {
  if (!['dine', 'takeout', 'noodle', 'drink', 'huanong'].includes(kind)) throw new Error(`Unknown ranking: ${kind}`);
  const stem = kind === 'dine' ? 'canteen' : kind;
  const source = path.join(root, 'assets/lib-custom', stem + '-tier.js');
  const extras = path.join(root, 'assets/lib-custom', stem + '-tier-extras.js');
  const items = readArray(source, kind === 'noodle' ? 'noodles' : kind === 'drink' ? 'drinks' : 'stalls');
  const rules = Object.fromEntries(['NAME_FIXES', 'NAME_OVERRIDES', 'CLOSED', 'UNCERTAIN']
    .map(name => [name, fs.existsSync(extras) ? readArray(extras, name, true) : []]));
  for (const item of items) {
    item.sourceName = item.name;
    const override = rules.NAME_OVERRIDES.find(r => item.name.includes(r.match));
    if (override) item.name = override.name;
    else for (const r of rules.NAME_FIXES) item.name = item.name.split(r.from).join(r.to);
    item.status = rules.CLOSED.some(r => item.name.includes(r.match)) ? 'closed'
      : rules.UNCERTAIN.some(r => item.name.includes(r.match)) ? 'uncertain' : null;
  }
  return items;
}

if (require.main === module) {
  try { process.stdout.write(JSON.stringify(exportData(process.argv[2], process.argv[3]))); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
module.exports = { arrayDeclaration, exportData };
