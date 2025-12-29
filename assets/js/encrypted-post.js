/**
 * Encrypted Post Password Protection Script
 * 粉白恋爱风格 - Q弹动画效果
 */

(function() {
  'use strict';

  // 正确密码（直接在页面中硬编码，因为前端加密只是简单保护）
  const CORRECT_PASSWORD = '180628';

  /**
   * 检查密码
   */
  window.checkPassword = function() {
    const input = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');
    const overlay = document.getElementById('password-overlay');
    const content = document.getElementById('protected-content');
    
    if (!input || !overlay || !content) {
      console.error('找不到必要的DOM元素');
      return;
    }
    
    const enteredPassword = input.value.trim();
    
    if (!enteredPassword) {
      showError('请输入密码哦～ 💕');
      shakeInput(input);
      return;
    }
    
    if (enteredPassword === CORRECT_PASSWORD) {
      // 密码正确！
      unlockContent(overlay, content);
      
      // 保存解锁状态到 sessionStorage
      try {
        sessionStorage.setItem('post_unlocked_' + window.location.pathname, 'true');
      } catch (e) {
        // sessionStorage 可能不可用
      }
    } else {
      // 密码错误
      showError('密码不对哦，再想想～ 🤔');
      input.value = '';
      input.focus();
      
      // 摇晃动画
      shakeInput(input);
      if (errorMessage) {
        errorMessage.classList.add('shake');
        setTimeout(() => {
          errorMessage.classList.remove('shake');
        }, 500);
      }
    }
  };

  /**
   * 显示错误消息
   */
  function showError(message) {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  /**
   * 输入框摇晃效果
   */
  function shakeInput(input) {
    input.style.animation = 'none';
    input.offsetHeight; // 触发 reflow
    input.style.animation = 'cuteShake 0.5s ease-in-out';
  }

  /**
   * 解锁内容
   */
  function unlockContent(overlay, content) {
    // 添加成功动画类
    overlay.classList.add('success');
    
    // 动画结束后隐藏遮罩层并显示内容
    setTimeout(() => {
      overlay.style.display = 'none';
      content.style.display = 'block';
      
      // 添加入场动画
      setTimeout(() => {
        content.classList.add('visible');
      }, 50);
    }, 600);
  }

  /**
   * 页面加载初始化
   */
  document.addEventListener('DOMContentLoaded', function() {
    const overlay = document.getElementById('password-overlay');
    const content = document.getElementById('protected-content');
    const input = document.getElementById('password-input');
    
    if (!overlay || !content) {
      return; // 不是加密文章
    }
    
    // 检查是否已在此会话中解锁
    try {
      const isUnlocked = sessionStorage.getItem('post_unlocked_' + window.location.pathname);
      if (isUnlocked === 'true') {
        overlay.style.display = 'none';
        content.style.display = 'block';
        content.classList.add('visible');
        return;
      }
    } catch (e) {
      // sessionStorage 可能不可用
    }
    
    // 聚焦密码输入框
    if (input) {
      // 稍微延迟聚焦，等待动画完成
      setTimeout(() => {
        input.focus();
      }, 800);
      
      // 支持 Enter 键提交
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.checkPassword();
        }
      });
    }
  });

})();
