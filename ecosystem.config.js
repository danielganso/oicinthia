module.exports = {
  apps: [{
    name: 'oicinthia',
    script: 'npm',
    args: 'start',
    cwd: '/root/oicinthia/oicinthia',
    exec_mode: 'fork',
    instances: 1,
    env: { NODE_ENV: 'production', PORT: 3010 },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}