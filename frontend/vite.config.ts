import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Identificador desta build: vai embutido no app (__VERSAO_APP__) e em dist/versao.json.
// O app compara os dois para avisar, em todas as abas abertas, que saiu versão nova.
const VERSAO = process.env.VERSAO_APP || new Date().toISOString();

function arquivoDeVersao(): Plugin {
  return {
    name: 'cotton-versao',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'versao.json', source: JSON.stringify({ versao: VERSAO }) });
    },
  };
}

export default defineConfig(({ command }) => ({
  plugins: [react(), arquivoDeVersao()],
  define: {
    // Em dev não há versão publicada para comparar.
    __VERSAO_APP__: JSON.stringify(command === 'build' ? VERSAO : 'dev'),
  },
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
}));
