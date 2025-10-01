# 🤖 Automação de Expiração de Assinaturas - CinthIA

## ✅ **Status Atual**
- ✅ Trigger SQL funcionando no Supabase
- ✅ API `/api/cron/update-subscriptions` testada e funcionando
- ✅ `CRON_SECRET_KEY` configurada para segurança

## 🔧 **Configuração de Ambientes**

### **⚠️ IMPORTANTE: Diferença entre Desenvolvimento e Produção**

**Desenvolvimento (local):**
- URL: `http://localhost:3000/api/cron/update-subscriptions`
- Arquivo: `.env.local` (local)
- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`

**Produção (VPS):**
- URL: `https://oicinthia.com.br/api/cron/update-subscriptions`
- Arquivo: `.env.local` (na VPS)
- `NEXT_PUBLIC_BASE_URL=https://oicinthia.com.br`

## 🚀 Próximos Passos para Automação

### Opção 1: Cron Job na VPS (Recomendado)

#### 1. Configurar Cron Job no Servidor
```bash
# Editar crontab
crontab -e

# Adicionar linha para executar a cada hora
0 * * * * curl -X POST -H "Authorization: Bearer cron_secret_2024_cinthia_app_secure_key_xyz789" https://oicinthia.com.br/api/cron/update-subscriptions >> /var/log/cron-subscriptions.log 2>&1

# Ou a cada 30 minutos
*/30 * * * * curl -X POST -H "Authorization: Bearer cron_secret_2024_cinthia_app_secure_key_xyz789" https://oicinthia.com.br/api/cron/update-subscriptions >> /var/log/cron-subscriptions.log 2>&1
```

#### 2. Verificar Logs
```bash
# Ver logs do cron
tail -f /var/log/cron-subscriptions.log

# Ver logs do sistema
tail -f /var/log/cron
```

### Opção 2: Serviço Externo (EasyCron, Cron-job.org)

#### EasyCron.com
1. Criar conta em https://www.easycron.com/
2. Configurar job:
   - **URL**: `https://oicinthia.com.br/api/cron/update-subscriptions`
   - **Method**: POST
   - **Headers**: `Authorization: Bearer cron_secret_2024_cinthia_app_secure_key_xyz789`
   - **Frequency**: A cada hora (0 * * * *)

#### Cron-job.org
1. Criar conta em https://cron-job.org/
2. Configurar job similar ao EasyCron

### Opção 3: Vercel Cron (Se usar Vercel)

#### Configurar vercel.json
```json
{
  "crons": [
    {
      "path": "/api/cron/update-subscriptions",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Opção 4: Supabase Edge Function

#### Criar Edge Function
```javascript
// supabase/functions/update-subscriptions/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
  
  const { data, error } = await supabase.rpc('scheduled_update_expired_trials')
  
  return new Response(JSON.stringify({ 
    success: !error,
    data, 
    error,
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" },
  })
})
```

## 🔍 Monitoramento e Testes

### Testar Manualmente
```bash
# Local
curl -X POST -H "Authorization: Bearer cron_secret_2024_cinthia_app_secure_key_xyz789" http://localhost:3000/api/cron/update-subscriptions

# Produção
curl -X POST -H "Authorization: Bearer cron_secret_2024_cinthia_app_secure_key_xyz789" https://oicinthia.com.br/api/cron/update-subscriptions
```

### Verificar no Supabase
```sql
-- Ver estatísticas atuais
SELECT get_subscription_stats();

-- Ver assinaturas que vão expirar em 3 dias
SELECT * FROM get_expiring_trials(3);

-- Executar manualmente
SELECT scheduled_update_expired_trials();
```

## 📊 Resposta da API

### Sucesso
```json
{
  "success": true,
  "result": {
    "success": true,
    "total_updated": 2,
    "test_blocked": 1,
    "active_blocked": 1,
    "message": "Atualizadas: 1 teste->blocked, 1 ativa->blocked",
    "executed_at": "2025-10-01T02:02:58.752932+00:00"
  },
  "timestamp": "2025-10-01T02:02:57.947Z"
}
```

### Erro
```json
{
  "success": false,
  "error": "Unauthorized",
  "timestamp": "2025-10-01T02:02:57.947Z"
}
```

## 🔐 Segurança

### Variáveis de Ambiente Necessárias
```env
# .env.local (desenvolvimento)
CRON_SECRET_KEY=cron_secret_2024_cinthia_app_secure_key_xyz789

# .env (produção)
CRON_SECRET_KEY=sua_chave_super_secreta_aqui
```

### Recomendações
1. ✅ Use HTTPS em produção
2. ✅ Mantenha a chave secreta segura
3. ✅ Configure logs para monitoramento
4. ✅ Teste regularmente o funcionamento

## 📅 Frequências Recomendadas

- **Desenvolvimento**: Manual ou a cada hora
- **Produção**: A cada 30 minutos ou 1 hora
- **Crítico**: A cada 15 minutos (se necessário)

## 🎯 Próxima Ação Recomendada

**Para VPS**: Configure o cron job usando a Opção 1
**Para Vercel**: Use a Opção 3 com vercel.json
**Para outros**: Use serviço externo (Opção 2)