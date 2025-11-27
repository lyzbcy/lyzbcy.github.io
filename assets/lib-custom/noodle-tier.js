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
      tierLabel: '夯 · 6❤️鲜香代表',
      rating: 5,
      description: '鲜香味道一开盖就扑鼻，细细小小的面条在汤里极度吸味，整碗就是简单却不平庸的快乐。',
      pros: ['海鲜汤底够鲜，香气非常顶', '细面条吸汁，口感柔韧'],
      cons: [],
      note: '喜欢喝汤的可以多泡一会，让汤更浓。'
    },
    {
      name: '安徽板面-卤香牛肉板面【今麦郎】',
      tier: '夯',
      tierLabel: '夯 · 6❤️宽面王者',
      rating: 5,
      description: '宽面条超级带劲，卤香牛肉味越嚼越香，完全属于“吃一口顿悟板面真谛”的类型。',
      pros: ['宽面筋道，入口有嚼劲', '卤香味浓郁，越吃越香'],
      cons: [],
      note: '汤多泡一会口感更均衡。'
    },
    {
      name: '番茄肉酱风味拌面【茄皇】',
      tier: '夯',
      tierLabel: '夯 · 6❤️番茄拌面',
      rating: 5,
      description: '番茄香气饱满又不腻，拌面酱料直接拉满满足感，番茄党闭眼冲的级别。',
      pros: ['番茄味扎实，不是空口号', '作为拌面酱多但不腻'],
      cons: [],
      note: '酱多的话记得留一点面汤调开，口感更丝滑。'
    },
    {
      name: '海鲜风味【合味道】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️鲜甜速食杯',
      rating: 4,
      description: '杯面小巧，但海鲜味确实够鲜。唯一缺点就是份量迷你，大杯也撑不起胃。',
      pros: ['海鲜味足，鲜味稳定发挥', '开盖方便，杯面随时吃'],
      cons: ['份量偏少，大杯也吃不饱', '面容易有点坨'],
      note: '当作下午茶或夜宵小点最合适。'
    },
    {
      name: '刀削宽面-红烧牛肉面【今麦郎】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️刀削口感',
      rating: 4,
      description: '刀削感的宽面在速食里难得，面身宽厚更入味，红烧牛肉味稳稳当当。',
      pros: ['面体宽厚且入味', '红烧牛肉味扎实不跑偏'],
      cons: [],
      note: '泡完后建议再焖一分钟，让刀削口感更软弹。'
    },
    {
      name: '辣牛肉汤面【汤达人】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️多段辣味',
      rating: 4,
      description: '入口是微辣带点酸甜，吃完再喝汤会回到微辣，让人记住的火辣余韵超级鲜明。',
      pros: ['辣味层次丰富，先柔后烈', '酸甜平衡，把辣度托得很顺'],
      cons: [],
      note: '想体验辣味的后劲，最后一定要喝汤。'
    },
    {
      name: '金汤肥牛面【康师傅】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️全能型',
      rating: 4,
      description: '酸甜微辣全都沾一点，但没有明显短板，厚面饼配金汤就是稳健代表。',
      pros: ['面饼厚实耐泡', '汤底酸甜辣均衡，无明显缺点'],
      cons: [],
      note: ''
    },
    {
      name: '老坛酸菜牛肉面【统一】',
      tier: '顶级',
      tierLabel: '顶级 · 5❤️经典常青',
      rating: 4,
      description: '无需多言的老坛酸菜味，酸爽和牛肉香的平衡就是速食界的白月光。',
      pros: ['酸菜脆爽，味道经典', '香气层次熟悉又不过时'],
      cons: [],
      note: '泡面界永远的安全选项。'
    },
    {
      name: '鲜虾鱼板面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️大份量',
      rating: 3,
      description: '海鲜感不如海鲜系列鲜，但胜在份量足，吃完特别满足。',
      pros: ['量大实惠，吃完很满足', '搭配鱼板增加口感'],
      cons: ['鲜味不算突出'],
      note: ''
    },
    {
      name: '双萝卜牛腩面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️双萝卜彩蛋',
      rating: 3,
      description: '闻起来是卤味，吃着不算重口，脆脆萝卜像随机奖励，但也容易吃腻。',
      pros: ['萝卜脆感很惊喜', '卤香味舒服不过头'],
      cons: ['容易吃腻，风格偏单一'],
      note: ''
    },
    {
      name: '韩式土豆排骨风味【嗦粉】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️零食感拌粉',
      rating: 3,
      description: '粉面混合体很有劲，味道像妙脆角磨成粉撒进去，怪好吃的零食风。',
      pros: ['面粉混合口感很特别', '味道像零食一样上头'],
      cons: ['想要传统排骨味的人可能不适应'],
      note: ''
    },
    {
      name: '藤椒拌面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️平衡型拌面',
      rating: 3,
      description: '针对拌面做了油水平衡，但藤椒存在感太弱，整体平平无奇。',
      pros: ['口味调得很平衡，不油腻'],
      cons: ['藤椒香太弱，记忆点不足'],
      note: ''
    },
    {
      name: '粉面菜蛋-港式肥汁【千里薯】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️港式重口',
      rating: 3,
      description: '风味很港式，辣度对我来说有点重，属于偶尔想念港味时的选择。',
      pros: ['港式风味到位', '粉面混搭口感丰富'],
      cons: ['对不吃辣的人来说偏重口'],
      note: ''
    },
    {
      name: '老坛泡椒牛肉面【统一】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️泡椒限定',
      rating: 3,
      description: '想模仿老坛酸菜但没超越，泡椒味有点抢戏，还没酸菜吃，整体中规中矩。',
      pros: ['泡椒爱好者会喜欢微辣酸的味道'],
      cons: ['泡椒喧宾夺主，缺了酸菜的灵魂'],
      note: ''
    },
    {
      name: '羊肉汤面【白象】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️羊汤对标',
      rating: 3,
      description: '感觉像对标康师傅香辣牛肉面，羊肉汤底增加一点新鲜感。',
      pros: ['羊汤味带来新鲜体验'],
      cons: ['整体风味似曾相识'],
      note: ''
    },
    {
      name: '罗宋汤面【汤达人】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️酸甜轻量',
      rating: 3,
      description: '酸酸甜甜，除此之外没有太多亮点，属于温和型面。',
      pros: ['口味清爽，不压胃'],
      cons: ['缺乏特色，记忆点不多'],
      note: ''
    },
    {
      name: '红烧牛肉面【康师傅】',
      tier: '人上人',
      tierLabel: '人上人 · 4❤️守门员',
      rating: 3,
      description: '经典守门员，表现稳定但熟悉到缺乏惊喜。',
      pros: ['稳定发挥的经典味', '随处可买，安全感满满'],
      cons: ['太熟悉，惊喜感为零'],
      note: ''
    },
    {
      name: '海鲜浓汤面【白象】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️波力渔趣既视感',
      rating: 2,
      description: '细扁面条配海鲜味，吃起来像泡水版波力渔趣，趣味多过惊喜。',
      pros: ['面条细扁，吸汤快'],
      cons: ['味型像零食泡水，层次不足'],
      note: ''
    },
    {
      name: '赤豚骨浓汤风味【合味道】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️合味道情怀',
      rating: 2,
      description: '味道偏淡，完全靠合味道的情怀分撑着才能留在3❤️。',
      pros: ['汤底顺口不油'],
      cons: ['味道太淡，存在感弱'],
      note: ''
    },
    {
      name: '兰州牛肉面【阿宽】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️淡化版兰州',
      rating: 2,
      description: '比真正兰州拉面更淡且嚼劲不足，本身没错，只是我不爱。',
      pros: ['味道温和，容易入口'],
      cons: ['嚼劲与原版相比差一截'],
      note: ''
    },
    {
      name: '老母鸡汤面【白象】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️差临门一脚',
      rating: 2,
      description: '明明潜力满分却一直差那一下，不够鲜导致吃完心里空落落。',
      pros: ['汤头顺口，基础扎实'],
      cons: ['鲜味不足，不上不下'],
      note: ''
    },
    {
      name: '番茄面【统一】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️只有番茄味',
      rating: 2,
      description: '番茄味很一般，除了番茄就没别的特色，吃完印象模糊。',
      pros: ['番茄味道稳定，不会翻车'],
      cons: ['缺乏亮点，味型单薄'],
      note: ''
    },
    {
      name: '番茄炖牛腩【杨掌柜】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️塑料番茄',
      rating: 2,
      description: '有股塑料味，卤蛋也像没洗干净的茶叶蛋，整体违和。',
      pros: [],
      cons: ['番茄味假，卤蛋口感怪'],
      note: ''
    },
    {
      name: '番茄鸡蛋面【康师傅】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️汤好喝面平庸',
      rating: 2,
      description: '汤还不错，但面本身没什么特色，喝汤>吃面。',
      pros: ['汤底顺口'],
      cons: ['面条没有记忆点'],
      note: ''
    },
    {
      name: '经典番茄肉酱意大利面【怡芽】',
      tier: 'NPC',
      tierLabel: 'NPC · 3❤️低脂番茄酱',
      rating: 2,
      description: '低脂高蛋白的宣传确实亮眼，但即使在减脂期也不会拿它当正餐，因为味道比起茄皇版本明显逊色。',
      pros: ['低脂高蛋白，营养标签友好', '意面形态方便控制分量'],
      cons: ['番茄酱不如茄皇浓郁好吃', '整体口味偏寡，饱腹满足感低'],
      note: '更适合偶尔换口味的小食，而非真正用来填饱肚子。'
    },
    {
      name: '香菜面',
      tier: '拉完了',
      tierLabel: '拉完了 · 史级香菜轰炸',
      rating: 1,
      description: '香菜味浓烈到连香菜控都受不了，属于直接送进史册的程度。',
      pros: [],
      cons: ['香菜味太夸张，难以下咽'],
      note: ''
    },
    {
      name: '蒜香猪骨汤面【白象】',
      tier: '拉完了',
      tierLabel: '拉完了 · 史级蒜味',
      rating: 1,
      description: '蒜香搭配猪骨汤呈现出怪异味道，像是在报复社会。',
      pros: [],
      cons: ['蒜香与猪骨味混在一起非常怪'],
      note: ''
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
            ${data.pros.map(pro => `<li>${pro}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.cons && data.cons.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(252, 243, 207, 0.1) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(250, 112, 154, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">⚠️ 踩雷点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.cons.map(con => `<li>${con}</li>`).join('')}
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
        <p style="margin-top: 8px; font-size: 0.9em; color: #8A8A8A;">复购指数</p>
      </div>
    `;

    return html;
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


