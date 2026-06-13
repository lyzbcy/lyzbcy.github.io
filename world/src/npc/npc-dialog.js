/**
 * NPC Dialog UI System
 * Handles showing/hiding the dialog overlay when interacting with NPCs and screens
 */
export class NPCDialog {
  constructor() {
    this.overlay = document.getElementById('dialog-overlay');
    this.titleEl = document.getElementById('dialog-title');
    this.articlesEl = document.getElementById('dialog-articles');
    this.closeBtn = document.getElementById('dialog-close');
    this.isOpen = false;

    this.closeBtn.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.hide();
    });
  }

  /**
   * Show dialog for an NPC or screen interaction
   * @param {Object} data - { type, name/label, greeting?, posts }
   */
  show(data) {
    this.isOpen = true;

    if (data.type === 'npc') {
      this.titleEl.textContent = `${data.name}：${data.greeting}`;
    } else {
      this.titleEl.textContent = data.label || '文章列表';
    }

    // Clear previous articles
    this.articlesEl.innerHTML = '';

    if (data.posts && data.posts.length > 0) {
      data.posts.forEach(post => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = post.url || '#';
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = `${post.title}`;

        if (post.date) {
          const dateSpan = document.createElement('span');
          dateSpan.style.color = '#666';
          dateSpan.style.fontSize = '12px';
          dateSpan.style.marginLeft = '8px';
          dateSpan.textContent = post.date;
          a.appendChild(dateSpan);
        }

        li.appendChild(a);
        this.articlesEl.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = '暂无文章';
      li.style.color = '#666';
      this.articlesEl.appendChild(li);
    }

    this.overlay.classList.add('visible');

    // Exit pointer lock when dialog opens
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  hide() {
    this.isOpen = false;
    this.overlay.classList.remove('visible');
  }
}
