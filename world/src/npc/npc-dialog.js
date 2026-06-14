const CATEGORY_SUMMARIES = {
  健身: '训练记录、补剂体验和身体管理方法被整理成了持续更新的成长档案。',
  星星布丁: '把亲密关系中的细节、纪念和情绪都收进一个更温柔的节点里。',
  Unity开发: '偏工程实践与工具沉淀，适合作为技术作品集入口来阅读。',
  美食: '更像生活采样和评价系统，读起来轻松，也能补足世界里的烟火感。',
  旅游: '攻略、路线与城市体验被放进了可随时取用的旅行资料夹。',
  社会体验报告: '偏观察与复盘，记录真实接触社会后的反馈与判断。',
  学习: '围绕方法、心流和长期积累，构成这个世界里最理性的部分。',
  就业: '把规划、路径选择和现实压力集中到一组更清晰的决策材料里。',
  工具: '收录提升效率和表达能力的工具实践，偏实用导向。',
  生活: '记录阶段性的生活愿望、安排与仪式感。',
  写作: '用于承载更私人也更抽象的表达，是世界里的慢速区域。',
  泰拉瑞亚: '带有游戏陪伴感的专题节点，连接兴趣和记忆。',
  微信小游戏: '聚焦小体量产品开发，把创意和实现过程并置展示。',
  周三涵: '像一段被保留下来的日常语音，轻一点，也更近一点。'
};

function getPostDescription(post) {
  return `${post.category || '未分类'} · ${post.date || '无日期'} · 打开原文继续阅读`;
}

export class NPCDialog {
  constructor(articleViewer) {
    this.articleViewer = articleViewer;
    this.overlay = document.getElementById('dialog-overlay');
    this.titleEl = document.getElementById('dialog-title');
    this.metaTagEl = document.getElementById('dialog-tag');
    this.metaCountEl = document.getElementById('dialog-count');
    this.summaryEl = document.getElementById('dialog-summary');
    this.articlesEl = document.getElementById('dialog-articles');
    this.closeBtn = document.getElementById('dialog-close');
    this.isOpen = false;

    this.closeBtn.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.hide();
    });
  }

  show(data) {
    this.isOpen = true;
    const posts = data.posts || [];

    if (data.type === 'npc') {
      this.titleEl.textContent = `${data.name} · ${data.category}`;
      this.metaTagEl.textContent = 'Character Node';
      this.summaryEl.textContent = CATEGORY_SUMMARIES[data.category] || data.greeting || '这是一个等待继续丰富的主题节点。';
    } else {
      this.titleEl.textContent = data.label || '文章列表';
      this.metaTagEl.textContent = 'Tower Archive';
      this.summaryEl.textContent = data.summary || '中心主塔会把这个世界里的文章重新编排成几条易于探索的内容路线。';
    }

    this.metaCountEl.textContent = `${posts.length} Articles`;
    this.articlesEl.innerHTML = '';

    if (posts.length > 0) {
      posts.forEach((post) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        const top = document.createElement('div');
        const title = document.createElement('strong');
        const date = document.createElement('span');
        const desc = document.createElement('div');

        a.href = post.url || '#';
        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (this.articleViewer) {
            this.articleViewer.open(post);
          } else {
            window.open(post.url, '_blank', 'noopener');
          }
        });

        top.className = 'article-top';
        title.textContent = post.title;
        date.className = 'article-date';
        date.textContent = post.date || '无日期';
        desc.className = 'article-desc';
        desc.textContent = post.description || getPostDescription(post);

        top.appendChild(title);
        top.appendChild(date);
        a.appendChild(top);
        a.appendChild(desc);
        li.appendChild(a);
        this.articlesEl.appendChild(li);
      });
    } else {
      const li = document.createElement('li');
      li.textContent = '这个节点暂时还没有开放文章。';
      li.style.color = 'rgba(237, 244, 248, 0.5)';
      li.style.padding = '10px 2px';
      this.articlesEl.appendChild(li);
    }

    this.overlay.classList.add('visible');

    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
  }

  hide() {
    this.isOpen = false;
    this.overlay.classList.remove('visible');
  }
}
