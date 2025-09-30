module.exports = {
  apps: [
    {
      name: 'cinthia-app',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/your/app', // Substitua pelo caminho real na sua VPS
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};