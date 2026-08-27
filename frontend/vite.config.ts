import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    watch: {
      // Bind-mounted volumes (Docker Desktop on Windows) don't reliably emit
      // native fs-change events, so chokidar's default watcher silently
      // misses edits. Polling trades a little CPU for HMR that actually fires.
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
