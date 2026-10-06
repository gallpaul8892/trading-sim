import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the site from /<repo-name>/ — only needed for the
  // production build. Dev server stays at the root path.
  base: command === 'build' ? '/trading-sim/' : '/',
  build: {
    // GitHub Pages can serve from a /docs folder on the main branch.
    outDir: 'docs',
    emptyOutDir: true,
  },
}));
