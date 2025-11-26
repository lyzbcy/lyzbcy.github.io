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
  const imageBasePath = '/assets/image%20library/love-tier-images/';

  // 恋爱项目数据
  const spots = [
    {
      name: '看电影',
      tier: '顶级',
      tierLabel: '顶级 · 老牌不翻车项目',
      rating: 5,
      description: '看电影真的算是恋爱里万年不过时的经典项目，尤其是已经确认关系之后，气氛会比暧昧期更加轻松自在。无论是在电影院、家里沙发，还是和火锅、甜品拼成组合套餐，都能轻松延展成一个属于两个人的小仪式。就算前面逛街逛累了，直接钻进影院里休整两个小时，也是一种同步呼吸的幸福感。',
      pros: [
        '玩法拓展性极强：沙发电影、火锅电影、主题电影都能玩出花',
        '作为约会中场休息点，能让两个人迅速回血再出发',
        '共同的观影体验会自然创造聊天素材，不用担心冷场'
      ],
      cons: [
        '如果真的天天去，会有点审美疲劳，还是得穿插其他项目'
      ],
      note: '关键在于挑好片、搭好氛围，别怕自己话多，观影结束后一起拆剧情才是最甜的部分。',
      bgImage: imageBasePath + encodeURIComponent('看电影.JPG')
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
        <div style="background: linear-gradient(135deg, rgba(250, 112, 154, 0.08) 0%, rgba(255, 182, 193, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(250, 112, 154, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">✨ 优点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.pros.map(pro => `<li>${pro}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.cons && data.cons.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(250, 112, 154, 0.1) 0%, rgba(252, 243, 207, 0.1) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(250, 112, 154, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">⚠️ 缺点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.cons.map(con => `<li>${con}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.note) {
      html += `
        <div style="background: rgba(0, 0, 0, 0.03); padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 3px solid #ff6b9d;">
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

  function initLoveTier() {
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

  onReady(initLoveTier);
})();

