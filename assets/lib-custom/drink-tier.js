(function () {
  'use strict';

  /* 页面与一图流共用此数组；评分只取作者明确给出的数字。 */
  const drinks = [
    {
      name: '魔爪 白魔爪（芒果菠萝味）',
      tier: '人上人',
      tierLabel: '人上人 · 4.7 星',
      rating: 4.7,
      category: '能量饮料',
      description: '我觉得比红魔爪还好喝一点，基本上没有怪味，气泡刺激舌头，很带劲。可以给到 4.7 星。',
    },
    {
      name: '魔爪 红魔爪（百香果番石榴味）',
      tier: '人上人',
      tierLabel: '人上人 · 4.5 星',
      rating: 4.5,
      category: '能量饮料',
      description: '好喝好喝，没有怪味。酸酸甜甜，气泡还会刺激舌头，很带劲。如果红牛算 3 星，红魔爪可以给到 4.5 星。',
    },
    {
      name: '减糖的茉莉奶绿',
      tier: '顶级',
      tierLabel: '顶级 · 5 星 · 守门员',
      rating: 5,
      category: '奶茶',
      description: '顶级守门员。味道不错；不像原味阿萨姆喝久了容易晕、容易腻，而且糖量减半，稍微健康一点点。',
      anchor: true,
    },
    {
      name: '瑞幸 高蛋白莓果酸奶饮',
      tier: '顶级',
      tierLabel: '顶级 · 5.2 星',
      rating: 5.2,
      category: '酸奶饮',
      price: '参考价 15 元',
      description: '参考价 15 元。我选的是不另外加糖，加了牛奶燕麦爆珠。我觉得不另外加糖会更健康一点，这一杯的蛋白质含量大约有 20g。因为没有另外加糖，喝下来的味道其实一般般，吃不出什么味道。但吃到里面不知道是什么筋，感觉像是莓果筋的地方，那会特别有滋味儿（也可能是我没摇匀）。总体来说主打一个健康。这个价格与其让我喝别的奶茶，其实也是喝个滋味嘛，这个既有滋味又健康。如果不另外加糖，对滋味会有点影响；但如果再加糖，就违背了它健康的初衷和卖点了。我觉得它应该跟“QQ美眉奶茶”是一个等级的，它们都能排到顶级。总体来说，我给 5.2 颗星吧。',
    },
    {
      name: '娃哈哈 格瓦斯',
      tier: '人上人',
      tierLabel: '人上人 · 4.3 星',
      rating: 4.3,
      category: '其他饮料',
      description: '其实没有什么运动补剂的效果。硬要说的话，可能只是补充快碳，而且一杯的碳水也不高。但相比于冰红茶那种骗人的“减糖冰红茶”（一杯糖分有五六十克），它的糖分少一点，还行。格瓦斯算小众饮料，味道因人而异；有的人受不了这个味道，但我个人觉得挺好喝的，可以给到 4.3 星。',
    },
    {
      name: '统一阿萨姆标准原味奶茶',
      tier: '人上人',
      tierLabel: '人上人 · 4 星 · 守门员',
      rating: 4,
      category: '奶茶',
      description: '人上人守门员，4 星。原味阿萨姆喝久了容易晕、容易腻。',
      anchor: true,
    },
    {
      name: '红牛',
      tier: 'NPC',
      tierLabel: 'NPC · 3 星 · 守门员',
      rating: 3,
      category: '能量饮料',
      description: '评分锚点，中规中矩的能量饮料，没有特别突出的点。大家都喝过，以它作为 NPC 守门员，基准 3 星。',
      anchor: true,
    },
    {
      name: '魔爪 黑魔爪（原味）',
      tier: 'NPC',
      tierLabel: 'NPC · 3 星',
      rating: 3,
      category: '能量饮料',
      description: '原味，带微微微微的橡皮泥味。和红牛一个档位，3 星水平。',
    },
  ];

  const tierOrder = ['夯', '顶级', '人上人', 'NPC', '拉完了'];
  const byName = new Map(drinks.map((drink) => [drink.name, drink]));
  let lastTrigger = null;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function showDetail(drink) {
    const modal = document.getElementById('drinkModal');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    if (!modal || !title || !body) return;
    title.textContent = drink.name;
    body.innerHTML = '<span class="detail-badge">' + escapeHtml(drink.tierLabel) + '</span>' +
      '<p class="detail-category">' + escapeHtml(drink.category) + '</p>' +
      (drink.price ? '<p class="detail-price">' + escapeHtml(drink.price) + '</p>' : '') +
      '<p class="detail-review">' + escapeHtml(drink.description) + '</p>';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    document.getElementById('modalClose').focus();
  }

  function hideDetail() {
    const modal = document.getElementById('drinkModal');
    if (!modal) return;
    modal.classList.remove('show');
    document.body.style.overflow = '';
    if (lastTrigger) lastTrigger.focus();
  }

  function init() {
    const rows = new Map();
    document.querySelectorAll('.tier-row').forEach((row) => {
      const tier = row.getAttribute('data-tier');
      const items = row.querySelector('.tier-items');
      if (tier && items) rows.set(tier, items);
    });
    drinks.slice().sort(TierOrdering.compare)
      .forEach((drink) => {
        const target = rows.get(drink.tier);
        if (!target) return;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'spot-card';
        card.setAttribute('aria-label', drink.name + '，' + drink.tierLabel + '，查看详细评价');
        card.dataset.drink = drink.name;
        const name = document.createElement('span');
        name.className = 'spot-card__name';
        name.textContent = drink.name;
        card.appendChild(name);
        if (drink.anchor) {
          card.classList.add('spot-card--anchor');
          const mark = document.createElement('span');
          mark.className = 'spot-card__anchor';
          mark.textContent = '守门员';
          card.appendChild(mark);
        }
        card.addEventListener('click', () => {
          lastTrigger = card;
          showDetail(byName.get(card.dataset.drink));
        });
        target.appendChild(card);
      });

    const details = document.querySelector('.content-section');
    if (details) {
      details.innerHTML = '<h2>饮料和奶茶详细测评</h2>' + tierOrder.map((tier) => {
        const group = drinks.filter((drink) => drink.tier === tier).sort(TierOrdering.compare);
        if (!group.length) return '';
        return '<h3>' + escapeHtml(tier) + '</h3>' + group.map((drink) =>
          '<h4>' + escapeHtml(drink.name) + ' · ' + escapeHtml(drink.tierLabel) + '</h4>' +
          (drink.price ? '<p>' + escapeHtml(drink.price) + '</p>' : '') +
          '<p>' + escapeHtml(drink.description) + '</p>').join('');
      }).join('');
    }
    document.getElementById('modalClose').addEventListener('click', hideDetail);
    document.getElementById('drinkModal').addEventListener('click', (event) => {
      if (event.target.id === 'drinkModal') hideDetail();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') hideDetail();
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
