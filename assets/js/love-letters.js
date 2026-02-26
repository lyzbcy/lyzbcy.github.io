/**
 * 给星星布丁的100封情书 - 交互逻辑与音频播放器
 */

// 存放从页面中读取的情书数据
let loveLettersData = [];

// 存放当前的音频实例
let currentAudio = null;
let isPlaying = false;

/**
 * 页面加载后初始化
 */
document.addEventListener("DOMContentLoaded", function() {
  const container = document.getElementById("love-letters-container");
  if (!container) return;

  loveLettersData = loadLettersFromDOM();
  renderLetterCards(container);
  initFloatingHearts(container);
  createModalHTML();

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeModal();
  });
});

/**
 * 从页面隐藏的数据容器中读取情书
 */
function loadLettersFromDOM() {
  var dataContainer = document.getElementById('love-letters-data');
  if (!dataContainer) return [];

  var articles = dataContainer.querySelectorAll('.letter-item');
  var letters = [];

  for (var i = 0; i < articles.length; i++) {
    var article = articles[i];
    var audioUrl = article.getAttribute('data-audio') || '';
    letters.push({
      id: i + 1,
      title: article.getAttribute('data-title') || '第 ' + (i + 1) + ' 封信',
      date: article.getAttribute('data-date') || '',
      hasAudio: audioUrl.trim() !== '',
      audioUrl: audioUrl.trim() || null,
      contentHTML: article.innerHTML
    });
  }

  return letters;
}

/**
 * 渲染情书卡片网格
 */
function renderLetterCards(container) {
  var grid = document.createElement('div');
  grid.className = 'love-letters-grid';

  for (var i = 0; i < loveLettersData.length; i++) {
    (function(letter, index) {
      var card = document.createElement('div');
      card.className = 'envelope-card';
      card.style.animationDelay = (index * 0.15) + 's';

      var badgeHTML = letter.hasAudio ? '<div class="has-audio-badge">🎵</div>' : '';

      card.innerHTML =
        badgeHTML +
        '<div class="envelope-seal">❤</div>' +
        '<div class="envelope-content">' +
          '<h3 class="envelope-title">' + letter.title + '</h3>' +
          '<span class="envelope-date">' + letter.date + '</span>' +
        '</div>';

      card.addEventListener('click', function() { openLetterModal(letter); });
      grid.appendChild(card);
    })(loveLettersData[i], i);
  }

  container.appendChild(grid);
}

/**
 * 浪漫的飘落爱心背景效果
 */
function initFloatingHearts(container) {
  var headerDiv = container.previousElementSibling;
  if (!headerDiv || !headerDiv.classList.contains('love-letters-header')) return;

  setInterval(function() {
    var heart = document.createElement('div');
    heart.className = 'floating-heart';
    var emojis = ['💕', '💗', '💓', '✨', '🌸'];
    heart.innerHTML = emojis[Math.floor(Math.random() * emojis.length)];
    heart.style.left = Math.random() * 100 + '%';
    heart.style.fontSize = (0.8 + Math.random() * 0.8) + 'rem';
    heart.style.animationDuration = (3 + Math.random() * 3) + 's';

    headerDiv.appendChild(heart);

    setTimeout(function() { heart.remove(); }, 6000);
  }, 800);
}

/**
 * 创建弹窗骨架
 */
function createModalHTML() {
  var modalHTML =
    '<div class="letter-modal-overlay" id="letterModalOverlay">' +
      '<div class="letter-modal-container">' +
        '<button class="modal-close-btn" id="modalCloseBtn" aria-label="关闭">&times;</button>' +
        '<div class="modal-header">' +
          '<h2 class="modal-title" id="modalTitle"></h2>' +
          '<div class="modal-date" id="modalDate"></div>' +
        '</div>' +
        '<div class="modal-content-scroll" id="modalScrollArea">' +
          '<div class="audio-player-wrapper" id="modalAudioPlayer" style="display: none;">' +
            '<button class="play-pause-btn" id="audioPlayBtn">▶</button>' +
            '<div class="audio-controls">' +
              '<div class="progress-container" id="audioProgressContainer">' +
                '<div class="progress-bar" id="audioProgressBar"></div>' +
              '</div>' +
              '<div class="time-display">' +
                '<span id="audioCurrentTime">00:00</span>' +
                '<span id="audioDuration">00:00</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="letter-text" id="modalContent"></div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('letterModalOverlay').addEventListener('click', function(e) {
    if (e.target.id === 'letterModalOverlay') closeModal();
  });
}

/**
 * 打开情书弹窗
 */
