// 成长思维导图交互脚本
document.addEventListener('DOMContentLoaded', function() {
  initGrowthMindmap();
});

function initGrowthMindmap() {
  const habitCards = document.querySelectorAll('.habit-card');
  
  habitCards.forEach(card => {
    card.addEventListener('click', function() {
      // 切换当前卡片的展开状态
      this.classList.toggle('expanded');
    });
  });
}

// 如果页面是动态加载的（如 Jekyll），也支持手动初始化
window.initGrowthMindmap = initGrowthMindmap;
