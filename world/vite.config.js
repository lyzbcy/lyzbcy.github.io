import { defineConfig } from 'vite';

export default defineConfig({
  base: '/world/',
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
