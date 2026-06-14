/**
 * 本地预览服务器 - lyzbcy.github.io
 * 直接服务 Jekyll 源文件，自动去除 YAML front matter
 * 用法: node local-preview-server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.LOCAL_PREVIEW_PORT || '8091', 10);
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

// Jekyll front matter 去除：去掉开头的 --- ... --- 块
function stripFrontMatter(content) {
  return content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

// 路由别名
const ROUTE_ALIASES = {
  '/nav': '/zeen-tools/nav.html',
  '/ar': '/ar/index.html',
  '/ar/': '/ar/index.html',
  '/about': '/_tabs/about.html',
  '/archives': '/_tabs/archives.html',
  '/categories': '/_tabs/categories.html',
  '/tags': '/_tabs/tags.html',
};

// 备选路径：优先从 _site/ 查找（Jekyll 构建产物），再回退到源文件
function trySiteFirst(urlPath) {
  const sitePath = path.join(ROOT, '_site', decodeURIComponent(urlPath));
  if (fs.existsSync(sitePath) && fs.statSync(sitePath).isFile()) {
    return sitePath;
  }
  if (fs.existsSync(sitePath) && fs.statSync(sitePath).isDirectory()) {
    const idx = path.join(sitePath, 'index.html');
    if (fs.existsSync(idx)) return idx;
  }
  return null;
}

// 不对外暴露的路径
const BLOCKED = ['/_site', '/.git', '/.github', '/tools', '/_drafts', '/Gemfile', '/Gemfile.lock'];

function tryResolveFile(urlPath) {
  let resolved = urlPath;

  // 路由别名
  if (ROUTE_ALIASES[resolved]) {
    resolved = ROUTE_ALIASES[resolved];
  }

  // 优先从 _site/ 查找（Jekyll 构建后的完整 HTML）
  const siteFile = trySiteFirst(resolved);
  if (siteFile) return siteFile;

  // 尝试直接找源文件
  let fullPath = path.join(ROOT, decodeURIComponent(resolved));

  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
    return fullPath;
  }

  // 目录 → 尝试 index.html
  if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
    const indexPath = path.join(fullPath, 'index.html');
    if (fs.existsSync(indexPath)) return indexPath;
  }

  // 无扩展名 → 尝试 .html
  if (!path.extname(resolved)) {
    const htmlPath = path.join(ROOT, decodeURIComponent(resolved + '.html'));
    if (fs.existsSync(htmlPath) && fs.statSync(htmlPath).isFile()) {
      return htmlPath;
    }
  }

  // 首页空内容回退 → 重定向到导航页
  if (urlPath === '/' || urlPath === '') {
    const navPath = path.join(ROOT, 'zeen-tools', 'nav.html');
    if (fs.existsSync(navPath)) return navPath;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const urlPath = decodeURIComponent(url.pathname);

  // 安全检查
  if (BLOCKED.some(b => urlPath.startsWith(b))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  const filePath = tryResolveFile(urlPath);

  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 Not Found</h1><p>页面不存在: ' + urlPath + '</p>');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    let content = fs.readFileSync(filePath);

    // 对文本文件去除 Jekyll front matter
    if (['.html', '.css', '.js', '.json', '.md', '.svg'].includes(ext)) {
      let text = content.toString('utf8');
      if (ext === '.html' || ext === '.md') {
        text = stripFrontMatter(text);
      }
      // 处理 Liquid 模板变量（简化处理）
      text = text.replace(/\{\{\s*['"]([^'"]+)['"]\s*\|\s*relative_url\s*\}\}/g, '$1');
      text = text.replace(/\{%[^%]*%\}/g, ''); // 移除 Liquid 标签
      content = Buffer.from(text, 'utf8');
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(content);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('500 Internal Server Error: ' + err.message);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('========================================');
  console.log('  本地预览服务器已启动');
  console.log('========================================');
  console.log('');
  console.log(`  地址: http://127.0.0.1:${PORT}/`);
  console.log(`  导航: http://127.0.0.1:${PORT}/nav`);
  console.log(`  AR:   http://127.0.0.1:${PORT}/ar/`);
  console.log('');
  console.log('  按 Ctrl+C 停止服务器');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[错误] 端口 ${PORT} 已被占用，请关闭占用端口的程序或使用 LOCAL_PREVIEW_PORT 环境变量指定其他端口。`);
  } else {
    console.error('[错误]', err.message);
  }
  process.exit(1);
});
