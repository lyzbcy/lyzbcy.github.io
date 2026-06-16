/**
 * ArticleViewer - 世界内文章阅读窗口
 * 通过 iframe 加载原 Jekyll/Chirpy 页面，在世界中央弹出阅读窗口
 * 打开时暂停玩家移动和交互，关闭后恢复
 */
export class ArticleViewer {
  constructor() {
    this.isOpen = false;
    this.overlay = null;
    this.iframe = null;
    this.titleEl = null;
    this.categoryEl = null;
    this.dateEl = null;
    this.closeBtn = null;
    this.openExternalBtn = null;
    this._currentUrl = null;
    this._resolveClose = null;

    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    this.overlay = document.getElementById('article-viewer-overlay');

    if (!this.overlay) {
      this.overlay = document.createElement('div');
      this.overlay.id = 'article-viewer-overlay';
      // Storybook layout: left title page + right content page with a center spine
      this.overlay.innerHTML =
        '<div id="article-viewer-book">' +
          '<div class="book-page book-page-left">' +
            '<div class="book-ornament">✦</div>' +
            '<div id="article-viewer-title" class="book-title"></div>' +
            '<div id="article-viewer-meta" class="book-meta">' +
              '<span id="article-viewer-category" class="book-category"></span>' +
              '<span id="article-viewer-date" class="book-date"></span>' +
            '</div>' +
            '<div class="book-ornament book-ornament-bottom">❦</div>' +
          '</div>' +
          '<div class="book-page book-page-right">' +
            '<div id="article-viewer-body">' +
              '<iframe id="article-viewer-iframe" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"></iframe>' +
            '</div>' +
          '</div>' +
          '<div id="article-viewer-actions">' +
            '<button id="article-viewer-external" title="在新标签页打开">↗</button>' +
            '<button id="article-viewer-close" title="关闭">✕</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(this.overlay);
    }

    this.book = document.getElementById('article-viewer-book');
    this.iframe = document.getElementById('article-viewer-iframe');
    this.titleEl = document.getElementById('article-viewer-title');
    this.categoryEl = document.getElementById('article-viewer-category');
    this.dateEl = document.getElementById('article-viewer-date');
    this.closeBtn = document.getElementById('article-viewer-close');
    this.openExternalBtn = document.getElementById('article-viewer-external');
  }

  _bindEvents() {
    this.closeBtn.addEventListener('click', () => this.close());
    this.openExternalBtn.addEventListener('click', () => {
      if (this._currentUrl) {
        window.open(this._currentUrl, '_blank', 'noopener');
      }
    });

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  open(post) {
    if (this.isOpen) {
      this._loadArticle(post);
      return;
    }

    this.isOpen = true;
    this._loadArticle(post);

    this.overlay.classList.add('visible');
    // Restart the book-open animation each time
    this.book.classList.remove('open', 'closing');
    void this.book.offsetWidth; // force reflow
    this.book.classList.add('open');

    window.dispatchEvent(new CustomEvent('article-viewer:open'));

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }

    return new Promise((resolve) => {
      this._resolveClose = resolve;
    });
  }

  _loadArticle(post) {
    this._currentUrl = post.url || '#';
    this.titleEl.textContent = post.title || '文章';
    this.categoryEl.textContent = post.category || '';
    this.dateEl.textContent = post.date || '';
    this.iframe.title = post.title || '文章';
    this.iframe.src = this._currentUrl;
  }

  close() {
    if (!this.isOpen) return;

    // Play a quick closing animation before hiding
    this.book.classList.remove('open');
    this.book.classList.add('closing');

    const finish = () => {
      this.isOpen = false;
      this.overlay.classList.remove('visible');
      this.book.classList.remove('closing');
      setTimeout(() => {
        this.iframe.src = 'about:blank';
      }, 300);
      window.dispatchEvent(new CustomEvent('article-viewer:close'));
      if (this._resolveClose) {
        this._resolveClose();
        this._resolveClose = null;
      }
    };

    setTimeout(finish, 360);
  }

