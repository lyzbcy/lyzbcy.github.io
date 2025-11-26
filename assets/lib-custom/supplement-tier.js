/**
 * 健身补剂排名功能
 * 支持点击卡片查看详情，自动生成详细说明
 */
(function() {
  'use strict';

  // 等待 DOM 加载完成
  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      // DOM 已经加载完成，立即执行
      setTimeout(callback, 0);
    }
  }

  // ============================================
  // 补剂详细说明数据 - 在这里编辑所有内容
  // ============================================
  const supplementData = {
    '肌酸': {
      name: '肌酸',
      tier: '夯',
      tierLabel: '夯（最高级）',
      tierColor: '#FF6B6B',
      description: '肌酸对我来说是效果最明显的补剂。从变大的维度上来说，感觉有明显进步储水更多了，我也会平常喝更多的水。而且价格便宜，各个品牌之间没有明显区别，只有口味上的区别，所以给它夯级别。',
      pros: [
        '价格便宜，性价比高',
        '各个品牌之间没有明显区别，只有口味上的区别',
        '效果明显，对增肌有帮助',
        '增加肌肉储水，看起来更饱满'
      ],
      cons: [],
      rating: 5,
      note: ''
    },
    '蛋白粉': {
      name: '蛋白粉',
      tier: '顶级',
      tierLabel: '顶级',
      tierColor: '#FFA07A',
      description: '蛋白粉是补充蛋白质的便捷选择。平均下来，一天一勺大概24g的蛋白质，又好吸收。而且平均下来一般的话是5~7块钱。我觉得没有必要买特别好的粉，5~7块钱这样子的话，差不多是赛霸这个层次的粉，我觉得差不多了，再往上边际效应递减。那换算成鸡蛋的话，其实跟鸡蛋是差不多价格的，比鸡蛋稍微贵一点点，它的好处就是便携，然后方便。',
      pros: [
        '便携方便，随时随地可以补充',
        '价格合理，换算成鸡蛋的话，其实跟鸡蛋差不多价格，比鸡蛋稍微贵一点点',
        '吸收好，蛋白质含量高',
        '性价比高，5~7块钱的粉（如赛霸等级）已经足够，没必要买特别好的，边际效应递减'
      ],
      cons: [],
      rating: 4,
      note: ''
    },
    '多种维生素矿物质片': {
      name: '多种维生素矿物质片',
      tier: '顶级',
      tierLabel: '顶级',
      tierColor: '#FFA07A',
      description: '健身的话，毕竟是长身体，是需要更多维生素的。如果不能做到每周及时的摄入适量的丰富水果的话，吃个矿物质片还是不错的，算是一个下策了。我现在在吃的是京东京造的，三瓶的话大概是60块钱，也就是大概20块钱一瓶。20块钱有60片，一天的话也挺便宜的，性价比挺高。',
      pros: [
        '性价比高，价格便宜（20块钱60片）',
        '方便补充维生素和矿物质',
        '适合不能及时摄入丰富水果的情况',
        '健身长身体需要更多维生素，补充方便'
      ],
      cons: [],
      rating: 4,
      note: '目前吃的是京东京造的，三瓶60块钱，一瓶20块钱，60片'
    },
    '咖啡': {
      name: '咖啡',
      tier: '顶级',
      tierLabel: '顶级',
      tierColor: '#FFA07A',
      description: '咖啡对我来说比氮泵还有效，尤其是加一点甜味的普通咖啡，既不需要强迫自己喝难喝的纯黑咖啡，又能把提神和力量都拉满。早起来一杯能把一整天的精神状态拉高，训练时力量输出明显提升，记录的极限重量也比喝氮泵时更好。减脂期的话，咖啡因还能先把脂肪动员出来，用掉就亏不掉，如果不消耗反而会堆在肚子上，所以喝完就得动起来。另外，黑咖啡能压食欲，还能加速代谢，这两头都在帮你把“出”拉高、“入”拉低，就是要记得咖啡容易让牙齿染色，要多注意口腔清洁。',
      pros: [
        '提神和力量提升比氮泵更明显，性价比高',
        '无需硬喝纯黑咖啡，略加糖也能兼顾口感和效果',
        '减脂期帮助脂肪动员、提升代谢，同时抑制食欲',
        '早上一杯能稳定整天精神状态，训练时更有劲'
      ],
      cons: [
        '若动员出的脂肪不及时消耗，容易又回堆在腹部',
        '易导致牙齿色素沉淀，需要注意清洁和护齿'
      ],
      rating: 4,
      note: '减脂期尽量早上空腹喝，喝后尽快运动，注意口腔护理'
    },
    '氮泵': {
      name: '氮泵',
      tier: 'NPC',
      tierLabel: 'NPC',
      tierColor: '#E8E8E8',
      description: '氮泵对我来说用处不大。无论是从感觉上还是从我记录的极限力量上来说，我没有感觉到力量的提升，效果不如咖啡，而且还比较贵。',
      pros: [],
      cons: [
        '价格较贵，性价比低',
        '效果不明显，没有感觉到力量提升',
        '不如咖啡的效果好'
      ],
      rating: 2,
      note: '目前喝的氮泵是训练怪兽的氮泵'
    }
  };

  // 层级颜色映射
  const tierColors = {
    '夯': { gradient: 'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)', textColor: 'white', shadow: 'rgba(255, 107, 107, 0.3)' },
    '顶级': { gradient: 'linear-gradient(135deg, #FFA07A 0%, #FF8C69 100%)', textColor: 'white', shadow: 'rgba(255, 160, 122, 0.3)' },
    '人上人': { gradient: 'linear-gradient(135deg, #FFD93D 0%, #FFC947 100%)', textColor: 'white', shadow: 'rgba(255, 217, 61, 0.3)' },
    'NPC': { gradient: 'linear-gradient(135deg, #E8E8E8 0%, #D3D3D3 100%)', textColor: '#4A4A4A', shadow: 'rgba(0, 0, 0, 0.1)' },
    '拉完了': { gradient: 'linear-gradient(135deg, #F5F5F5 0%, #E8E8E8 100%)', textColor: '#8A8A8A', shadow: 'rgba(0, 0, 0, 0.05)' }
  };

  // 生成星级显示
  function getRatingStars(rating) {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  // 生成模态框内容HTML
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
        <div style="background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(102, 126, 234, 0.15);">
          <p style="margin: 0 0 12px 0; font-weight: 600; color: #1D1D1F; font-size: 1em;">✨ 优点</p>
          <ul style="margin: 0; padding-left: 24px;">
            ${data.pros.map(pro => `<li>${pro}</li>`).join('')}
          </ul>
        </div>
      `;
    }

    if (data.cons && data.cons.length > 0) {
      html += `
        <div style="background: linear-gradient(135deg, rgba(255, 107, 107, 0.08) 0%, rgba(238, 90, 111, 0.08) 100%); padding: 20px; border-radius: 16px; margin: 20px 0; border: 1px solid rgba(255, 107, 107, 0.15);">
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
          <p style="margin: 0; font-size: 0.9em; color: #424245;"><strong>备注：</strong>${data.note}</p>
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

  // 生成页面详细说明HTML
  function generateContentSectionHTML() {
    let html = '<h2>详细说明</h2>';
    
    Object.values(supplementData).forEach(data => {
      html += `<h3>${data.name} - ${data.tier}级别</h3>`;
      html += `<p>${data.description}</p>`;
    });
    
    return html;
  }

  // 初始化功能
  function initSupplementTier() {
    // 获取DOM元素
    const modal = document.getElementById('supplementModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');
    const supplementCards = document.querySelectorAll('.supplement-card');
    const contentSection = document.querySelector('.content-section');

    // 检查必要的元素是否存在
    if (!modal || !modalTitle || !modalBody || !modalClose) {
      console.warn('未找到模态框元素，模态框功能可能无法使用');
    }

    if (!contentSection) {
      console.warn('未找到详细说明区域');
    }

    // 显示模态框 - 添加流畅动画
    function showModal(supplementName) {
      const data = supplementData[supplementName];
      if (!data || !modal || !modalTitle || !modalBody) {
        return;
      }

      modalTitle.textContent = data.name;
      modalBody.innerHTML = generateModalContent(data);
      
      // 重置动画
      modal.style.display = 'flex';
      modal.style.opacity = '0';
      const modalContent = modal.querySelector('.modal-content');
      if (modalContent) {
        modalContent.style.transform = 'translateY(30px) scale(0.95)';
        modalContent.style.opacity = '0';
        
        // 触发重排以应用初始状态
        void modal.offsetWidth;
        
        // 添加显示类并触发动画
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

    // 隐藏模态框 - 添加流畅动画
    function hideModal() {
      if (!modal) return;
      
      const modalContent = modal.querySelector('.modal-content');
      
      // 添加退出动画
      modal.style.opacity = '0';
      if (modalContent) {
        modalContent.style.transform = 'translateY(30px) scale(0.95)';
        modalContent.style.opacity = '0';
      }
      
      // 等待动画完成后移除
      setTimeout(() => {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }, 300);
    }

    // 为每个补剂卡片添加点击事件 - 添加点击反馈
    supplementCards.forEach(card => {
      // 点击事件
      card.addEventListener('click', function(e) {
        e.preventDefault();
        const supplementName = this.getAttribute('data-supplement');
        
        // 添加点击反馈动画
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
          this.style.transform = '';
          showModal(supplementName);
        }, 150);
      });
      
      // 触摸设备优化
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

    // 关闭按钮点击事件
    if (modalClose) {
      modalClose.addEventListener('click', hideModal);
    }

    // 点击背景关闭模态框
    if (modal) {
      modal.addEventListener('click', function(e) {
        if (e.target === modal) {
          hideModal();
        }
      });
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
        hideModal();
      }
    });

    // 生成并插入页面详细说明
    if (contentSection) {
      contentSection.innerHTML = generateContentSectionHTML();
    }
  }

  // 等待 DOM 加载完成后初始化
  onReady(initSupplementTier);
})();

