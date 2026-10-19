// Interpret publication dates in Asia/Shanghai, independently of host timezone.
const DAY = 86400000;
const SH_OFFSET = 8 * 3600000;

export function publicationTime(work) {
  const raw = work.publishText || work.publish_time || work.publish_date || '';
  const match = String(raw).match(/(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?(?:[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, y, m, d, h = '0', min = '0', sec = '0'] = match;
  const date = new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +sec));
  if (date.getUTCFullYear() !== +y || date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d || +h > 23 || +min > 59 || +sec > 59) return null;
  return date.getTime() - SH_OFFSET;
}

export function selectRecentWorks(works, { days = 30, now = Date.now(), maxWorks = null } = {}) {
  if (!Number.isInteger(days) || days < 1 || days > 366) throw Error('days must be an integer in [1, 366]');
  if (maxWorks !== null && (!Number.isInteger(maxWorks) || maxWorks < 1)) throw Error('maxWorks must be a positive integer');
  const localDayStart = Math.floor((now + SH_OFFSET) / DAY) * DAY - SH_OFFSET;
  const cutoff = localDayStart - (days - 1) * DAY;
  const excluded = { old: [], unknownDate: [], future: [], duplicate: [] };
  const seen = new Set();
  const recent = [];
  for (const work of works) {
    const timestamp = publicationTime(work);
    if (timestamp === null) { excluded.unknownDate.push(work); continue; }
    if (timestamp < cutoff) { excluded.old.push(work); continue; }
    if (timestamp > now) { excluded.future.push(work); continue; }
    const key = work.item_id || `${work.title}|${timestamp}`;
    if (seen.has(key)) { excluded.duplicate.push(work); continue; }
    seen.add(key);
    recent.push({ work, timestamp });
  }
  recent.sort((a, b) => b.timestamp - a.timestamp);
  const selected = (maxWorks === null ? recent : recent.slice(0, maxWorks)).map(x => x.work);
  return {
    works: selected,
    meta: {
      days, from: new Date(cutoff + SH_OFFSET).toISOString().slice(0, 10),
      to: new Date(now + SH_OFFSET).toISOString().slice(0, 10),
      totalWorks: works.length, eligibleWorks: recent.length, selectedWorks: selected.length,
      excludedOld: excluded.old.length, unknownDates: excluded.unknownDate.length,
      futureDates: excluded.future.length, duplicates: excluded.duplicate.length,
      cappedWorks: recent.length - selected.length,
    },
    excluded,
  };
}
