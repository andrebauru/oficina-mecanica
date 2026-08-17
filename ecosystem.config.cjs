// PM2 Ecosystem — Hirata Cars Backend
// Uso: pm2 start ecosystem.config.js
// Deploy: pm2 start ecosystem.config.js --env production
module.exports = {
  apps: [
    {
      name: 'hirata-backend',
      script: 'backend/server.js',
      cwd: '/var/www/hiratacars.jp',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // O arquivo .env e carregado pelo dotenv dentro do proprio server.js
      // (backend/src/config/env.js -> dotenv.config({ path: '../../.env' }))
      error_file: '/var/www/hiratacars.jp/logs/pm2-error.log',
      out_file: '/var/www/hiratacars.jp/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
