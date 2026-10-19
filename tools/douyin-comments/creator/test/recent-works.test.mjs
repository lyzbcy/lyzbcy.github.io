import test from 'node:test';
import assert from 'node:assert/strict';
import { publicationTime, selectRecentWorks } from '../src/lib/recent-works.mjs';
const now = Date.parse('2026-10-19T17:00:00+08:00');
const w = (title, date) => ({title, publishText: `发布于${date}`});

test('30 Shanghai calendar days includes Sep 20, excludes Sep 19', () => {
  const r = selectRecentWorks([w('new', '2026年10月19日 16:00'), w('boundary', '2026年09月20日 00:00'), w('old', '2026年09月19日 23:59')], {now});
  assert.deepEqual(r.works.map(x => x.title), ['new', 'boundary']);
  assert.equal(r.meta.excludedOld, 1);
});
test('old pinned entries do not hide newer works later in the list', () => {
  const r = selectRecentWorks([w('pin1', '2026年06月01日'), w('pin2', '2026年07月01日'), w('pin3', '2026年08月01日'), w('recent', '2026年10月18日')], {now});
  assert.deepEqual(r.works.map(x => x.title), ['recent']);
});
test('all recent works are selected without a fixed cap', () => {
  const works = Array.from({length: 37}, (_, i) => w(`work${i}`, '2026年10月18日 12:00'));
  assert.equal(selectRecentWorks(works, {now}).works.length, 37);
});
test('invalid and future dates are explicit and never treated as recent', () => {
  const r = selectRecentWorks([w('unknown', '昨天'), w('invalid', '2026年09月31日'), w('future', '2026年10月20日')], {now});
  assert.equal(r.works.length, 0);
  assert.equal(r.meta.unknownDates, 2);
  assert.equal(r.meta.futureDates, 1);
});
test('zero recent works does not fall back to old works', () => {
  assert.equal(selectRecentWorks([w('old', '2026年01月01日')], {now}).works.length, 0);
});
test('parse Chinese timestamps in Shanghai timezone', () => {
  assert.equal(publicationTime(w('a', '2026年10月19日 12:34')), Date.parse('2026-10-19T12:34:00+08:00'));
});
test('duplicates are removed and explicit debug caps are reported', () => {
  const a = w('a', '2026年10月18日');
  const r = selectRecentWorks([a, {...a}, w('b', '2026年10月17日')], {now,maxWorks:1});
  assert.equal(r.meta.duplicates,1);
  assert.equal(r.meta.cappedWorks,1);
});
test('cutoff changes at Shanghai midnight rather than UTC midnight', () => {
  const work = w('edge', '2026年09月20日 00:00');
  assert.equal(selectRecentWorks([work], {now:Date.parse('2026-10-19T23:59:59+08:00')}).works.length,1);
  assert.equal(selectRecentWorks([work], {now:Date.parse('2026-10-20T00:00:00+08:00')}).works.length,0);
});
