import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

/**
 * Serve the parent Jekyll _site output so the in-world article viewer can
 * load real post HTML during local development.
 *
 * - Maps `/posts/...`, `/assets/...`, `/categories/...`, `/tags/...`, `/archives/...`
 *   to the corresponding files in ../_site.
 * - Avoids the SPA fallback (index.html) swallowing these routes.
 */
function serveSite() {
  const siteRoot = path.resolve(__dirname, '..', '_site');
  const prefixes = ['/posts/', '/assets/', '/categories/', '/tags/', '/archives/', '/about/', '/calendar/'];

  return {
    name: 'serve-parent-site',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        // Strip query string
        const qIdx = url.indexOf('?');
        const cleanUrl = qIdx >= 0 ? url.slice(0, qIdx) : url;

        const matched = prefixes.some(p => cleanUrl.startsWith(p) || cleanUrl === p.slice(0, -1));
        if (!matched) return next();

        // Decode and resolve relative to _site
        let rel = decodeURIComponent(cleanUrl);
        if (rel.endsWith('/')) rel += 'index.html';
        const filePath = path.join(siteRoot, rel);

        // Guard against path traversal
        if (!filePath.startsWith(siteRoot)) return next();

        fs.readFile(filePath, (err, data) => {
          if (err) return next();
          const ext = path.extname(filePath).toLowerCase();
          const types = {
            '.html': 'text/html; charset=utf-8',
            '.js': 'text/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.woff': 'font/woff',
            '.woff2': 'font/woff2',
            '.ttf': 'font/ttf',
            '.xml': 'application/xml',
            '.txt': 'text/plain'
          };
          res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
          res.end(data);
        });
      });
    }
  };
}

export default defineConfig({
  base: '/world/',
  plugins: [serveSite()],
  build: {
    outDir: '../_site/world',
    emptyOutDir: true,
    assetsInlineLimit: 0
  },
  server: {
    port: 5174,
    open: true
  }
});
