import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';

const { matchInteraction, buildInteractionMapFromXlsx } = await import(pathToFileURL(process.argv[2]).href);
const rows = buildInteractionMapFromXlsx([
  { '作品名称': '无标题', '发布时间': '2026-06-24 09:16:30', '播放量': 195, '点赞量': 2 },
  { '作品名称': '相同标题', '发布时间': '2026-06-25 10:30:00', '播放量': 10 },
  { '作品名称': '相同标题', '发布时间': '2026-06-26 10:30:00', '播放量': 20 },
]);
assert.equal(rows.size, 3, 'same titles with different dates must remain separate');
assert.equal(matchInteraction({title: '', publish_time: '2026-06-24 09:16'}, rows)?.plays, 195);
assert.equal(matchInteraction({title: '相同标题', publish_time: '2026-06-26 10:30'}, rows)?.plays, 20);
assert.equal(matchInteraction({title: '相同标题'}, rows), null, 'ambiguous title must not be matched');
assert.equal(matchInteraction({title: '无标题', publish_time: '2026-06-27 09:16'}, rows), null);
console.log('5 work matching regressions passed');
