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

  /* 店铺得分 = 50% × 菜品平均分 + 50% × 最高菜品分（2026-08-15 数据） */
  const stalls = [
    {
      name: '【外卖】和府捞面',
      tier: '夯',
      tierLabel: '夯 · 店铺得分 5.00',
      rating: 5,
      description:
        '常点番茄沙葱前腿肉面（官方菜名，2026年在售），综合两次实付参考价约 23.3 元（23.5 / 23.08）。这是和府捞面外卖里性价比最高的汤面——最便宜的一档其实是拌面，但味道一般，还得是汤面。面本身好吃，包装特别特别好，直接给满分。',
      pros: ['外卖里性价比最高的汤面', '面条品质稳定好吃', '包装特别好', '沙葱前腿肉系列有草本/番茄/香辣/酸辣四款可选'],
      cons: ['最便宜的拌面档味道一般'],
      note: '点汤面，别点低价拌面档。',
    },
    {
      name: '【外卖】鑫花溪牛肉米粉',
      tier: '夯',
      tierLabel: '夯 · 店铺得分 4.90',
      rating: 4.9,
      description:
        '苏锡特色牛肉粉连锁（苏州 150+ 店，无锡滨湖就这一家）。经典牛肉粉简直美美死了，非常推荐没吃过的人去尝。香辣牛杂粉、招牌红煨牛腩、贵州特色酸汤感觉都一般般，所以是 4.9 不是满分。注意：这家离学校 5.3 公里，运费 4.9 元，外卖会比正常贵两三块；如果你附近有鑫花溪，建议堂食或闲鱼代下单更便宜。第一次吃不用额外加麻椒——不然上下嘴唇麻到没有知觉；吃免疫了再加。',
      pros: ['经典牛肉粉惊为天人', '苏锡特色，别处少有', '附近有店的话堂食/闲鱼更划算'],
      cons: ['香辣牛杂粉、红煨牛腩、酸汤都一般', '5.3 公里运费 4.9 元，外卖贵两三块'],
      note: '第一次吃别加麻椒。',
    },
    {
      name: '【外卖】熙盛源（滨湖万达店）',
      tier: '夯',
      tierLabel: '夯 · 店铺得分 4.90',
      rating: 4.9,
      description:
        '无锡老字号小笼馄饨（江浙沪特色）。推荐小龙虾生煎。外卖正常 22 元能点到一碗虾肉小馄饨 + 一个生煎双拼；很美味但吃不饱，想吃饱要 25 元起步。抛开价格只谈美味，和鑫花溪一样 4.9 星：比鑫花溪贵一点、性价比低一点，但营养更多（有虾肉），综合评分保持 4.9。有条件建议堂食，最近门店 1.6 公里。',
      pros: ['小龙虾生煎推荐', '虾肉小馄饨营养好', '老字号出品稳定'],
      cons: ['22 元的量吃不饱，25 元起步', '性价比不如鑫花溪', '建议堂食但最近 1.6 公里'],
      note: '',
    },
    {
      name: '【外卖】Black Burger 黑汉堡',
      tier: '夯',
      tierLabel: '夯 · 店铺得分 4.30（海岸城店疑似已关）',
      rating: 4.3,
      description:
        '专注做汉堡的店，大一大二时的最爱。黑汉堡一般 25~30 元一个，再配一杯冰可乐。味道很好吃，就是沙拉酱稍微有点多，给 4.3 星。现在海岸城店好像关门了、搜不到了，成为回忆（2026-08 查证：公开渠道已查不到该门店）。',
      pros: ['专注汉堡，味道很好吃', '黑汉堡风味有辨识度'],
      cons: ['沙拉酱稍微有点多', '海岸城店疑似已关店'],
      note: '',
    },
    {
      name: '【外卖】塔斯汀中国汉堡',
      tier: '顶级',
      tierLabel: '顶级 · 店铺得分 4.00',
      rating: 4,
      description:
        '常点中国汉堡单人三件套，综合两次实付参考价约 14.5 元（15.5 / 13.5，价格浮动大，综合考虑）。评分锚点店之一。汉堡皮很好吃，可乐也喜欢。',
      pros: ['汉堡皮有特色、好吃', '可乐好喝', '三件套性价比可以'],
      cons: ['两次实付价差 2 元，价格不稳定'],
      note: '',
    },
    {
      name: '【外卖】张山野云南野生菌炒饭',
      tier: '顶级',
      tierLabel: '顶级 · 店铺得分 3.90',
      rating: 3.9,
      description:
        '常点虾仁鸡蛋肉丝炒饭，参考价 14.9 元。稍微有点油，但里面有虾仁等料，味道的确还可以。问题是"科技与狠活"可能加得比较多，经常吃身体可能受不了。',
      pros: ['有虾仁等真料', '味道的确可以', '哪儿都能点到'],
      cons: ['稍微有点油', '疑似添加剂偏多，不宜常吃'],
      note: '',
    },
    {
      name: '【外卖】螺判官螺蛳粉',
      tier: '顶级',
      tierLabel: '顶级 · 店铺得分 3.83',
      rating: 3.8,
      description:
        '常点小仙女专属苗酸螺蛳粉（"苗酸"两字就是这么写的），按正常价 18 元算（外卖平台上无臭嗦粉、原味螺蛳粉偶尔特别便宜，不算）。气味和味道都还好，但稍微有点太油：不加炸蛋单吃只值 3 分；加个炸蛋（总价 20 多元）可以给 4.1 星。店铺得分 = 50%×(3.0+4.1)/2 + 50%×4.1 = 3.83。',
      pros: ['堂食外卖都在线的选择', '加炸蛋后体验明显提升', '平台上偶尔有超低价'],
      cons: ['稍微有点太油', '不加炸蛋性价比一般'],
      note: '点苗酸螺蛳粉，加炸蛋。',
    },
    {
      name: '【外卖】韩宫宴炭火烤肉',
      tier: '顶级',
      tierLabel: '顶级 · 店铺得分 3.80',
      rating: 3.8,
      description:
        '常点黑椒鸡腿肉拌饭（官方菜名无"烤"字），参考价 14.4 元。正常的营养拌饭，各营养比较全，味道也还行，也不太油。问题是哪儿都能吃到，而且量不算多，3.8 星。',
      pros: ['营养比较全', '不太油', '味道还行'],
      cons: ['哪儿都能吃到', '量不算多'],
      note: '',
    },
    
    {
      name: '【外卖】厚府牛油拌饭（海岸城店）',
      tier: '人上人',
      tierLabel: '人上人 · 店铺得分 3.65',
      rating: 3.65,
      description:
        '常点"点吧，不会后悔的牛油拌饭"一人份——菜名就叫这个，参考价 14 元。味道还可以，但营养一般：蛋白质偏少、油偏多；如果你爱吃油，它味道是真好，就因为油多。外卖包装有点想法：黄袋子、纸盒，会把菜压在底下、饭盖在上面（不知道什么设计），勺子不是小黑勺而是给铁勺——对外卖有想法，但不多。',
      pros: ['味道可以（油香派福音）', '14 元一人份', '给铁勺，包装有点想法'],
      cons: ['蛋白质偏少、油偏多', '营养一般'],
      note: '',
    },{
      name: '【外卖】霸碗盖码饭',
      tier: '人上人',
      tierLabel: '人上人 · 店铺得分 3.60',
      rating: 3.6,
      description:
        '常点外婆菜炒鸡蛋拼剁椒土豆丝，参考价 12.2 元。说是机器人炒的，吃得少、就吃过几次。饭太油了，但是星星布丁觉得很好吃。除了太油其实还好。',
      pros: ['机器人炒制，出品标准化', '星星布丁认证好吃'],
      cons: ['太油'],
      note: '',
    },
    {
      name: '【外卖】拌将麻辣烫',
      tier: '人上人',
      tierLabel: '人上人 · 店铺得分 3.50',
      rating: 3.5,
      description:
        '常点超值麻辣烫单人餐（经典骨汤），参考价 11 元。堂食也有（星光广场二楼那家，堂食篇的夯），但外卖更划算：11 块的超值单人餐，堂食怎么点都要 20 多。味道还行，干净，单纯给味道打 3.5 分。',
      pros: ['外卖 11 元超值单人餐，比堂食划算', '干净', '性价比可以'],
      cons: ['单纯味道只是还行'],
      note: '走外卖渠道充值得用上超值单人餐。',
    },
    {
      name: '【外卖】湘八爷·辣椒炒肉',
      tier: '人上人',
      tierLabel: '人上人 · 店铺得分 3.30',
      rating: 3.3,
      description:
        '经常吃的一家。常点西红柿炒鸡蛋盖码饭（一人份），参考价 8.5 元。就是一个西红柿炒鸡蛋盖饭，好处是不算特别油，油量控制得还好。和汀小二正好是油量控制的两个极端。',
      pros: ['油量控制得好', '8.5 元一人份便宜'],
      cons: ['味道没有特别惊艳'],
      note: '',
    },
    {
      name: '【外卖】沙县小吃',
      tier: '人上人',
      tierLabel: '人上人 · 店铺得分 3.30',
      rating: 3.3,
      description:
        '鸡腿饭，参考价 10 元。人尽皆知的评分锚点店之一。只要给的是鸡腿、青菜，最后一个不要是豆皮，都挺好吃的。健康、油少、量也还可以，但味道一般般，单凭味道 3.3 星。',
      pros: ['健康、油少', '量还可以', '全国标配，出品稳定'],
      cons: ['味道一般般', '要看配菜给的是不是豆皮'],
      note: '',
    },
    {
      name: '【外卖】汀小二盖浇拌饭（k-park店）',
      tier: 'NPC',
      tierLabel: 'NPC · 店铺得分 2.80',
      rating: 2.8,
      description:
        '常点招牌辣椒炒肉加番茄炒蛋盖码饭，参考价 14.68 元。典型和湘八爷相反的店：油控制得不好，太油了。虽然也能吃，但"三颗星的标准是我可以日常吃"，所以 2.8 星。',
      pros: ['也能吃'],
      cons: ['太油，油量控制差', '14.68 元不算便宜'],
      note: '',
    },
    {
      name: '【外卖】超能鹿战队（减脂餐）',
      tier: 'NPC',
      tierLabel: 'NPC · 店铺得分 2.50（估）',
      rating: 2.5,
      description:
        '减脂餐外卖。最近吃得少，有点忘记味道了。感觉味道都一般般，又贵又一般。而且这类店一般是幽灵店（不提供堂食、只能点外卖），卫生可能也一般。估 2.5 星。',
      pros: ['减脂期的心理安慰'],
      cons: ['又贵又一般', '幽灵店无堂食', '卫生存疑'],
      note: '',
    },
    {
      name: '【外卖】钟爱轻食（减脂餐）',
      tier: 'NPC',
      tierLabel: 'NPC · 店铺得分 2.50（估）',
      rating: 2.5,
      description:
        '减脂餐外卖，和超能鹿战队同档：味道一般般，又贵又一般，幽灵店无堂食，卫生可能也一般。估 2.5 星。（2026-08 查证：公开渠道查不到该店，小店常无网页收录）',
      pros: ['减脂期的心理安慰'],
      cons: ['又贵又一般', '幽灵店无堂食', '卫生存疑'],
      note: '',
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
    return '⭐'.repeat(full) + (half ? '🌟' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  }

  function generateModalContent(data) {
    const tierStyle = tierColors[data.tier] || tierColors['NPC'];
    let html = `
      <div style="margin-bottom: 24px;">
        <div style="display: inline-block; background: ${tierStyle.gradient}; color: ${tierStyle.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 8px ${tierStyle.shadow};">
          评分：${data.tierLabel}
        </div>
      </div>
      <p style="font-size: 1.05em; line-height: 1.9; margin-bottom: 20px;">${data.description}</p>
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
          <p style="margin: 0; font-size: 0.9em; color: #424245;"><strong>私藏吃法：</strong>${data.note}</p>
        </div>
      `;
    }

    html += `
      <div style="margin-top: 24px; text-align: center;">
        <div style="font-size: 1.2em; letter-spacing: 2px;">${getRatingStars(data.rating)}</div>
        <p style="margin-top: 8px; font-size: 0.9em; color: #8A8A8A;">店铺得分 ${data.rating.toFixed(2)}（50% 菜品均分 + 50% 最高分）</p>
      </div>
    `;

    return html;
  }

  function generateContentSectionHTML() {
    let html = '<h2>外卖店铺详细手记</h2>';
    tierOrder.forEach((tier) => {
      const tierStalls = Object.values(canteenData).filter(
        (item) => item.tier === tier
      );
      if (!tierStalls.length) return;
      tierStalls.forEach((data) => {
        html += `<h3>${data.name} · ${data.tierLabel}</h3>`;
        html += `<p>${data.description}</p>`;
      });
    });
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

    stalls.forEach((stall) => {
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
