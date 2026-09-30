(function (root) {
  'use strict';
  const tiers = ['夯', '顶级', '人上人', 'NPC', '拉完了'];
  function score(item) {
    const label = item.tierLabel || '';
    const match = label.match(/(?:店铺得分|评分)\s*(\d+(?:\.\d+)?)/) ||
      label.match(/(\d+(?:\.\d+)?)\s*(?:❤\ufe0f?|♥|星)/);
    if (match) return Number(match[1]);
    return label.split('·').pop().trim() === '史' ? -Infinity : Number(item.rating);
  }
  function compare(a, b) {
    const tier = tiers.indexOf(a.tier) - tiers.indexOf(b.tier);
    if (tier) return tier;
    const difference = score(b) - score(a);
    return (Number.isNaN(difference) ? 0 : difference) || Number(!!a.anchor) - Number(!!b.anchor);
  }
  const api = { score, compare };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TierOrdering = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
