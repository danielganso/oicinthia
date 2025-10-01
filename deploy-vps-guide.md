# 🚀 Guia Completo: Deploy na VPS + Cron Job

## 📋 **Pré-requisitos**

- VPS com Ubuntu/Debian
- Node.js 18+ instalado
- PM2 instalado globalmente (`npm install -g pm2`)
- Nginx configurado (opcional, mas recomendado)
- SSL/HTTPS configurado para `oicinthia.com.br`

## 🚀 **Passo a Passo - Deploy**

### **1. Clonar o Repositório**
```bash
cd /var/www
git clone https://github.com/seu-usuario/CinthIA.git
cd CinthIA
```

### **2. Instalar Dependências**
```bash
npm install
```

### **3. Configurar Variáveis de Ambiente**

**⚠️ IMPORTANTE: Diferença entre Desenvolvimento e Produção**

- **Desenvolvimento** (`.env.local` local): `NEXT_PUBLIC_BASE_URL=http://localhost:3000`
- **Produção** (`.env.local` na VPS): `NEXT_PUBLIC_BASE_URL=https://oicinthia.com.br`

**Na VPS, criar o arquivo `.env.local`:**
```bash
cp .env.production.example .env.local
nano .env.local
```

**Configure as variáveis de produção:**
```env
# Configuração da Evolution API
EVOLUTION_API_BASE=https://evolutionapi.tripos.com.br
EVOLUTION_API_BASE_API=https://evolutionapi.tripos.com.br/api
EVOLUTION_API_KEY=JbZBofBlEPukrmCcSOkZAyzsJZBZAm

# URL base para o frontend (ALTERAR PARA SEU DOMÍNIO)
NEXT_PUBLIC_BASE_URL=https://oicinthia.com.br

# N8N Webhooks
N8N_WEBHOOK_URL_TEST=https://n8n.tripos.com.br/webhook-test/81bd37f4-0417-4357-8098-71986bb30d3b/evo
N8N_WEBHOOK_URL_PROD=https://n8n.tripos.com.br/webhook/81bd37f4-0417-4357-8098-71986bb30d3b/evo

# Configuração do Mercado Pago (USAR CREDENCIAIS DE PRODUÇÃO)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-sua-chave-de-producao
MERCADOPAGO_PUBLIC_KEY=APP_USR-sua-chave-publica-de-producao
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta_webhook

# Chave secreta para cron jobs (GERAR NOVA CHAVE SEGURA)
CRON_SECRET_KEY=sua_chave_super_secreta_de_producao_2024

NODE_ENV=production
```

### **3. Iniciar com PM2**

#### 3.1 Usar o arquivo ecosystem.config.js
```bash
pm2 start ecosystem.config.js
```

#### 3.2 Verificar se está rodando
```bash
pm2 status
pm2 logs cinthia-app
```

#### 3.3 Salvar configuração do PM2
```bash
pm2 save
pm2 startup
```

### **4. Configurar Cron Job**

#### 4.1 Abrir crontab
```bash
crontab -e
```

#### 4.2 Adicionar linha do cron job
```bash
# Executar a cada hora (no minuto 0)
0 * * * * curl -X POST -H "Authorization: Bearer sua_chave_super_secreta_de_producao_2024" https://oicinthia.com.br/api/cron/update-subscriptions >> /var/log/cron-subscriptions.log 2>&1

# OU executar a cada 30 minutos
*/30 * * * * curl -X POST -H "Authorization: Bearer sua_chave_super_secreta_de_producao_2024" https://oicinthia.com.br/api/cron/update-subscriptions >> /var/log/cron-subscriptions.log 2>&1
```

#### 4.3 Salvar e sair
- No nano: `Ctrl + X`, depois `Y`, depois `Enter`
- No vim: `:wq`

### **5. Testar o Sistema**

#### 5.1 Testar a aplicação
```bash
curl https://oicinthia.com.br
```

#### 5.2 Testar a API do cron
```bash
curl -X POST -H "Authorization: Bearer sua_chave_super_secreta_de_producao_2024" https://oicinthia.com.br/api/cron/update-subscriptions
```

#### 5.3 Verificar logs do cron
```bash
tail -f /var/log/cron-subscriptions.log
```

### **6. Configurar Logs (Opcional)**

#### 6.1 Criar diretório de logs
```bash
sudo mkdir -p /var/log/cinthia
sudo chown $USER:$USER /var/log/cinthia
```

#### 6.2 Atualizar cron job com logs detalhados
```bash
# Cron job com logs mais detalhados
0 * * * * echo "$(date): Executando cron de assinaturas" >> /var/log/cinthia/cron.log && curl -X POST -H "Authorization: Bearer sua_chave_super_secreta_de_producao_2024" https://oicinthia.com.br/api/cron/update-subscriptions >> /var/log/cinthia/cron-response.log 2>&1
```

## 🔍 Verificações Importantes

### **Checklist Pré-Deploy**
- [ ] Domínio configurado e apontando para a VPS
- [ ] SSL/HTTPS configurado (Let's Encrypt)
- [ ] Firewall configurado (portas 80, 443, 22)
- [ ] Backup do banco de dados

### **Checklist Pós-Deploy**
- [ ] Aplicação rodando (`pm2 status`)
- [ ] Site acessível via HTTPS
- [ ] API do cron respondendo
- [ ] Cron job configurado (`crontab -l`)
- [ ] Logs sendo gerados

## 🚨 Troubleshooting

### **Aplicação não inicia**
```bash
pm2 logs cinthia-app
npm run build
```

### **Cron job não executa**
```bash
# Verificar se o cron está rodando
sudo systemctl status cron

# Ver logs do sistema
sudo tail -f /var/log/syslog | grep CRON
```

### **API retorna erro 401**
- Verificar se a `CRON_SECRET_KEY` está correta
- Verificar se o header `Authorization` está correto

### **Erro de conexão com Supabase**
- Verificar variáveis de ambiente do Supabase
- Testar conexão manualmente

## 📞 Comandos Úteis

```bash
# Reiniciar aplicação
pm2 restart cinthia-app

# Ver logs em tempo real
pm2 logs cinthia-app --lines 100

# Parar aplicação
pm2 stop cinthia-app

# Ver status do cron
sudo systemctl status cron

# Testar cron manualmente
curl -X POST -H "Authorization: Bearer sua_chave" https://oicinthia.com.br/api/cron/update-subscriptions
```

## 🎯 Resultado Final

Após seguir todos os passos:
- ✅ Aplicação rodando 24/7 com PM2
- ✅ Cron job executando automaticamente
- ✅ Assinaturas expiradas sendo bloqueadas automaticamente
- ✅ Logs para monitoramento
- ✅ Sistema totalmente automatizado