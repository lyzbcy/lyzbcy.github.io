(function() {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      setTimeout(callback, 0);
    }
  }

  const spotData = {};

  const tierOrder = ['夯', '顶级', '人上人', 'NPC', '拉完了'];
  const imageBasePath = '/assets/image%20library/travel-tier-images/';

  const spots = [
    {
      name: '融创乐园',
      tier: '顶级',
      tierLabel: '顶级 · 一日爽玩',
      rating: 4,
      description: '原本有实力冲夯，但游乐园基本一整天就在园区里。票价比较友好，比欢乐谷更刺激。',
      pros: [
        '雪世界、过山车、跳楼机等项目刺激度在线',
        '价格在同级主题乐园里算友好'
      ],
      cons: [
        
      ],
      note: '',
      bgImage: imageBasePath + encodeURIComponent('融创.jpg')
    },
    {
      name: '三国水浒城',
      tier: '顶级',
      tierLabel: '顶级 · 影视城体验',
      rating: 4,
      description: '三国演义＋水浒传取景地，。除了看布景，园区还有实景演出和小型游乐项目，拍照、逛街、看秀。',
      pros: [
        '布景细节丰富，穿汉服可以出片',
        '实景演出＋各种游乐设施',
        '网传背《出师表》有机会免费入园，值得一试'
      ],
      cons: [
        '节假日人可能会比较多'
      ],
      note: '',
      bgImage: imageBasePath + encodeURIComponent('三国水浒城.jpg')
    },
    {
      name: '三阳广场',
      tier: '顶级',
      tierLabel: '顶级 · 市中心地标',
      rating: 3,
      description: '无锡地铁“天花板”级别的交通枢纽，地下空间巨大、出口众多，比较值得一看。地面是典型的市中市，周边商业密度极高。',
      pros: [
        '地铁站+灯光装置很震撼，算是城市地标体验',
        '周边写字楼、商业综合体林立，基本上能满足大部分娱乐需求'
      ],
      cons: [
        '商场偏老派，品牌更新慢，玩法与其它综合体类似',
        '高峰期人流量大'
      ],
      note: '想看夜景或拍城市线条，建议傍晚到场，地铁站里先逛一圈再出站，体验感更完整。',
      bgImage: imageBasePath + encodeURIComponent('三阳广场.jpg')
    },
    {
      name: '鼋头渚',
      tier: '人上人',
      tierLabel: '季节待定 · 看樱花',
      rating: 3,
      description: '春天樱花一开就能冲夯。冬天主要是坐游船、喂海鸥，整体体验取决于季节，属于典型的季节限定型景区。',
      pros: [
        '樱花谷、长春桥在花期里必拍，氛围感拉满',
        '太湖沿岸视野开阔，游船看景＋喂海鸥很放松'
      ],
      cons: [
        '非花期内容单薄，容易逛一圈就结束',
        '船票旺季需要提前预约，排队时间不可小觑'
      ],
      note: '想看樱花一定要提前关注开放时间并预约，下午逆光时段拍照更好看。',
      bgImage: imageBasePath + encodeURIComponent('鼋头渚.jpg')
    },
    {
      name: '蠡湖中央公园',
      tier: 'NPC',
      tierLabel: 'NPC · 安静取景地',
      rating: 2,
      description: '园区本身没有游船和项目，主要就是湖边散步＋拍照。环境安静但略显阴森，适合想找一块人少的文艺角落，春秋的光线和色彩更好，冬天就偏冷清。',
      pros: [
        '湖面＋草坪适合拍文艺照片，光线好的时候很出片',
        '人流不大，想躲开景区喧闹来这里还算清净'
      ],
      cons: [
        '没有实质性玩法，想坐船得去旁边的蠡湖码头',
        '天气阴沉时氛围偏冷，晚上会有点阴森'
      ],
      note: '想拍照的话推荐挑晴天或日落时段，带上小道具更有氛围。',
      bgImage: imageBasePath + encodeURIComponent('蠡湖中央公园.png')
    },
    {
      name: '南长街',
      tier: 'NPC',
      tierLabel: 'NPC · 面子保留',
      rating: 3,
      description: '无锡必打卡老街，但和苏州平江路、杭州河坊街类似，同质化严重。河道＋灯光气氛还行，不过假期人挤人，吃喝偏贵，更多是来打卡的“社交名片”。',
      pros: [
        '漕河夜景配灯笼挺有氛围，照片好看',
        '小吃、糕点集中，想尝试无锡特色很方便',
        '去年春节联欢晚会无锡分会场在南长街'
      ],
      cons: [
        '节假日拥挤且路窄，体验感容易崩',
        '物价偏高且同质化'
      ],
      note: '尽量挑工作日或早上去，顺着运河散步会舒服很多。',
      bgImage: imageBasePath + encodeURIComponent('南长街.jpg')
    },
    {
      name: '灵山圣境',
      tier: '拉完了',
      tierLabel: '拉完了 · 只看大佛',
      rating: 1,
      description: '核心看点就是一尊超大的佛像，其余就是漫长的台阶和祈福动线。除了登山+看佛，几乎没有惊喜，节奏慢且略显枯燥，如果不是信众很容易觉得“打卡即走”。',
      pros: [
        '大佛规模震撼，第一次见还是会感叹',
        '园区讲解里涵盖部分佛教文化，可当人文科普'
      ],
      cons: [
        '爬坡+排队耗时长，过程单调',
        '商业化浓，体验感偏疲惫'
      ],
      note: '如果一定要去，记得早点进园，避开正午最晒的上山段。',
      bgImage: imageBasePath + encodeURIComponent('灵山圣境.jpg')
    },
    {
      name: '惠山古镇',
      tier: '拉完了',
      tierLabel: '拉完了 · 商业街',
      rating: 1,
      description: '古镇建筑保存得还不错，但商业化非常重，基本就是逛店+买手信。没有明确目的的话很容易“走马观花”，对没有乡土情结的游客来说可看性有限。',
      pros: [
        '保留了不少祠堂与宗祠，想了解无锡本地宗族文化可顺便看看'
      ],
      cons: [
        '手作/小吃高度同质化，缺少独特体验',
        '节假日人流大、停车难，逛完记忆点不多'
      ],
      note: '如果真要去，建议和惠山泥人体验或惠山泉水打包安排，否则行程性价比不高。',
      bgImage: imageBasePath + encodeURIComponent('惠山古镇.jpg')
    }
  ];

  spots.forEach(spot => {
    spotData[spot.name] = spot;
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
        <div style="background: linear-gradient(135deg, rgba(79, 172, 254, 0.08) 0%, rgba(56, 249, 215, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(79, 172, 254, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">✨ 好玩点</p>
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
        <div style="background: rgba(0, 0, 0, 0.03); padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 3px solid #4facfe;">
          <p style="margin: 0; font-size: 0.9em; color: #424245;"><strong>私藏小贴士：</strong>${data.note}</p>
        </div>
      `;
    }

    html += `
      <div style="margin-top: 24px; text-align: center;">
        <div style="font-size: 1.2em; letter-spacing: 2px;">${getRatingStars(data.rating)}</div>
        <p style="margin-top: 8px; font-size: 0.9em; color: #8A8A8A;">推荐指数</p>
      </div>
    `;

    return html;
  }

  function generateContentSectionHTML() {
    let html = '<h2>详细说明</h2>';
    tierOrder.forEach(tier => {
      const tierSpots = Object.values(spotData).filter(item => item.tier === tier);
      if (!tierSpots.length) return;
      tierSpots.forEach(data => {
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

    spots.forEach(spot => {
      const container = tierItems[spot.tier];
      if (!container) return;

      const card = document.createElement('div');
      card.className = 'spot-card';
      card.setAttribute('data-spot', spot.name);

      if (spot.bgImage) {
        card.classList.add('spot-card--with-bg');
        card.style.setProperty('--spot-bg-image', `url("${spot.bgImage}")`);
      }

      const label = document.createElement('span');
      label.className = 'spot-card__name';
      label.textContent = spot.name;
      card.appendChild(label);

      container.appendChild(card);
    });
  }

  function initTravelTier() {
    const modal = document.getElementById('spotModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const contentSection = document.querySelector('.content-section');

    populateTierList();

    const spotCards = document.querySelectorAll('.spot-card');

    function showModal(spotName) {
      const data = spotData[spotName];
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
        const spotName = this.getAttribute('data-spot');
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.style.transform = '';
          showModal(spotName);
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

  onReady(initTravelTier);
})();

