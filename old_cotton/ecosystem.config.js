// ecosystem.config.js — Configuração PM2 para Cotton Fibra Forte
// Uso: pm2 start ecosystem.config.js
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      // ─── Identificação ─────────────────────────────────────────────────────
      name: 'cotton-backend',
      script: './backend/dist/app.js',

      // ─── Modo de execução ──────────────────────────────────────────────────
      // 'fork' é mais simples; use 'cluster' + instances='max' para multi-core
      exec_mode: 'fork',
      instances: 1,

      // ─── Monitoramento e reinício automático ───────────────────────────────
      watch: false,                // Não observar arquivos (produção usa build)
      autorestart: true,           // Reiniciar em caso de crash
      max_restarts: 10,            // Máx tentativas antes de parar
      restart_delay: 3000,         // Aguardar 3s entre tentativas (ms)
      min_uptime: '10s',           // Considerar estável após 10s rodando

      // ─── Limites de memória ────────────────────────────────────────────────
      max_memory_restart: '512M',  // Reinicia se ultrapassar 512MB

      // ─── Variáveis de ambiente ─────────────────────────────────────────────
      // PM2 carrega o .env automaticamente com 'node-args: ["--env-file .env"]'
      // OU defina as variáveis aqui (mais seguro para produção):
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
        DATABASE_URL: 'mysql://cotton:mudar%408956@localhost:3306/cotton_db',
        JWT_SECRET: 'cotton-fibra-forte-chave-secreta-2026-super-segura-prod',
        JWT_EXPIRES_IN: '8h',
        JWT_REFRESH_EXPIRES_IN: '7d',
        FRONTEND_URL: 'http://cotton.jhontisystem.com.br',
        CORS_ORIGIN: 'http://cotton.jhontisystem.com.br',
        REDIS_URL: 'redis://localhost:6379',
        ENCRYPTION_KEY: 'cotton-fibra-forte-encryption-key-32-chars-2026',
      },

      // ─── Logs ─────────────────────────────────────────────────────────────
      // Arquivos de log (padrão PM2: ~/.pm2/logs/)
      out_file: '/var/log/cotton/backend-out.log',
      error_file: '/var/log/cotton/backend-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',

      // ─── Node.js args ─────────────────────────────────────────────────────
      node_args: '--max-old-space-size=256',   // Limitar heap do Node
    },
  ],
};
