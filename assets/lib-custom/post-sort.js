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
    const initialCards = Array.from(postList.querySelectorAll('.card-wrapper'));
    console.log('找到', initialCards.length, '个文章卡片');
    const allCardElements = new Set(initialCards);
    
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

    const postsPerPageAttr = parseInt(dataScript.dataset.postsPerPage, 10);
    const postsPerPage = Number.isFinite(postsPerPageAttr) ? postsPerPageAttr : 10;
    const siteBaseUrl = (dataScript.dataset.baseurl || '').replace(/\/$/, '');

    function withBase(path) {
      if (!siteBaseUrl) {
        return path;
      }

      if (path === '/') {
        return `${siteBaseUrl}/`;
      }

      return `${siteBaseUrl}${path}`;
    }

    const postsByUrlMap = new Map();

    // 规范化文章数据中的 URL
    postsData.forEach((post, index) => {
      post.normalizedUrl = normalizeUrl(post.url);
      post.originalIndex = index;
      post.pageNumber = Math.floor(index / postsPerPage) + 1;
      postsByUrlMap.set(post.url, post);
      postsByUrlMap.set(post.normalizedUrl, post);
    });
    
    // 创建文章卡片到文章数据的映射
    const cardToPostDataMap = new Map();
    
    function registerCardElement(card) {
      if (!card || !(card instanceof HTMLElement)) {
        return;
      }

      const link = card.querySelector('a.post-preview');
      if (!link) {
        return;
      }

      const href = link.getAttribute('href') || link.href;
      if (!href) {
        return;
      }

      const url = new URL(href, window.location.origin).pathname;
      const normalizedUrl = normalizeUrl(url);

      if (!postMap.has(normalizedUrl)) {
        postMap.set(normalizedUrl, card);
      }
      if (!postMap.has(url)) {
        postMap.set(url, card);
      }

      allCardElements.add(card);

      const postData = postsByUrlMap.get(normalizedUrl) || postsByUrlMap.get(url);
      if (postData) {
        cardToPostDataMap.set(card, postData);
        addUpdateTimeDisplay(card, postData);
      }
    }

    initialCards.forEach(registerCardElement);

    // 获取当前页码
    function getCurrentPage() {
      const path = window.location.pathname;
      // Jekyll 分页格式：/page2/, /page3/ 等
      const match = path.match(/\/page(\d+)\//);
      if (match) {
        return parseInt(match[1], 10);
      }
      // 首页是第 1 页
      return 1;
    }

    // 需要异步加载的分页缓存
    const pageFetchCache = new Map();

    async function loadPageCards(pageNumber) {
      if (!Number.isFinite(pageNumber) || pageNumber < 1) {
        return;
      }

      if (pageNumber === getCurrentPage()) {
        return;
      }

      if (pageFetchCache.has(pageNumber)) {
        return pageFetchCache.get(pageNumber);
      }

      const pageUrl = pageNumber === 1 ? '/' : `/page${pageNumber}/`;
      const fetchPromise = fetch(withBase(pageUrl), { credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) {
            throw new Error(`无法加载第 ${pageNumber} 页内容，状态码：${response.status}`);
          }
          return response.text();
        })
        .then(html => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const cards = doc.querySelectorAll('#post-list .card-wrapper');
          cards.forEach(card => {
            const importedCard = document.importNode(card, true);
            importedCard.style.display = 'none';
            registerCardElement(importedCard);
          });
        })
        .catch(error => {
          console.error(`加载第 ${pageNumber} 页文章失败：`, error);
        });

      pageFetchCache.set(pageNumber, fetchPromise);
      return fetchPromise;
    }

    async function ensureCardsAvailable(posts) {
      if (!posts || posts.length === 0) {
        return;
      }

      const missingPosts = posts.filter(post => !(postMap.has(post.url) || postMap.has(post.normalizedUrl)));
      if (missingPosts.length === 0) {
        return;
      }

      const pagesToFetch = new Set();
      missingPosts.forEach(post => {
        if (post.pageNumber) {
          pagesToFetch.add(post.pageNumber);
        }
      });

      for (const pageNumber of pagesToFetch) {
        await loadPageCards(pageNumber);
      }
    }

    // 当前排序状态
    let currentSortType = 'updated'; // 'updated' 或 'date'
    let currentSortOrder = 'desc'; // 'asc' 或 'desc'

    // 排序函数
    async function sortPosts(type, order) {
      currentSortType = type;
      currentSortOrder = order;

      // 获取当前页码
      const currentPage = getCurrentPage();

      // 对所有文章进行排序（不仅仅是当前页的）
      const sortedPosts = postsData.slice().sort((a, b) => {
        const aTime = type === 'updated' ? a.last_modified_ts : a.date_ts;
        const bTime = type === 'updated' ? b.last_modified_ts : b.date_ts;
        
        if (order === 'asc') {
          return aTime - bTime;
        } else {
          return bTime - aTime;
        }
      });

      // 计算当前页应该显示的文章范围（基于全局排序）
      const startIndex = (currentPage - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const postsForCurrentPage = sortedPosts.slice(startIndex, endIndex);

      await ensureCardsAvailable(postsForCurrentPage);

      // 重新排列 DOM 元素，只显示当前页应该显示的文章
      const visibleCards = [];
      postsForCurrentPage.forEach(post => {
        const card = postMap.get(post.url) || postMap.get(post.normalizedUrl);
        if (!card) {
          return;
        }

        const postData = postsByUrlMap.get(post.normalizedUrl) || postsByUrlMap.get(post.url) || post;
        if (postData) {
          cardToPostDataMap.set(card, postData);
          if (!card.querySelector('.post-update-time')) {
            addUpdateTimeDisplay(card, postData);
          }
        }

        visibleCards.push(card);
      });

      // 将当前页的文章按排序顺序添加到 DOM
      visibleCards.forEach(card => {
        postList.appendChild(card);
        card.style.display = '';
      });

      // 隐藏不在当前页的文章（如果它们存在于 DOM 中）
      const visibleSet = new Set(visibleCards);
      allCardElements.forEach(card => {
        if (card.isConnected && !visibleSet.has(card)) {
          card.style.display = 'none';
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
          const result = sortPosts(type, order);
          if (result && typeof result.then === 'function') {
            result.catch(err => console.error('排序失败：', err));
          }
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
    async function loadSortPreference() {
      try {
        const savedType = localStorage.getItem('postSortType');
        const savedOrder = localStorage.getItem('postSortOrder');
        
        if (savedType && savedOrder) {
          await sortPosts(savedType, savedOrder);
          return;
        }
      } catch (e) {
        // localStorage 可能不可用
      }
      
      // 默认按更新时间倒序
      await sortPosts('updated', 'desc');
    }

    // 初始化：加载排序偏好或使用默认值
    loadSortPreference().catch(err => {
      console.error('初始化排序偏好失败：', err);
    });
  }

  // 启动
  onReady(initPostSort);
})();

