/**
 * Encrypted Post Password Protection Script
 * 粉白恋爱风格 - Q弹动画效果
 * 
 * 工作原理：密码遮罩层（position: fixed）盖在预渲染的内容上方
 * 输入正确密码后，遮罩层淡出消失，内容自然可见
 */

(function() {
  'use strict';

  /**
   * 检查密码
   */
  window.checkPassword = function() {
    var correctPassword = window.CORRECT_PASSWORD || '180628';

    var input = document.getElementById('password-input');
    var errorMessage = document.getElementById('error-message');
    var overlay = document.getElementById('password-overlay');
    
    if (!input || !overlay) {
      console.error('找不到必要的DOM元素');
      return;
    }
    
    var enteredPassword = input.value.trim();
    
    if (!enteredPassword) {
      showError('请输入密码哦～ 💕');
      shakeInput(input);
      return;
    }
    
    if (enteredPassword === correctPassword) {
      // 密码正确！隐藏遮罩层
      unlockContent(overlay);
      
      // 保存解锁状态到 sessionStorage
      try {
        sessionStorage.setItem('post_unlocked_' + window.location.pathname, 'true');
      } catch (e) {}
    } else {
      // 密码错误
      showError('密码不对哦，再想想～ 🤔');
      input.value = '';
      input.focus();
      
      shakeInput(input);
      if (errorMessage) {
        errorMessage.classList.add('shake');
        setTimeout(function() {
          errorMessage.classList.remove('shake');
        }, 500);
      }
    }
  };

  /**
   * 显示错误消息
   */
  function showError(message) {
    var errorMessage = document.getElementById('error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  /**
   * 输入框摇晃效果
   */
  function shakeInput(input) {
    input.style.animation = 'none';
    input.offsetHeight;
    input.style.animation = 'cuteShake 0.5s ease-in-out';
  }

  /**
   * 解锁内容 - 仅隐藏遮罩层（内容已预渲染在下方）
   */
  function unlockContent(overlay) {
    overlay.classList.add('success');
    
    setTimeout(function() {
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      
      // 兼容旧模式：如果 protected-content 被隐藏，显示它
      var content = document.getElementById('protected-content');
      if (content) {
        content.style.display = 'block';
        setTimeout(function() {
          content.classList.add('visible');
        }, 50);
      }
    }, 600);
  }

  /**
   * 页面加载初始化
   */
  document.addEventListener('DOMContentLoaded', function() {
    var overlay = document.getElementById('password-overlay');
    var input = document.getElementById('password-input');
    
    if (!overlay) return;
    
    // 遮罩层激活时禁止滚动，防止用户滚动看到内容
    document.body.style.overflow = 'hidden';
    
    // 检查是否已在此会话中解锁
    try {
      var isUnlocked = sessionStorage.getItem('post_unlocked_' + window.location.pathname);
      if (isUnlocked === 'true') {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
        // 兼容旧模式
        var content = document.getElementById('protected-content');
        if (content) {
          content.style.display = 'block';
          content.classList.add('visible');
        }
        return;
      }
    } catch (e) {}
    
    // 聚焦密码输入框
    if (input) {
      setTimeout(function() {
        input.focus();
      }, 800);
      
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.checkPassword();
        }
      });
    }
  });

})();
