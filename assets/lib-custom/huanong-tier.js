(function () {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      setTimeout(callback, 0);
    }
  }

  const canteenData = {};
  const tierOrder = ['夯', '顶级', '人上人', 'NPC', '拉完了'];
  // 口味评分与档位由作者确认；常规满分 5 星，特别好吃可给 6 星。
  const stalls = [
    {
      name: '虾王柴火灶甲鱼烧鸡',
      tier: '夯',
      tierLabel: '夯 · 5 星',
      rating: 5,
      photo: null,
      description: '味道很好吃，甲鱼已经很好吃了，最终给 5 颗星。很划算，量很够，性价比拉满了。记得当时三四个人也就 200 元左右，四五个人加了点东西。',
      pros: ['甲鱼很好吃', '量很够', '很划算，性价比拉满'],
      cons: ['不适合一个人吃，菜的分量大'],
      note: '约 200 元是当时多人用餐的回忆价，三四人和四五人加菜的记忆有些混在一起，不据此固定人均。具体分店及套餐内容待补。',
      dishes: [
        { name: '甲鱼烧鸡', review: '甲鱼已经很好吃了，味道很好吃，量很够。' },
      ],
    },
    {
      name: '楚十一',
      tier: '夯',
      tierLabel: '夯 · 5 星',
      rating: 5,
      photo: null,
      description: '给 5 颗星。已经打出了自己的特色，有武汉特色，觉得其他地方不太吃得到。很好吃，但不适合一个人吃，一个菜分量太大了，甜品也是一大碗。',
      pros: ['有自己的特色，有武汉特色', '很好吃', '一个菜分量很大，甜品一大碗'],
      cons: ['不适合一个人吃，单菜分量太大'],
      note: '单菜记得约 40–60 元，是口述回忆价，不能当作整餐人均。是否连锁只是当时的猜测，不作定论；具体菜名和分店待补。',
      dishes: [
        { name: '甜品（菜名待补）', review: '一大碗，分量太多了，很好吃。' },
      ],
    },
    {
      name: '曾麻子热干面',
      tier: 'NPC',
      tierLabel: 'NPC · 2.5 星',
      rating: 2.5,
      photo: null,
      description: '最终给 2.5 分。武汉特色，可以吃一次。讨论时提过 3 星，也觉得比麦当劳好吃，但最后还是确认 2.5 就 2.5，和麦当劳的分数相同。',
      pros: ['武汉特色，可以吃一次'],
      cons: [],
      note: '价格及具体分店没有在这次讨论中提到。',
      dishes: [
        { name: '热干面', review: '武汉特色，可以吃一次；店铺最终给 2.5 星。' },
      ],
    },
    {
      name: '金马门',
      tier: '夯',
      tierLabel: '夯 · 6 星（超满分）',
      rating: 6,
      description: '口味的确好，虽然价格也高，但是我们这个主要还是口味排名。可以给到 6 分，6 分就是绝对的夯了。店面大，东西很多，还有一些很有意思的菜。参考价一个人约 160 元。',
      pros: ['口味的确好，6 星就是绝对的夯', '店面大，东西很多', '虾上面加炼乳很美味，榴莲也好吃'],
      cons: ['价格高', '团购 A 档的位置差一点，取餐走路多花时间'],
      note: '午餐学生价、闲鱼优惠价记得是 140 多元，约 140–145 元，具体记不清了。口述提到 A/B/C/D 等级，团购对应 A 档，位置差一点，走路可能累计多花约 10 分钟；具体等级及优惠规则以购买时为准。',
      dishes: [
        { name: '虾（加炼乳）', review: '给虾上面加炼乳，感觉太美味了。' },
        { name: '榴莲', review: '榴莲好吃。' },
        { name: '汤（菜名待补）', review: '当时喝了两碗，具体汤名没有记清。' },
      ],
    },
    {
      name: '龙哥',
      tier: '夯',
      tierLabel: '夯 · 4.5 星',
      rating: 4.5,
      description: '味道上来说 4.5，我觉得差不多。聊到毛辣果两个人花了 100 多元时，觉得那还不如吃龙哥。',
      pros: ['味道上可以给到 4.5 星', '相比毛辣果，更愿意去吃龙哥'],
      cons: [],
      note: '这次没有提到龙哥的价格和具体分店，价格待补。',
    },
    {
      name: '蛙塞牛蛙',
      tier: '夯',
      tierLabel: '夯 · 4.5 星',
      rating: 4.5,
      photo: null,
      description: '很好吃，整体味道有它自己的风味，比较独特。辛小丁说这是“酒吧牛蛙”。我们综合下来给到 4.5 颗星，单人参考价 100 元。',
      pros: ['很好吃，有自己的独特风味', '馋嘴牛蛙分量很足'],
      cons: ['再加一碗米饭就好了'],
      note: '2026-10-03 点的外卖，花了 200 元，吃的是馋嘴牛蛙。单人参考价 100 元。辛小丁建议线下去吃，说堂食有优惠，而且氛围很好；具体优惠以到店时为准。',
      dishes: [
        { name: '馋嘴牛蛙', review: '分量很足，很好吃，比较独特，可惜就是再加一碗米饭就好了。' },
      ],
    },
    {
      name: '波波鱼',
      tier: '人上人',
      tierLabel: '人上人 · 3.1 星',
      rating: 3.1,
      description: '步行街吃的。主要胜在很便宜，便宜是它最大的优势。把汤浇上去很好吃，这种吃法只吃过他们一家，觉得很新颖。最初给 3 星，最后觉得比舌尖大师好吃一点，改成 3.1 星。',
      pros: ['很便宜', '汤浇上去很好吃', '吃法感觉很新颖，略胜舌尖大师'],
      cons: ['整体口味没有特别惊艳，最大的优势还是便宜'],
      note: '一个人约 30 多元；两个人那次记得点了约 52–60 元，具体金额记不清。鱼的品种没有记清。',
    },
    {
      name: '舌尖大师',
      tier: '人上人',
      tierLabel: '人上人 · 3 星',
      rating: 3,
      description: '吃的是铁板烧，对具体菜品有点没印象了。感觉还没波波鱼好吃。讨论时提过 3.5 和 3.1，最后确认按 3 星整理，波波鱼比它好吃一点，给 3.1 星。',
      pros: [],
      cons: ['口味印象不深', '感觉不如波波鱼好吃'],
      note: '价格和具体菜品待补。',
    },
    {
      name: '麦当劳',
      tier: 'NPC',
      tierLabel: 'NPC · 2.5 星（评分基准）',
      rating: 2.5,
      description: '华农附近这家麦当劳作为评分基准，给 2.5 星。虽然喜欢吃板烧鸡腿堡，但整体太普通了，太普通了，也就 2.5 分。常规满分按 5 分算，特别好吃的可以给到 6 分。',
      pros: ['喜欢吃板烧鸡腿堡'],
      cons: ['整体太普通了，缺少惊艳感'],
      note: '2.5 星是本篇比较口味时的基准。价格没有在这次讨论中提到。',
      dishes: [
        { name: '板烧鸡腿堡', review: '喜欢吃，但这不改变麦当劳整体太普通、店铺只给 2.5 星的评价。' },
      ],
    },
    {
      name: '毛辣果',
      tier: 'NPC',
      tierLabel: 'NPC · 2 星',
      rating: 2,
      description: '不想再吃了，不想再吃了。也是自助，但是不便宜，菜也很少，肉类还要加钱，汤底也不好吃。两个人记得花了 100 多元，那还不如吃龙哥。',
      pros: [],
      cons: ['不想再吃了', '自助菜品少，肉类还要加钱', '汤底不好吃', '不便宜，两个人约 100 多元'],
      note: '两个人 100 多元是回忆价，确切实付金额记不清。按作者确认保留 NPC 档。',
    },
  ];

  // 未提供评分的店铺先保留手记，不擅自赋分或放入档位。
  const pendingStalls = [
    {
      name: '回味黑鸭煲',
      photo: null,
      description: '一般般，其他都还可以，喜欢吃辣的。最后回忆起双人套餐 139 元，均价约 70 元，挺划算的。',
      note: '双人 139 元折合每人 69.5 元，按约 70 元记录。套餐菜品没有记清；公开网页的团购明细需在 App 内查看，尚未核实套餐内容及具体分店。评分待补。',
    },
  ];

  const tierColors = {
    夯: {
      gradient: 'linear-gradient(135deg, #d22b1f 0%, #f1542c 100%)',
      textColor: '#fff',
      shadow: 'rgba(210, 43, 31, 0.3)',
    },
    顶级: {
      gradient: 'linear-gradient(135deg, #f5a000 0%, #ffd54f 100%)',
      textColor: '#1D1D1F',
      shadow: 'rgba(245, 160, 0, 0.25)',
    },
    人上人: {
      gradient: 'linear-gradient(135deg, #ffe450 0%, #fff59d 100%)',
      textColor: '#1D1D1F',
      shadow: 'rgba(255, 228, 80, 0.25)',
    },
    NPC: {
      gradient: 'linear-gradient(135deg, #fff7e1 0%, #fffdf4 100%)',
      textColor: '#4A4A4A',
      shadow: 'rgba(0, 0, 0, 0.08)',
    },
    拉完了: {
      gradient: 'linear-gradient(135deg, #cfd4d8 0%, #f1f3f5 100%)',
      textColor: '#4A4A4A',
      shadow: 'rgba(0, 0, 0, 0.05)',
    },
  };

  function getRatingStars(rating) {
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    return '⭐'.repeat(full) + (half ? '🌟' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function generateDishCards(dishes) {
    if (!Array.isArray(dishes) || dishes.length === 0) return '';
    const cards = dishes.map((dish) => {
      const name = escapeHtml(dish.name);
      const rating = dish.ratingLabel
        ? escapeHtml(dish.ratingLabel)
        : Number.isFinite(dish.rating) ? `${escapeHtml(dish.rating)} 星` : '';
      const price = dish.price ? escapeHtml(dish.price) : '';
      const meta = [rating, price].filter(Boolean).join(' · ');
      const media = dish.image
        ? `<img class="dish-card__image" src="${escapeHtml(dish.image)}" alt="${escapeHtml(dish.imageAlt || dish.name)}" loading="lazy">`
        : `<div class="dish-card__placeholder" aria-label="暂无实拍图"><span>${escapeHtml((dish.name || '菜').slice(0, 1))}</span><small>暂无实拍图</small></div>`;
      return `
        <article class="dish-card" tabindex="0">
          <div class="dish-card__media">${media}</div>
          <div class="dish-card__body">
            <h4 class="dish-card__title">${name}</h4>
            ${meta ? `<p class="dish-card__meta">${meta}</p>` : ''}
            <p class="dish-card__review">${escapeHtml(dish.review)}</p>
          </div>
        </article>
      `;
    }).join('');
    return `
      <section class="dish-section" aria-labelledby="dishSectionTitle">
        <div class="dish-section__heading">
          <h3 id="dishSectionTitle">吃过的菜</h3>
          <span>${dishes.length} 道</span>
        </div>
        <div class="dish-grid">${cards}</div>
      </section>
    `;
  }

  function generateModalContent(data) {
    const tierStyle = tierColors[data.tier] || tierColors['NPC'];
    let html = `
      <div style="margin-bottom: 24px;">
        <div style="display: inline-block; background: ${tierStyle.gradient}; color: ${tierStyle.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 8px ${tierStyle.shadow};">
          评分：${data.tierLabel}
        </div>
      </div>
      ${generateStorePhoto(data)}
      <p style="font-size: 1.05em; line-height: 1.9; margin-bottom: 20px;">${data.description}</p>
      ${generateDishCards(data.dishes)}
    `;

    if (data.pros && data.pros.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(255, 177, 66, 0.1) 0%, rgba(255, 138, 120, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(255, 177, 66, 0.2);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">✨ 亮点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.pros.map((pro) => `<li>${pro}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.cons && data.cons.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(252, 243, 207, 0.1) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(250, 112, 154, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">⚠️ 踩雷点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.cons.map((con) => `<li>${con}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.note) {
      html += `
        <div style="background: rgba(0, 0, 0, 0.03); padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 3px solid #ffb142;">
          <p style="margin: 0; font-size: 0.9em; color: #424245;"><strong>参考信息：</strong>${data.note}</p>
        </div>
      `;
    }

    html += `
      <div style="margin-top: 24px; text-align: center;">
        <div style="font-size: 1.2em; letter-spacing: 2px;">${getRatingStars(data.rating)}</div>
        <p style="margin-top: 8px; font-size: 0.9em; color: #8A8A8A;">口味评分 ${data.rating} 星（常规满分 5 星，特别好吃可给 6 星）</p>
      </div>
    `;

    return html;
  }

  function generateStorePhoto(data) {
    const name = escapeHtml(data.name);
    const media = data.photo
      ? `<img src="${escapeHtml(data.photo)}" alt="${escapeHtml(data.photoAlt || `${data.name}实拍`)}" loading="lazy">`
      : '<div class="store-photo__placeholder"><span>实拍图待补</span><small>店铺或菜品照片</small></div>';
    return `<figure class="store-photo" aria-label="${name}图片区">${media}<figcaption>${name} · 实拍记录</figcaption></figure>`;
  }

  function generateContentSectionHTML() {
    let html = '<h2>华农附近美食详细手记</h2>';
    tierOrder.forEach((tier) => {
      const tierStalls = Object.values(canteenData).filter(
        (item) => item.tier === tier
      ).sort(TierOrdering.compare);
      if (!tierStalls.length) return;
      tierStalls.forEach((data) => {
        html += `<h3>${data.name} · ${data.tierLabel}</h3>`;
        html += `<p>${data.description}</p>`;
      });
    });
    if (pendingStalls.length) {
      html += '<h2>待评分手记</h2>';
      pendingStalls.forEach((data) => {
        html += `<h3>${escapeHtml(data.name)} · 待评分</h3>${generateStorePhoto(data)}<p>${escapeHtml(data.description)}</p><p>${escapeHtml(data.note)}</p>`;
      });
    }
    return html;
  }

  function populateTierList() {
    const tierItems = {};
    document.querySelectorAll('.tier-row').forEach((row) => {
      const label = row.querySelector('.tier-label');
      const items = row.querySelector('.tier-items');
      if (label && items) {
        tierItems[label.textContent.trim()] = items;
        items.innerHTML = '';
      }
    });

    stalls
      .slice()
      .sort(TierOrdering.compare)
      .forEach((stall) => {
      const container = tierItems[stall.tier];
      if (!container) return;

      const card = document.createElement('div');
      card.className = 'spot-card';
      card.setAttribute('data-spot', stall.name);

      if (stall.bgImage) {
        card.classList.add('spot-card--with-bg');
        card.style.setProperty('--spot-bg-image', `url("${stall.bgImage}")`);
      }

      const label = document.createElement('span');
      label.className = 'spot-card__name';
      label.textContent = stall.name;
      card.appendChild(label);

      if (stall.anchor) {
        card.classList.add('spot-card--anchor');
        const mark = document.createElement('span');
        mark.className = 'spot-card__anchor';
        mark.textContent = '守门员';
        card.appendChild(mark);
      }

      container.appendChild(card);
    });
  }

  function initCanteenTier() {
    const modal = document.getElementById('spotModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const contentSection = document.querySelector('.content-section');

    populateTierList();

    const spotCards = document.querySelectorAll('.spot-card');

    function showModal(stallName) {
      const data = canteenData[stallName];
      if (!data || !modal || !modalTitle || !modalBody) {
        return;
      }

      modalTitle.textContent = data.name;
      modalBody.innerHTML = generateModalContent(data);

      modal.style.display = 'flex';
      modal.style.opacity = '0';
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.transform = 'translateY(30px) scale(0.95)';
        modalContent.style.opacity = '0';
        void modal.offsetWidth;
        requestAnimationFrame(() => {
          modal.classList.add('show');
          modal.style.opacity = '1';
          modalContent.style.transform = 'translateY(0) scale(1)';
          modalContent.style.opacity = '1';
        });
      } else {
        modal.classList.add('show');
        modal.style.opacity = '1';
      }

      document.body.style.overflow = 'hidden';
    }

    function hideModal() {
      if (!modal) return;
      const modalContent = modal.querySelector('.modal-content');
      modal.style.opacity = '0';
      if (modalContent) {
        modalContent.style.transform = 'translateY(30px) scale(0.95)';
        modalContent.style.opacity = '0';
      }
      setTimeout(() => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }

    spotCards.forEach((card) => {
      card.addEventListener('click', function (e) {
        e.preventDefault();
        const stallName = this.getAttribute('data-spot');
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.style.transform = '';
          showModal(stallName);
        }, 150);
      });

      let touchStartTime = 0;
      card.addEventListener('touchstart', function () {
        touchStartTime = Date.now();
        this.style.transform = 'scale(0.98)';
      });

      card.addEventListener('touchend', function () {
        const touchDuration = Date.now() - touchStartTime;
        if (touchDuration < 300) {
          this.style.transform = 'scale(1.02)';
          setTimeout(() => {
            this.style.transform = '';
          }, 100);
        } else {
          this.style.transform = '';
        }
      });
    });

    if (modalClose) {
      modalClose.addEventListener('click', hideModal);
    }

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) {
          hideModal();
        }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
        hideModal();
      }
    });

    if (contentSection) {
      contentSection.innerHTML = generateContentSectionHTML();
    }
  }

  stalls.forEach((stall) => {
    canteenData[stall.name] = stall;
  });

  onReady(initCanteenTier);
})();
