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
      this.overlay.innerHTML = '<div id="article-viewer-window">' +
        '<div id="article-viewer-header">' +
        '<div id="article-viewer-info">' +
        '<span id="article-viewer-title"></span>' +
        '<span id="article-viewer-meta">' +
        '<span id="article-viewer-category"></span>' +
        '<span id="article-viewer-date"></span>' +
        '</span></div>' +
        '<div id="article-viewer-actions">' +
        '<button id="article-viewer-external" title="在新标签页打开">↗</button>' +
        '<button id="article-viewer-close" title="关闭">✕</button>' +
        '</div></div>' +
        '<div id="article-viewer-body">' +
        '<iframe id="article-viewer-iframe" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"></iframe>' +
        '</div></div>';
      document.body.appendChild(this.overlay);
    }

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

    this.isOpen = false;
    this.overlay.classList.remove('visible');

    setTimeout(() => {
      this.iframe.src = 'about:blank';
    }, 400);

    window.dispatchEvent(new CustomEvent('article-viewer:close'));

    if (this._resolveClose) {
      this._resolveClose();
      this._resolveClose = null;
    }
  }

  static injectStyles() {
    if (document.getElementById('article-viewer-styles')) return;

    const style = document.createElement('style');
    style.id = 'article-viewer-styles';
    style.textContent = [
      '#article-viewer-overlay {',
      'position: fixed; inset: 0; z-index: 60;',
      'display: none; align-items: center; justify-content: center;',
      'background: rgba(2, 5, 10, 0.72);',
      'backdrop-filter: blur(14px);',
      'transition: opacity 0.35s ease; opacity: 0;',
      '}',
      '#article-viewer-overlay.visible { display: flex; opacity: 1; }',
      '#article-viewer-window {',
      'position: relative;',
      'width: min(92vw, 960px);',
      'height: min(88vh, 700px);',
      'background: linear-gradient(180deg, rgba(11, 21, 36, 0.98), rgba(6, 13, 22, 0.98));',
      'border: 1px solid rgba(132, 215, 255, 0.16);',
      'border-radius: 20px;',
      'display: flex; flex-direction: column;',
      'overflow: hidden;',
      'box-shadow: 0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(132,215,255,0.06) inset;',
      '}',
      '#article-viewer-header {',
      'display: flex; align-items: center; justify-content: space-between;',
      'padding: 14px 20px;',
      'border-bottom: 1px solid rgba(132, 215, 255, 0.1);',
      'background: rgba(7, 15, 28, 0.6);',
      'backdrop-filter: blur(8px);',
      'flex-shrink: 0;',
      '}',
      '#article-viewer-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; }',
      '#article-viewer-title {',
      'font-size: 1.1rem; font-weight: 600; color: #edf4f8;',
      'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;',
      'max-width: 60vw;',
      '}',
      '#article-viewer-meta {',
      'display: flex; gap: 12px; font-size: 0.78rem;',
      'color: rgba(237, 244, 248, 0.48); letter-spacing: 0.06em;',
      '}',
      '#article-viewer-actions { display: flex; gap: 8px; flex-shrink: 0; }',
      '#article-viewer-actions button {',
      'width: 34px; height: 34px; border-radius: 10px;',
      'border: 1px solid rgba(132, 215, 255, 0.16);',
      'background: rgba(255,255,255,0.04);',
      'color: rgba(237, 244, 248, 0.72);',
      'cursor: pointer; font-size: 1rem;',
      'display: flex; align-items: center; justify-content: center;',
      'transition: background 0.2s, color 0.2s, border-color 0.2s;',
      '}',
      '#article-viewer-actions button:hover {',
      'background: rgba(132, 215, 255, 0.1);',
      'color: #edf4f8;',
      'border-color: rgba(132, 215, 255, 0.3);',
      '}',
      '#article-viewer-body { flex: 1; overflow: hidden; background: #0a1118; }',
      '#article-viewer-iframe {',
      'width: 100%; height: 100%; border: none;',
      'background: #fff;',
      '}',
      '@media (max-width: 640px) {',
      '#article-viewer-window {',
      'width: 100vw; height: 100vh; max-height: 100vh;',
      'border-radius: 0;',
      '}',
      '#article-viewer-header { padding: 10px 14px; }',
      '#article-viewer-title { font-size: 0.95rem; max-width: 45vw; }',
      '}'
    ].join('\n');
    document.head.appendChild(style);
  }
}
