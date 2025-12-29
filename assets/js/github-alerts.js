/**
 * GitHub-style Markdown Alerts
 * 自动识别 [!NOTE] [!TIP] [!IMPORTANT] [!WARNING] [!CAUTION] 并添加样式类
 */
(function() {
  'use strict';

  document.addEventListener('DOMContentLoaded', function() {
    // 查找所有 blockquote
    const blockquotes = document.querySelectorAll('blockquote');
    
    blockquotes.forEach(function(bq) {
      const firstP = bq.querySelector('p:first-child');
      if (!firstP) return;
      
      const text = firstP.innerHTML;
      
      // 检测各种 alert 类型
      const alertTypes = [
        { pattern: /\[!NOTE\]/i, className: 'alert-note', label: 'NOTE' },
        { pattern: /\[!TIP\]/i, className: 'alert-tip', label: 'TIP' },
        { pattern: /\[!IMPORTANT\]/i, className: 'alert-important', label: 'IMPORTANT' },
        { pattern: /\[!WARNING\]/i, className: 'alert-warning', label: 'WARNING' },
        { pattern: /\[!CAUTION\]/i, className: 'alert-caution', label: 'CAUTION' }
      ];
      
      for (const alertType of alertTypes) {
        if (alertType.pattern.test(text)) {
          // 添加对应的类名
          bq.classList.add(alertType.className);
          
          // 移除 [!TYPE] 标记文字
          firstP.innerHTML = text.replace(alertType.pattern, '').trim();
          
          // 如果第一个段落为空或只剩下 <br>，移除它
          if (firstP.innerHTML.replace(/<br\s*\/?>/gi, '').trim() === '') {
            firstP.remove();
          }
          
          break; // 一个 blockquote 只能是一种类型
        }
      }
    });
  });
})();
