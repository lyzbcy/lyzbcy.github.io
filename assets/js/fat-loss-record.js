// 减脂记录页面专用脚本
// Fat Loss Record page specific script

// 存储碎碎念数据
const notesData = {
  '12月7日': `回想起4月份为了五一约会减脂20天，那次效果真的显著（朋友惊讶"unz怎么这么瘦了"）。

那时候天天晚上泡面（只加三分之一的油包）+2蛋,或者小馄饨+2蛋。

可惜当时没系统记录，这次要完整记下来！💪`,
  '12月8日': `锻炼的时候跟gemini打视频，挺好的！gemini帮我看看动作哪里要调整一下，下次可以带上支架拍📱

力量训练后做了半小时有氧，一边做一边把期末大作业plan好了，笑死😂 在跑步机上奋笔疾书

💡 心得总结：
• 力训之后最好还是先吃点再做有氧
• 主要是中碳日/低碳日的饭不太好买，可能得买食堂自选菜
• 而且我现在没有库存蛋白粉
• 买点香蕉带着吧，或者先去食堂买好饭带过去，练完先吃，吃完再有氧
• 下次锻炼可以带个支架让gemini看动作哪里不标准

🥚 今日趣事：
特别有意思啊！今天吃完发现怎么还差60g蛋白质的缺口，然后就煮了10个蛋。听着多，但是我最多吃三个蛋黄，一共其实也就5块钱~`,
  '12月9日': `哎我天呢 今天吃蛋吃得想吐 想到水煮蛋的味道就想吐😫

下午还是恶心 感觉可能是上午碳水吃太少导致的，马上去买了一杯双皮奶。

💡 心得总结：
• 鸡蛋有点吃伤了 得双十二购入蛋白粉了 没招了
• 晚餐买了33块钱 我不行了怎么比增肌餐还贵
• 这种即食荤菜性价比太低了 都不如买正常的快餐饭然后不吃饭呢(听着浪费但是性价比比这个高)
• 下次得搜鸡蛋的一百种吃法了 🥚`,
  '12月11日': `挖槽了 早饭就把今天碳水干爆了

没关系中午晚上可以去食堂吃 或者点减脂餐或者吃麻辣烫

相比上一次低碳日 这次好受多了
看来低碳日的碳水还是要尽量分配一些在上午
不然容易晕

💡 心得总结：
• 早餐碳水摄入过多，导致全天碳水超标143%
• 这次低碳日比上次舒服很多，感觉碳水分配在上午是对的
• ⚠️ 饮水只有73%，需要提醒自己多喝水
• 下次低碳日要更严格控制早餐的碳水量`,
  '12月13日': `力量明显下降😤
杠铃卧推以前50kg的压力现在跟40kg的压力感受差不多

虽然今天没做有氧 但是打着伞骑车来回健身房5km 这个风阻累得我🚴‍♂️
而且今天还考试来着 消耗挺大

早饭吃得热量太少了
晚饭缺口比较大 所以多点了一些
晚饭拌饭酱只加了一半
但是没想到拌饭油这么多 加一半酱还是超了`
};

// 从碎碎念内容中提取心得总结
function extractSummaries() {
  var summaries = [];
  
  Object.keys(notesData).forEach(function(date) {
    var content = notesData[date];
    // 提取"💡 心得总结："部分
    var regex = /💡\s*心得总结[：:]([\s\S]*?)(?=\n\n|$)/;
    var match = content.match(regex);
    if (match && match[1].trim()) {
      summaries.push({
        date: date,
        content: match[1].trim()
      });
    }
  });
  
  return summaries;
}

// 生成小贴纸HTML
function generateStickyNotes() {
  var container = document.getElementById('sticky-notes-container');
  var summaries = extractSummaries();
  
  if (summaries.length === 0) {
    container.innerHTML = '<div class="no-summaries">📭 还没有记录心得总结哦~<br>在每日碎碎念中添加"💡 心得总结："就会自动出现在这里！</div>';
    return;
  }
  
  container.innerHTML = summaries.map(function(summary) {
    return '<div class="sticky-note"><div class="sticky-date">📅 ' + summary.date + '</div><div class="sticky-content">' + summary.content + '</div></div>';
  }).join('');
}

// 打开心得总结板
window.openSummaryBoard = function() {
  generateStickyNotes();
  var modal = document.getElementById('summary-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

// 关闭心得总结板
window.closeSummaryBoard = function() {
  var modal = document.getElementById('summary-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
};

// 点击背景关闭
window.closeSummaryOnBackdrop = function(event) {
  if (event.target.classList.contains('summary-modal')) {
    window.closeSummaryBoard();
  }
};

// 页面加载时填充碎碎念内容
document.addEventListener('DOMContentLoaded', function() {
  Object.keys(notesData).forEach(function(date) {
    var dateMatch = date.match(/(\d+)月(\d+)日/);
    if (dateMatch) {
      var month = dateMatch[1].padStart(2, '0');
      var day = dateMatch[2].padStart(2, '0');
      var noteId = 'note-' + month + day;
      var noteContent = document.querySelector('#' + noteId + ' .note-content');
      if (noteContent) {
        noteContent.textContent = notesData[date];
      }
    }
  });
});

window.openNote = function(noteId) {
  var modal = document.getElementById(noteId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeNote = function(noteId) {
  var modal = document.getElementById(noteId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
};

window.closeNoteOnBackdrop = function(event, noteId) {
  if (event.target.classList.contains('note-modal')) {
    window.closeNote(noteId);
  }
};

// ESC键关闭
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.note-modal.active').forEach(function(modal) {
      modal.classList.remove('active');
      document.body.style.overflow = 'auto';
    });
    if (window.closeLightbox) window.closeLightbox();
    if (window.closeSummaryBoard) window.closeSummaryBoard();
  }
});

// 图片Lightbox功能
window.openLightbox = function(imageSrc, imageTitle, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  
  var lightbox = document.getElementById('image-lightbox');
  
  if (!lightbox) {
    lightbox = document.createElement('div');
    lightbox.id = 'image-lightbox';
    lightbox.className = 'image-lightbox';
    lightbox.innerHTML = '<div class="lightbox-content"><button class="lightbox-close" onclick="closeLightbox()">✕</button><img loading="lazy" class="lightbox-image" src="" alt=""><div class="lightbox-title"></div></div>';
    document.body.appendChild(lightbox);
    
    lightbox.addEventListener('click', function(e) {
      if (e.target === lightbox) {
        window.closeLightbox();
      }
    });
  }
  
  var img = lightbox.querySelector('.lightbox-image');
  var title = lightbox.querySelector('.lightbox-title');
  img.src = imageSrc;
  img.alt = imageTitle || '';
  title.textContent = imageTitle || '';
  
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeLightbox = function() {
  var lightbox = document.getElementById('image-lightbox');
  if (lightbox) {
    lightbox.classList.remove('active');
    document.body.style.overflow = 'auto';
  }
};