function openLetterModal(letter) {
  var overlay = document.getElementById('letterModalOverlay');
  document.getElementById('modalTitle').textContent = letter.title;
  document.getElementById('modalDate').textContent = letter.date;
  document.getElementById('modalContent').innerHTML = letter.contentHTML;

  document.getElementById('modalScrollArea').scrollTop = 0;

  var audioPlayerWrapper = document.getElementById('modalAudioPlayer');
  if (letter.hasAudio && letter.audioUrl) {
    audioPlayerWrapper.style.display = 'flex';
    setupAudioPlayer(letter.audioUrl);
  } else {
    audioPlayerWrapper.style.display = 'none';
    destroyAudio();
  }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/**
 * 关闭弹窗
 */
function closeModal() {
  var overlay = document.getElementById('letterModalOverlay');
  if (!overlay) return;
  overlay.classList.remove('active');
  document.body.style.overflow = '';
  destroyAudio();
}

/**
 * 音频播放器
 */
function setupAudioPlayer(src) {
  destroyAudio();

  currentAudio = new Audio(src);
  currentAudio.preload = "metadata";

  var playBtn = document.getElementById('audioPlayBtn');
  var progressBar = document.getElementById('audioProgressBar');
  var progressContainer = document.getElementById('audioProgressContainer');
  var currentTimeEl = document.getElementById('audioCurrentTime');
  var durationEl = document.getElementById('audioDuration');

  playBtn.innerHTML = '▶';
  playBtn.classList.remove('playing');
  progressBar.style.width = '0%';
  currentTimeEl.textContent = '00:00';
  durationEl.textContent = '加载中...';

  currentAudio.addEventListener('loadedmetadata', function() {
    durationEl.textContent = formatTime(currentAudio.duration);
  });

  currentAudio.addEventListener('timeupdate', function() {
    if (!currentAudio || !currentAudio.duration) return;
    var pct = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressBar.style.width = pct + '%';
    currentTimeEl.textContent = formatTime(currentAudio.currentTime);
  });

  currentAudio.addEventListener('ended', function() {
    isPlaying = false;
    playBtn.innerHTML = '▶';
    playBtn.classList.remove('playing');
    progressBar.style.width = '100%';
    currentTimeEl.textContent = formatTime(currentAudio.duration);
  });

  playBtn.onclick = function() {
    if (isPlaying) {
      currentAudio.pause();
      playBtn.innerHTML = '▶';
      playBtn.classList.remove('playing');
    } else {
      currentAudio.play().catch(function(e) { console.error("音频播放失败:", e); });
      playBtn.innerHTML = '⏸';
      playBtn.classList.add('playing');
    }
    isPlaying = !isPlaying;
  };

  progressContainer.onclick = function(e) {
    if (!currentAudio || !currentAudio.duration) return;
    var rect = progressContainer.getBoundingClientRect();
    var clickX = e.clientX - rect.left;
    currentAudio.currentTime = (clickX / rect.width) * currentAudio.duration;
  };
}

/**
 * 销毁音频
 */
function destroyAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio.removeAttribute('src');
    currentAudio.load();
    currentAudio = null;
  }
  isPlaying = false;
  var playBtn = document.getElementById('audioPlayBtn');
  if (playBtn) {
    playBtn.innerHTML = '▶';
    playBtn.classList.remove('playing');
  }
}

/**
 * 格式化时间 00:00
 */
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

/**
 * 图片灯箱 - 点击图片后在页面内弹出放大查看
 */
window.openPhotoLightbox = function(src, alt) {
  // 防止重复创建
  var existing = document.getElementById('photoLightbox');
  if (existing) existing.remove();

  var lb = document.createElement('div');
  lb.id = 'photoLightbox';
  lb.style.cssText = [
    'position:fixed',
    'top:0', 'left:0',
    'width:100vw', 'height:100vh',
    'background:rgba(0,0,0,0.85)',
    'z-index:999999',
    'display:flex',
    'justify-content:center',
    'align-items:center',
    'cursor:zoom-out',
    'opacity:0',
    'transition:opacity 0.3s ease',
    '-webkit-tap-highlight-color:transparent'
  ].join(';');

  var img = document.createElement('img');
  img.src = src;
  img.alt = alt || '';
  img.style.cssText = [
    'max-width:92vw',
    'max-height:88vh',
    'object-fit:contain',
    'border-radius:10px',
    'box-shadow:0 20px 60px rgba(0,0,0,0.6)',
    'transform:scale(0.92)',
    'transition:transform 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
    'pointer-events:none'
  ].join(';');

  // 关闭提示
  var hint = document.createElement('div');
  hint.textContent = '点击任意处关闭';
  hint.style.cssText = [
    'position:absolute',
    'bottom:20px',
    'left:50%',
    'transform:translateX(-50%)',
    'color:rgba(255,255,255,0.5)',
    'font-size:0.8rem',
    'pointer-events:none'
  ].join(';');

  lb.appendChild(img);
  lb.appendChild(hint);
  document.body.appendChild(lb);

  // 入场动画
  requestAnimationFrame(function() {
    lb.style.opacity = '1';
    img.style.transform = 'scale(1)';
  });

  // 点击关闭
  lb.addEventListener('click', function() {
    lb.style.opacity = '0';
    img.style.transform = 'scale(0.92)';
    setTimeout(function() { lb.remove(); }, 300);
  });

  // ESC 关闭
  function onKeyDown(e) {
    if (e.key === 'Escape') {
      lb.click();
      document.removeEventListener('keydown', onKeyDown);
    }
  }
  document.addEventListener('keydown', onKeyDown);
};
