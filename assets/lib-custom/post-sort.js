/**
 * 首页文章排序功能
 * 支持按更新时间/发布时间排序，支持正序/倒序
 */
(function() {
  'use strict';

  // 等待 DOM 加载完成
  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  // 初始化排序功能
  function initPostSort() {
    console.log('开始初始化文章排序功能...');
    const postList = document.getElementById('post-list');
    if (!postList) {
      console.error('未找到 post-list 元素');
      return;
    }
    console.log('找到 post-list 元素');

    // 获取文章数据
    const dataScript = document.getElementById('post-sort-data');
    if (!dataScript) {
      console.error('未找到 post-sort-data 脚本');
      return;
    }
    console.log('找到 post-sort-data 脚本');

    let postsData = [];
    try {
      postsData = JSON.parse(dataScript.textContent);
      console.log('成功解析文章数据，共', postsData.length, '篇文章');
    } catch (e) {
      console.error('解析文章数据失败:', e);
      return;
    }

    // 创建排序控件
    const sortControls = createSortControls();
    postList.parentNode.insertBefore(sortControls, postList);
    console.log('排序控件已创建并插入');

    // 获取所有文章卡片
    const postCards = Array.from(postList.querySelectorAll('.card-wrapper'));
    console.log('找到', postCards.length, '个文章卡片');
    
    // 创建文章卡片映射（URL -> DOM元素）
    const postMap = new Map();
    
    // URL 规范化函数
    function normalizeUrl(url) {
      try {
        // 解码 URL，然后重新编码以确保一致性
        const decoded = decodeURIComponent(url);
        return decoded;
      } catch (e) {
        return url;
      }
    }
    
    // 格式化日期显示
    // 完全手动解析日期，兼容微信浏览器等特殊环境
    function formatDate(dateString) {
      if (!dateString || dateString === 'null' || dateString === null || typeof dateString !== 'string') {
        return '';
      }
      
      try {
        // 完全手动解析日期字符串，不依赖 Date 构造函数
        // 支持的格式：
        // 格式1: "2025-11-13 10:30:00 +0800" (带时区)
        // 格式2: "2025-11-13 10:30:00" (不带时区)
        // 格式3: "2025-11-13" (只有日期)
        // 格式4: ISO 8601 格式 "2025-11-13T10:30:00+08:00"
        
        // 提取日期部分：YYYY-MM-DD
        const dateMatch = dateString.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (!dateMatch) {
          console.warn('无法从字符串中提取日期:', dateString);
          return '';
        }
        
        const year = parseInt(dateMatch[1], 10);
        const month = parseInt(dateMatch[2], 10);
        const day = parseInt(dateMatch[3], 10);
        
        // 验证年月日的有效性
        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          console.warn('日期解析结果包含 NaN:', dateString, {year, month, day});
          return '';
        }
        
        // 验证日期范围
        if (year < 1900 || year > 2100) {
          console.warn('年份超出合理范围:', year);
          return '';
        }
        if (month < 1 || month > 12) {
          console.warn('月份超出范围:', month);
          return '';
        }
        if (day < 1 || day > 31) {
          console.warn('日期超出范围:', day);
          return '';
        }
        
        // 格式化输出：YYYY/MM/DD
        const monthStr = String(month).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        
        return `${year}/${monthStr}/${dayStr}`;
      } catch (e) {
        console.warn('日期格式化错误:', dateString, e);
        return '';
      }
    }

    // 添加更新时间显示
    function addUpdateTimeDisplay(card, postData) {
      if (!postData) return;
      
      // 检查是否已经添加过更新时间
      if (card.querySelector('.post-update-time')) return;
      
      // 获取更新时间，如果没有则使用发布时间
      const updateTime = postData.last_modified_at || postData.date;
      // 确保 updateTime 是有效的字符串，不是 null 或 undefined
      if (!updateTime || updateTime === 'null' || updateTime === null || typeof updateTime !== 'string') {
        return;
      }
      
      // 查找日期显示的位置（通常在 .post-meta 或包含日期的元素中）
      const metaElements = card.querySelectorAll('.post-meta, [class*="meta"], [class*="date"]');
      let dateContainer = null;
      
      // 尝试找到包含日期的容器
      for (const meta of metaElements) {
        const text = meta.textContent || '';
        // 查找包含日期格式的元素（如 2025/11/11）
        if (/\d{4}\/\d{1,2}\/\d{1,2}/.test(text)) {
          dateContainer = meta;
          break;
        }
      }
      
      // 如果没找到，尝试查找所有包含时间图标的元素
      if (!dateContainer) {
        const timeIcons = card.querySelectorAll('i.fa-calendar, i.fa-clock, [class*="calendar"], [class*="time"]');
        if (timeIcons.length > 0) {
          dateContainer = timeIcons[0].closest('li, div, span');
        }
      }
      
      // 如果还是没找到，尝试查找所有 small 或 time 元素
      if (!dateContainer) {
        const smallElements = card.querySelectorAll('small, time, .text-muted');
        for (const el of smallElements) {
          if (/\d{4}\/\d{1,2}\/\d{1,2}/.test(el.textContent || '')) {
            dateContainer = el.parentElement;
            break;
          }
        }
      }
      
      if (dateContainer) {
        // 创建更新时间显示元素
        const updateTimeEl = document.createElement('span');
        updateTimeEl.className = 'post-update-time';
        
        const updateDate = formatDate(updateTime);
        
        // 显示更新时间（如果有）
        if (updateDate) {
          updateTimeEl.innerHTML = `<i class="far fa-edit"></i>更新：${updateDate}`;
          dateContainer.appendChild(updateTimeEl);
        }
      }
    }

    // 规范化文章数据中的 URL
    postsData.forEach(post => {
      post.normalizedUrl = normalizeUrl(post.url);
    });
    
    // 创建文章卡片到文章数据的映射
    const cardToPostDataMap = new Map();
    
    postCards.forEach(card => {
      const link = card.querySelector('a.post-preview');
      if (link) {
        const url = new URL(link.href, window.location.origin).pathname;
        const normalizedUrl = normalizeUrl(url);
        postMap.set(normalizedUrl, card);
        // 同时存储原始 URL 和编码后的 URL，以便匹配
        if (url !== normalizedUrl) {
          postMap.set(url, card);
        }
        
        // 查找对应的文章数据
        const postData = postsData.find(p => {
          return p.normalizedUrl === normalizedUrl || p.normalizedUrl === url || p.url === normalizedUrl || p.url === url;
        });
        
        if (postData) {
          cardToPostDataMap.set(card, postData);
          addUpdateTimeDisplay(card, postData);
        }
      }
    });

    // 当前排序状态
    let currentSortType = 'updated'; // 'updated' 或 'date'
    let currentSortOrder = 'desc'; // 'asc' 或 'desc'

    // 排序函数
    function sortPosts(type, order) {
      currentSortType = type;
      currentSortOrder = order;

      // 根据排序类型和顺序排序
      const sortedPosts = postsData
        .filter(post => {
          // 尝试匹配原始 URL 或规范化后的 URL
          return postMap.has(post.url) || postMap.has(post.normalizedUrl);
        })
        .sort((a, b) => {
          const aTime = type === 'updated' ? a.last_modified_ts : a.date_ts;
          const bTime = type === 'updated' ? b.last_modified_ts : b.date_ts;
          
          if (order === 'asc') {
            return aTime - bTime;
          } else {
            return bTime - aTime;
          }
        });

      // 重新排列 DOM 元素
      sortedPosts.forEach(post => {
        const card = postMap.get(post.url) || postMap.get(post.normalizedUrl);
        if (card) {
          postList.appendChild(card);
          // 确保更新时间显示存在
          if (post && !card.querySelector('.post-update-time')) {
            addUpdateTimeDisplay(card, post);
          }
        }
      });

      // 更新按钮状态
      updateButtonStates(type, order);
      
      // 保存到 localStorage
      saveSortPreference(type, order);
    }

    // 创建排序控件
    function createSortControls() {
      const container = document.createElement('div');
      container.className = 'post-sort-controls';
      container.innerHTML = `
        <div class="post-sort-wrapper">
          <label class="post-sort-label">排序方式：</label>
          <div class="post-sort-buttons">
            <button class="post-sort-btn" data-type="updated" data-order="desc" title="按更新时间倒序（最新在前）">
              <i class="fas fa-sort-amount-down"></i> 更新时间
            </button>
            <button class="post-sort-btn" data-type="updated" data-order="asc" title="按更新时间正序（最早在前）">
              <i class="fas fa-sort-amount-up"></i> 更新时间
            </button>
            <button class="post-sort-btn" data-type="date" data-order="desc" title="按发布时间倒序（最新在前）">
              <i class="fas fa-sort-amount-down"></i> 发布时间
            </button>
            <button class="post-sort-btn" data-type="date" data-order="asc" title="按发布时间正序（最早在前）">
              <i class="fas fa-sort-amount-up"></i> 发布时间
            </button>
          </div>
        </div>
      `;

      // 绑定按钮事件
      container.querySelectorAll('.post-sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const type = btn.dataset.type;
          const order = btn.dataset.order;
          sortPosts(type, order);
        });
      });

      return container;
    }

    // 更新按钮状态
    function updateButtonStates(type, order) {
      const buttons = document.querySelectorAll('.post-sort-btn');
      buttons.forEach(btn => {
        const btnType = btn.dataset.type;
        const btnOrder = btn.dataset.order;
        
        if (btnType === type && btnOrder === order) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // 保存排序偏好
    function saveSortPreference(type, order) {
      try {
        localStorage.setItem('postSortType', type);
        localStorage.setItem('postSortOrder', order);
      } catch (e) {
        // localStorage 可能不可用
      }
    }

    // 加载排序偏好
    function loadSortPreference() {
      try {
        const savedType = localStorage.getItem('postSortType');
        const savedOrder = localStorage.getItem('postSortOrder');
        
        if (savedType && savedOrder) {
          sortPosts(savedType, savedOrder);
          return;
        }
      } catch (e) {
        // localStorage 可能不可用
      }
      
      // 默认按更新时间倒序
      sortPosts('updated', 'desc');
    }

    // 初始化：加载排序偏好或使用默认值
    loadSortPreference();
  }

  // 启动
  onReady(initPostSort);
})();

