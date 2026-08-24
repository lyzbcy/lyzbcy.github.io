(function() {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      setTimeout(callback, 0);
    }
  }

  const noodleData = {};
  const tierOrder = ['夯', '顶级', '人上人', 'NPC', '拉完了'];
  const imageBasePath = '/assets/image%20library/noodle-tier-images/';

  // 方便面口味数据 - 按照示例结构添加
  const noodles = [
    {
      name: '海鲜拉面【汤达人】',
      tier: '夯',
      tierLabel: '夯 · 6❤️',
      rating: 5,
      description: '鲜香扑鼻、细小面条，极大满足',
      bgImage: imageBasePath + encodeURIComponent('海鲜拉面-汤达人.png'),
    },
    {
      name: '安徽板面-卤香牛肉板面【今麦郎】',
      tier: '夯',
      tierLabel: '夯 · 6❤️',
      rating: 5,
      description: '宽面这个美味 这个劲道',
      bgImage: imageBasePath + encodeURIComponent('安徽板面-今麦郎.jpeg'),
    },
    {
      name: '番茄肉酱风味拌面【茄皇】',
      tier: '夯',
      tierLabel: '夯 · 6❤️',
      rating: 5,
      description: '番茄味不错 作为拌面 有酱但不腻',
      bgImage: imageBasePath + encodeURIComponent('番茄肉酱拌面-茄皇.jpeg'),
    },
    {
      name: '山椒肥牛高人拉面【杨掌柜】',
      tier: '夯',
      tierLabel: '夯 · 6❤️',
      rating: 5,
      description: '山椒肥牛味加卤蛋，酸酸甜甜美味至极。只加了1/3油包但依然非常有味道，细面条口感极佳，加白醋后更是酸酸甜甜。全透明塑料盒包装，参考价5.9元，热量440kcal（面饼全+粉包全+油包1/3）。',
      bgImage: imageBasePath + encodeURIComponent('山椒肥牛高人拉面-杨掌柜.jpeg'),
    },
    {
      name: '高人拉面港式肥汁加吸汁爆蛋【杨掌柜】',
      tier: '夯',
      tierLabel: '夯 · 5.5❤️',
      rating: 5,
      description: '参考价5.9元，热量542kcal（含面饼+料包+吸汁爆蛋）。非油炸拉面，非常值得一试！汤的味道就像吃臭豆腐时上面淋的那层很美味的港味卤酱，吃起来非常好吃！吸汁爆蛋就是把蛋汁做成的压缩蛋吸水变大，虽然营养上不如完整卤蛋，但口感很不错。虽然偏爱藤椒的麻麻味道，但这个肯定超过五星守门员酸菜牛肉面。',
      bgImage: imageBasePath + encodeURIComponent('高人拉面港式肥汁味-杨掌柜.jpg'),
    },
    {
      name: "牛肉面【茄皇】",
      tier: '顶级',
      tierLabel: '顶级 · 5❤️',
      rating: 4,
      description: '可以',
      bgImage: imageBasePath + encodeURIComponent('牛肉面-茄皇.jpeg'),
    },
    {
      name: '海鲜风味【合味道】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️',
      rating: 4,
      description: '鲜得嘞 但是量好少 就算是大杯也吃不饱。而且面有一点坨',
      bgImage: imageBasePath + encodeURIComponent('海鲜风味-合味道.jpeg'),
    },
    {
      name: '刀削宽面-红烧牛肉面【今麦郎】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️',
      rating: 4,
      description: '宽宽的面 形象捏 好吃捏 宽面也比较入味',
      bgImage: imageBasePath + encodeURIComponent('刀削宽面红烧牛肉-今麦郎.jpeg'),
    },
    {
      name: '辣牛肉汤面【汤达人】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️',
      rating: 4,
      description: '喝汤之前只是微微辣。微微辣+酸甜，口味很丰富。吃完后喝汤又能变成微辣，留下火辣辣的印象。',
      bgImage: imageBasePath + encodeURIComponent('辣牛肉汤面-汤达人.jpg'),
    },
    {
      name: '金汤肥牛面【康师傅】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️',
      rating: 4,
      description: '面饼挺厚，微酸微甜微微辣，最大的优点就是没什么明显缺点',
      bgImage: imageBasePath + encodeURIComponent('金汤肥牛面-康师傅.jpeg'),
    },
    {
      name: '老坛酸菜牛肉面【统一】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️',
      rating: 4,
      description: '经典无需多言',
      bgImage: imageBasePath + encodeURIComponent('老坛酸菜牛肉面-统一.png'),
    },
    {
      name: '酸酸辣辣豚骨汤面【今麦郎一桶半】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '挺好吃的 我愿意经常吃 然后包装很有意思 把汤包和油包分开 这样还挺健康的',
      bgImage: imageBasePath + encodeURIComponent('酸酸辣辣豚骨汤面-今麦郎一桶半.jpg'),
    },
    {
      name: '鲜虾鱼板面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '不如海鲜系列鲜 但是你耐不住他量大啊 很满足嘻嘻嘻',
      bgImage: imageBasePath + encodeURIComponent('鲜虾鱼板面-康师傅.webp'),
    },
    {
      name: '双萝卜牛腩面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '闻着有卤味 吃着却不重 蛮好 还有脆脆的双萝卜作为随机奖励。但是感觉容易吃腻 跟红烧牛肉面一样',
      bgImage: imageBasePath + encodeURIComponent('双萝卜牛腩面-康师傅.webp'),
    },
    {
      name: '韩式土豆排骨风味【嗦粉】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '面&粉混合物挺有劲道。这个味道简直像是把妙脆角磨成粉加里面一样。竟然不难吃，还挺有味道（我不想说挺有韵味 因为零食和韵味感觉很不协调）',
      bgImage: imageBasePath + encodeURIComponent('韩式土豆排骨-嗦粉.jpeg'),
    },
    {
      name: '藤椒拌面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '相比于红烧牛肉面的拌面吃法，口味上针对拌面做了平衡性调整，但是藤椒在这个面里的点缀微乎其微，平平无奇',
      bgImage: imageBasePath + encodeURIComponent('藤椒拌面-康师傅.jpg'),
    },
    {
      name: '粉面菜蛋-港式肥汁【千里薯】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '很港式，对我来说有点太辣了，略微有点重口',
      bgImage: imageBasePath + encodeURIComponent('粉面菜蛋港式肥汁-千里薯.jpeg'),
    },
    {
      name: '老坛泡椒牛肉面【统一】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '模仿老坛酸菜，但只有模仿 没有超越。泡椒味有点喧宾夺主，而且没有酸菜吃',
      bgImage: imageBasePath + encodeURIComponent('老坛泡椒牛肉面-统一.webp'),
    },
    {
      name: '羊肉汤面【白象】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '感觉像是对标康师傅的香辣牛肉面',
      bgImage: imageBasePath + encodeURIComponent('羊肉汤面-白象.jpeg'),
    },
    {
      name: '罗宋汤面【汤达人】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '酸酸甜甜，然后...没了... 没什么特点啊',
      bgImage: imageBasePath + encodeURIComponent('罗宋汤面-汤达人.jpeg'),
    },
    {
      name: '红烧牛肉面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️',
      rating: 3,
      description: '4❤️守门员',
      bgImage: imageBasePath + encodeURIComponent('红烧牛肉面-康师傅.png'),
    },
    {
      name: '铁板黑椒牛肉意大利面【怡芽】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '低脂高蛋白 比同品牌的番茄肉酱好吃一丢丢 但也是属于减脂期我也不会大量吃的口味',
      bgImage: imageBasePath + encodeURIComponent('铁板黑椒牛肉意面-怡芽.jpg'),
    },
    {
      name: '经典番茄肉酱意大利面【怡芽】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '低脂高蛋白 这的确值得表扬 但就算是减脂期我也不会大量选择这个填饱肚子 因为不够好吃。感觉有点对标番茄肉酱风味拌面【茄皇】，但是它番茄酱没人家茄皇好吃',
      bgImage: imageBasePath + encodeURIComponent('番茄肉酱意面-怡芽.jpg'),
    },
    {
      name: '海鲜浓汤面【白象】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '细细扁扁的面条+海鲜味……这不就是泡水的波力渔趣嘛',
      bgImage: imageBasePath + encodeURIComponent('海鲜浓汤面-白象.png'),
    },
    {
      name: '赤豚骨浓汤风味【合味道】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '不是哥们，怎么没味儿啊 看在合味道的份上才能留在3❤️ 其他牌子就扔💩里了',
      bgImage: imageBasePath + encodeURIComponent('赤豚骨浓汤-合味道.jpg'),
    },
    {
      name: '兰州牛肉面【阿宽】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '比兰州拉面口味稍微淡一点，面稍微没那么有嚼劲一点。你没错，错的是我们。我不喜欢吃兰州拉面…',
      bgImage: imageBasePath + encodeURIComponent('兰州牛肉面-阿宽.png'),
    },
    {
      name: '老母鸡汤面【白象】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '给我一种他明明能考100分，故意考80分的感觉，一直就差临门一脚的快感。故弄玄虚，吃得我很不爽。（就是不够鲜）',
      bgImage: imageBasePath + encodeURIComponent('老母鸡汤面-白象.png'),
    },
    {
      name: '番茄面【统一】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '吃的时候番茄味很一般，除了番茄没什么特点',
      bgImage: imageBasePath + encodeURIComponent('番茄面-统一.jpeg'),
    },
    {
      name: '番茄炖牛腩【杨掌柜】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '一股塑料味，卤蛋只有微微臭臭蛋，王皓说想洗了抹布没通风味',
      bgImage: imageBasePath + encodeURIComponent('番茄炖牛腩-杨掌柜.jpeg'),
    },
    {
      name: '番茄鸡蛋面【康师傅】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '汤好喝，面没有特色',
      bgImage: imageBasePath + encodeURIComponent('番茄鸡蛋面-康师傅.jpeg'),
    },
    {
      name: '浓情番茄味高人拉面【杨掌柜】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '减脂期只加了一半番茄包和花生，番茄味不够浓郁——一半因为加不够，一半因为本身就不够浓。油包减半后油脂仍然远高于蛋白质，不如送卤蛋的藤椒味有营养，参考价5.9元，热量490kcal。',
      bgImage: imageBasePath + encodeURIComponent('浓情番茄高人拉面-杨掌柜.jpeg'),
    },
    {
      name: '魔小饱方便魔芋凉面',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '参考价6.5元，热量65kcal。魔芋面很有劲道，卡路里很少。料包全加对我来说有点辣，说话都辣辣的。量太少了吃不饱，饱腹感相当于一碗小的合味道。吃魔芋面没有吃淀粉面那么开心，心理满足感不够。营养方面既然卡路里少了也别想有多少蛋白质了。味道还可以，香菜味/辣味比较浓郁。如果红烧牛肉面吃腻了可能会来吃这个，但一包解决不了，至少得吃两包。',
      bgImage: imageBasePath + encodeURIComponent('魔小饱方便魔芋凉面.jpg'),
    },
    {
      name: '日清意面牛油莫罗勒风味杯面【日清】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️',
      rating: 2,
      description: '光说味道其实可以给4星，但参考价7元且吃不饱。既然是小杯就得按合味道的标准来要求。牛油果风味虽然颜色看着低，但实际吃着挺好吃的，只是没太吃出牛油果的味道，没有特别惊艳。综合考虑性价比，最终3星。',
      bgImage: imageBasePath + encodeURIComponent('日清意面牛油莫罗勒杯面-日清.jpeg'),
    },
    {
      name: '香菜面',
      tier: '拉完了',
      tierLabel: '拉完了 · 史',
      rating: 1,
      description: '香菜味浓郁得我这个喜欢吃香菜的人都要呕的水平',
      bgImage: imageBasePath + encodeURIComponent('香菜面.jpeg'),
    },
    {
      name: '蒜香猪骨汤面【白象】',
      tier: '拉完了',
      tierLabel: '拉完了 · 史',
      rating: 1,
      description: '？ 呕 这个怪怪的味道是想干什么 报复社会吗',
      bgImage: imageBasePath + encodeURIComponent('蒜香猪骨汤面-白象.webp'),
    }
  ];

  noodles.forEach(item => {
    noodleData[item.name] = item;
  });

  const tierColors = {
    '夯': { gradient: 'linear-gradient(135deg, #d22b1f 0%, #f1542c 100%)', textColor: '#fff', shadow: 'rgba(210, 43, 31, 0.3)' },
    '顶级': { gradient: 'linear-gradient(135deg, #f5a000 0%, #ffd54f 100%)', textColor: '#1D1D1F', shadow: 'rgba(245, 160, 0, 0.25)' },
    '人上人': { gradient: 'linear-gradient(135deg, #ffe450 0%, #fff59d 100%)', textColor: '#1D1D1F', shadow: 'rgba(255, 228, 80, 0.25)' },
    'NPC': { gradient: 'linear-gradient(135deg, #fff7e1 0%, #fffdf4 100%)', textColor: '#4A4A4A', shadow: 'rgba(0, 0, 0, 0.08)' },
    '拉完了': { gradient: 'linear-gradient(135deg, #cfd4d8 0%, #f1f3f5 100%)', textColor: '#4A4A4A', shadow: 'rgba(0, 0, 0, 0.05)' }
  };

  function getRatingStars(rating) {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function generateModalContent(data) {
    const tierStyle = tierColors[data.tier] || tierColors['NPC'];
    return `
      <div style="margin-bottom: 24px;">
        <div style="display: inline-block; background: ${tierStyle.gradient}; color: ${tierStyle.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 8px ${tierStyle.shadow};">
          评分：${data.tierLabel}
        </div>
      </div>
      <p style="font-size: 1.05em; line-height: 1.9; margin-bottom: 20px;">${data.description}</p>
      <div style="margin-top: 24px; text-align: center;">
        <div style="font-size: 1.2em; letter-spacing: 2px;">${getRatingStars(data.rating)}</div>
        <p style="margin-top: 8px; font-size: 0.9em; color: #8A8A8A;">复购指数</p>
      </div>
    `;
  }

  // giscus 评论：每款面一个独立 discussion，复用 _config.yml 的 giscus 配置
  const GISCUS_CONFIG = {
    repo: 'lyzbcy/lyzbcy.github.io',
    repoId: 'R_kgDOQMgcsQ',
    category: 'Announcements',
    categoryId: 'DIC_kwDOQMgcsc4DCIAs',
  };
  let giscusInjected = false;   // client.js 是否已注入（全页面只注入一次）
  let giscusCurrentTerm = null; // 当前显示的 term

  function loadGiscusForNoodle(data) {
    const term = '方便面排名-' + data.name;
    // 评论区容器 .noodle-comments 在 modal HTML 里持久存在（不随泡面切换重建），
    // giscus client.js 首次执行后渲染的 iframe 也持久保留，切换泡面只用 postMessage 改 term。
    const giscusWrap = modalBody.querySelector('.noodle-comments');
    if (!giscusWrap) return;

    // 首次：注入 client.js（giscus 会找 .noodle-comments 里的 .giscus 挂载 iframe）
    if (!giscusInjected) {
      giscusInjected = true;
      giscusCurrentTerm = term;
      const s = document.createElement('script');
      s.src = 'https://giscus.app/client.js';
      const attrs = [
        ['data-repo', GISCUS_CONFIG.repo],
        ['data-repo-id', GISCUS_CONFIG.repoId],
        ['data-category', GISCUS_CONFIG.category],
        ['data-category-id', GISCUS_CONFIG.categoryId],
        ['data-mapping', 'specific'],
        ['data-term', term],
        ['data-strict', '0'],
        ['data-reactions-enabled', '1'],
        ['data-emit-metadata', '0'],
        ['data-input-position', 'top'],
        ['data-theme', 'preferred_color_scheme'],
        ['data-lang', 'zh-CN'],
      ];
      attrs.forEach(([k, v]) => s.setAttribute(k, v));
      s.setAttribute('crossorigin', 'anonymous');
      s.async = true;
      giscusWrap.appendChild(s);
      return;
    }

    // 已注入过：用官方 postMessage setConfig 切换到新 term
    if (giscusCurrentTerm === term) return;
    giscusCurrentTerm = term;

    function switchTerm() {
      const iframe = giscusWrap.querySelector('iframe.giscus-frame, .giscus iframe, iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { giscus: { setConfig: { term: term } } },
          'https://giscus.app'
        );
      }
    }
    const iframe = giscusWrap.querySelector('iframe');
    if (iframe) {
      switchTerm();
    } else {
      let tries = 0;
      const timer = setInterval(() => {
        if (giscusWrap.querySelector('iframe') || ++tries > 30) {
          clearInterval(timer);
          switchTerm();
        }
      }, 100);
    }
  }


  function generateContentSectionHTML() {
    let html = '<h2>口味详细笔记</h2>';
    tierOrder.forEach(tier => {
      const tierNoodles = Object.values(noodleData).filter(item => item.tier === tier);
      if (!tierNoodles.length) return;
      tierNoodles.forEach(data => {
        html += `<h3>${data.name} · ${data.tierLabel}</h3>`;
        html += `<p>${data.description}</p>`;
      });
    });
    return html;
  }

  function populateTierList() {
    const tierItems = {};
    document.querySelectorAll('.tier-row').forEach(row => {
      const label = row.querySelector('.tier-label');
      const items = row.querySelector('.tier-items');
      if (label && items) {
        tierItems[label.textContent.trim()] = items;
        items.innerHTML = '';
      }
    });

    noodles.forEach(noodle => {
      const container = tierItems[noodle.tier];
      if (!container) return;

      const card = document.createElement('div');
      card.className = 'spot-card';
      card.setAttribute('data-spot', noodle.name);

      if (noodle.bgImage) {
        card.classList.add('spot-card--with-bg');
        card.style.setProperty('--spot-bg-image', `url("${noodle.bgImage}")`);
      }

      const label = document.createElement('span');
      label.className = 'spot-card__name';
      label.textContent = noodle.name;
      card.appendChild(label);

      container.appendChild(card);
    });
  }

  function initNoodleTier() {
    const modal = document.getElementById('spotModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const contentSection = document.querySelector('.content-section');

    populateTierList();

    const spotCards = document.querySelectorAll('.spot-card');

    function showModal(noodleName) {
      const data = noodleData[noodleName];
      if (!data || !modal || !modalTitle || !modalBody) {
        return;
      }

      modalTitle.textContent = data.name;
      // 详情内容写入独立的内容区（#modalContent），不覆盖评论区 .noodle-comments
      const contentArea = document.getElementById('modalContent');
      if (contentArea) {
        contentArea.innerHTML = generateModalContent(data);
      } else {
        modalBody.innerHTML = generateModalContent(data);
      }

      // 加载该款面的独立评论区
      loadGiscusForNoodle(data);

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

    spotCards.forEach(card => {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        const noodleName = this.getAttribute('data-spot');
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.style.transform = '';
          showModal(noodleName);
        }, 150);
      });

      let touchStartTime = 0;
      card.addEventListener('touchstart', function() {
        touchStartTime = Date.now();
        this.style.transform = 'scale(0.98)';
      });

      card.addEventListener('touchend', function() {
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
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          hideModal();
        }
      });
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
        hideModal();
      }
    });

    if (contentSection) {
      contentSection.innerHTML = generateContentSectionHTML();
    }
  }

  onReady(initNoodleTier);
})();


