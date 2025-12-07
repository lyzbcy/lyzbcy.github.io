/**
 * 2025-12-7 健身食物性价比排行 & 从夯到拉排名
 * 新版数据源 (Updated with Eggs & Protein Powder)
 */
(function() {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      setTimeout(callback, 0);
    }
  }

  // ============================================
  // 新版详细说明数据 (Dec 7 Data)
  // ============================================
  const supplementData = {
    '鸡蛋': {
      name: '鸡蛋 (Eggs)',
      tier: '人上人',
      tierLabel: '🟡 人上人 (Excellent)',
      tierColor: '#FFD93D',
      image: 'https://s41.ax1x.com/2025/12/07/pZnVG4K.jpg',
      description: '蛋白没毛病，基本全是蛋白质成分，热量也低。油脂、热量基本全部集中在蛋黄，但是蛋黄营养很全面，但吃过了也不太好。所以我一天差不多也就1-2个蛋黄，剩下的鸡蛋只吃蛋白。',
      pros: [
        '性价比之王 (1元能买14g蛋白质)',
        '成分纯粹，优质蛋白',
        '蛋黄营养全面'
      ],
      cons: [
        '吃多了有点平淡',
        '剥壳/烹饪稍微麻烦'
      ],
      rating: 5,
      costPerf: '1元 ≈ 14g 蛋白质', // 性价比指标
      note: '15元/30个 (约0.5元/个)'
    },
    '蛋白粉': {
      name: '蛋白粉 (Protein Powder)',
      tier: '人上人',
      tierLabel: '🟡 人上人 (Excellent)',
      tierColor: '#FFD93D',
      image: 'https://s41.ax1x.com/2025/12/07/pZne1fK.jpg', // User provided image
      description: '性价比其实中规中矩，可以作为健身食物的性价比参考。最大的优势是方便，口味也不错，好吸收。品牌参考：赛霸、北欧海盗、诺特兰德红桶这一层次。',
      pros: [
        '极致方便',
        '口味不错，好吸收',
        '作为参考标杆'
      ],
      cons: [
        '性价比不如鸡蛋 (1元 ≈ 4.5g 蛋白质)'
      ],
      rating: 4,
      costPerf: '1元 ≈ 4.5g 蛋白质',
      note: '160元/30天 (约5.3元/天)'
    }
  };

  // 新版层级颜色映射
  const tierColors = {
    '夯': { gradient: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)', textColor: 'white', shadow: 'rgba(255, 107, 107, 0.3)' },
    '神': { gradient: 'linear-gradient(135deg, #FFA07A 0%, #FF8C69 100%)', textColor: 'white', shadow: 'rgba(255, 160, 122, 0.3)' },
    '人上人': { gradient: 'linear-gradient(135deg, #FFD93D 0%, #FFC947 100%)', textColor: 'white', shadow: 'rgba(255, 217, 61, 0.3)' },
    '好': { gradient: 'linear-gradient(135deg, #FFD93D 0%, #FFC947 100%)', textColor: 'white', shadow: 'rgba(255, 217, 61, 0.3)' },
    '凡': { gradient: 'linear-gradient(135deg, #E8E8E8 0%, #D3D3D3 100%)', textColor: '#4A4A4A', shadow: 'rgba(0, 0, 0, 0.1)' },
    '拉': { gradient: 'linear-gradient(135deg, #333333 0%, #000000 100%)', textColor: 'white', shadow: 'rgba(0, 0, 0, 0.3)' }
  };

  function getRatingStars(rating) {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  function generateModalContent(data) {
    const tierStyle = tierColors[data.tier] || tierColors['凡'];
    let html = `
      <div style="margin-bottom: 24px; text-align:center;">
        <div style="display: inline-block; background: ${tierStyle.gradient}; color: ${tierStyle.textColor}; padding: 6px 16px; border-radius: 20px; font-size: 0.85em; font-weight: 600; letter-spacing: 0.5px; box-shadow: 0 2px 8px ${tierStyle.shadow};">
          ${data.tierLabel}
        </div>
      </div>
    `;

    // Add Image if available
    if (data.image) {
      html += `
        <div style="margin-bottom: 20px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <img src="${data.image}" style="width: 100%; height: auto; display: block;" alt="${data.name}">
        </div>
      `;
    }

    // Cost Efficiency Highlight
    if (data.costPerf) {
      html += `
        <div style="background: rgba(0,122,255,0.05); border: 1px solid rgba(0,122,255,0.1); border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; text-align: center;">
          <p style="margin:0; font-size: 0.9em; color:#007aff; font-weight:600;">💰 蛋白质性价比</p>
          <p style="margin:4px 0 0 0; font-size: 1.1em; color:#1d1d1f; font-weight:700;">${data.costPerf}</p>
        </div>
      `;
    }

    html += `<p style="font-size: 1.05em; line-height: 1.9; margin-bottom: 20px;">${data.description}</p>`;

    if (data.pros && data.pros.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(50, 180, 80, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(52, 199, 89, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">✨ 优点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.pros.map(pro => `<li>${pro}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.cons && data.cons.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(255, 69, 58, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(255, 59, 48, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">⚠️ 缺点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.cons.map(con => `<li>${con}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.note) {
      html += `
        <div style="background: rgba(0, 0, 0, 0.03); padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 3px solid #667eea;">
          <p style="margin: 0; font-size: 0.9em; color: #424245;"><strong>💡 备注：</strong>${data.note}</p>
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

  function initSupplementTier() {
    const modal = document.getElementById('supplementModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const supplementCards = document.querySelectorAll('.supplement-card');

    if (!modal || !modalTitle || !modalBody) return;

    function showModal(supplementName) {
      const data = supplementData[supplementName];
      let finalData = data;
      if (!finalData) {
        const key = Object.keys(supplementData).find(k => supplementName.includes(k) || k.includes(supplementName));
        if (key) finalData = supplementData[key];
      }

      if (!finalData) return;

      modalTitle.textContent = finalData.name;
      modalBody.innerHTML = generateModalContent(finalData);
      
      modal.style.display = 'flex';
      setTimeout(() => modal.classList.add('show'), 10);
      document.body.style.overflow = 'hidden';
    }

    function hideModal() {
      modal.classList.remove('show');
      setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }

    supplementCards.forEach(card => {
      card.addEventListener('click', function(e) {
        e.preventDefault();
        const supplementName = this.getAttribute('data-supplement');
        showModal(supplementName);
      });
    });

    if (modalClose) modalClose.addEventListener('click', hideModal);
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) hideModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideModal(); });
  }

  onReady(initSupplementTier);
})();