  static injectStyles() {
    if (document.getElementById('article-viewer-styles')) return;

    const style = document.createElement('style');
    style.id = 'article-viewer-styles';
    style.textContent = `
      #article-viewer-overlay {
        position: fixed; inset: 0; z-index: 60;
        display: none; align-items: center; justify-content: center;
        background: rgba(30, 20, 10, 0.45);
        backdrop-filter: blur(8px);
        transition: opacity 0.4s ease;
        opacity: 0;
        perspective: 2200px;
      }
      #article-viewer-overlay.visible { display: flex; opacity: 1; }

      #article-viewer-book {
        position: relative;
        width: min(94vw, 1080px);
        height: min(88vh, 760px);
        display: flex;
        border-radius: 6px 14px 14px 6px;
        box-shadow: 0 30px 80px rgba(40,25,10,0.45), 0 8px 24px rgba(0,0,0,0.25);
        transform-style: preserve-3d;
        transform: rotateY(-88deg) scaleX(0.04);
        opacity: 0;
        transform-origin: left center;
        transition: transform 0.55s cubic-bezier(.2,.9,.25,1), opacity 0.35s ease;
      }
      #article-viewer-book.open { transform: rotateY(0deg) scaleX(1); opacity: 1; }
      #article-viewer-book.closing {
        transform: rotateY(88deg) scaleX(0.04); opacity: 0;
        transition: transform 0.36s cubic-bezier(.6,0,.4,1), opacity 0.3s ease;
      }

      .book-page {
        position: relative;
        background: linear-gradient(180deg, #fbf3df 0%, #f5ead0 100%);
        overflow: hidden;
      }
      .book-page-right { flex: 1; border-radius: 0 14px 14px 0; }
      .book-page-left {
        width: 240px; flex-shrink: 0; border-radius: 6px 0 0 14px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 28px 18px;
        text-align: center;
      }
      .book-ornament { font-size: 1.3rem; color: rgba(180,130,60,0.55); line-height: 1; }
      .book-ornament-bottom { margin-top: auto; }
      .book-title {
        font-family: 'Georgia', 'Microsoft YaHei', serif;
        font-size: 1.25rem; font-weight: 700; color: #5a3a1a;
        line-height: 1.55; margin: 22px 0 14px; letter-spacing: 0.02em;
      }
      .book-meta { display: flex; flex-direction: column; gap: 8px; font-size: 0.82rem; }
      .book-category {
        display: inline-block; padding: 4px 12px; border-radius: 999px;
        background: rgba(200,140,60,0.18); color: #8a5a24;
        border: 1px solid rgba(200,140,60,0.3); font-weight: 600; letter-spacing: 0.04em;
      }
      .book-date { color: rgba(120,80,30,0.7); letter-spacing: 0.06em; }
      #article-viewer-body { position: absolute; inset: 22px 18px 18px 30px; }
      #article-viewer-iframe { width: 100%; height: 100%; border: none; background: #fff; border-radius: 4px; }

      #article-viewer-actions { position: absolute; top: 14px; right: 16px; display: flex; gap: 8px; z-index: 10; }
      #article-viewer-actions button {
        width: 36px; height: 36px; border-radius: 50%;
        border: 1px solid rgba(180,130,60,0.4);
        background: rgba(251,243,223,0.92); color: #8a5a24;
        cursor: pointer; font-size: 1rem; font-weight: 600;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.2s, background 0.2s, box-shadow 0.2s;
        box-shadow: 0 2px 8px rgba(120,80,30,0.18);
      }
      #article-viewer-actions button:hover {
        background: #fff; transform: scale(1.08);
        box-shadow: 0 4px 14px rgba(120,80,30,0.28);
      }

      @media (max-width: 720px) {
        #article-viewer-book {
          width: 100vw; height: 100vh; border-radius: 0;
          transform: rotateY(0deg) scaleX(1) translateY(40px); opacity: 0;
        }
        #article-viewer-book.open { transform: rotateY(0deg) scaleX(1) translateY(0); opacity: 1; }
        #article-viewer-book.closing { transform: rotateY(0deg) scaleX(1) translateY(40px); opacity: 0; }
        .book-page-left { display: none; }
        .book-page-right { border-radius: 0; box-shadow: none; }
        #article-viewer-body { inset: 56px 12px 12px 12px; }
      }
    `;
    document.head.appendChild(style);
  }
}
