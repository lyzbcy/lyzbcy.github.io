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
      }
    });
    
    // 规范化文章数据中的 URL
    postsData.forEach(post => {
      post.normalizedUrl = normalizeUrl(post.url);
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

