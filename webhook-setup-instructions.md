# Configuração do Sistema de Webhooks - Mercado Pago

## ✅ Sistema Implementado

O sistema de webhooks e gerenciamento automático de assinaturas foi implementado com sucesso! Aqui está o que foi criado:

### 📁 Arquivos Criados

1. **`/src/pages/api/mercadopago/webhook.js`**
   - Endpoint para receber notificações do Mercado Pago
   - Processa pagamentos aprovados automaticamente
   - Atualiza status das assinaturas na tabela `subscriptions`

2. **`/src/pages/api/cron/check-subscriptions.js`**
   - Sistema de verificação mensal de assinaturas
   - Bloqueia automaticamente assinaturas em atraso (após 2 dias)
   - Pode ser executado via cron job ou manualmente

### 🔧 Configurações Necessárias

#### 1. Configurar Webhook no Painel do Mercado Pago

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Selecione sua aplicação
3. Vá em **"Webhooks"**
4. Adicione uma nova URL de webhook:
   ```
   https://seudominio.com/api/mercadopago/webhook
   ```
5. Selecione os eventos:
   - ✅ `payment` (pagamentos)
   - ✅ `preapproval` (assinaturas)

#### 2. Variáveis de Ambiente Necessárias

Certifique-se de que estas variáveis estão configuradas:

```env
MERCADOPAGO_ACCESS_TOKEN=seu_access_token_aqui
NEXT_PUBLIC_BASE_URL=https://seudominio.com
```

### 🚀 Como Funciona

#### Quando o Cliente Paga:
1. Mercado Pago envia notificação para `/api/mercadopago/webhook`
2. Sistema verifica se o pagamento foi aprovado
3. Atualiza automaticamente a tabela `subscriptions`:
   - `status` → `'active'`
   - `current_period_end` → +30 dias da data do pagamento

#### Verificação Mensal:
1. Execute `/api/cron/check-subscriptions` mensalmente
2. Sistema verifica assinaturas vencidas há mais de 2 dias
3. Bloqueia automaticamente (`status` → `'blocked'`)

### 📊 Estrutura da Tabela Subscriptions

```sql
-- Campos atualizados pelo sistema:
status               -- 'active', 'blocked', 'cancelled'
current_period_end   -- Data de vencimento (+30 dias do pagamento)
updated_at          -- Timestamp da última atualização
```

### 🔄 Configuração do Cron Job

Para executar a verificação automaticamente, configure um cron job:

```bash
# Executar todo dia 1º do mês às 9h
0 9 1 * * curl -X GET https://seudominio.com/api/cron/check-subscriptions
```

### 🧪 Testando o Sistema

#### Testar Webhook:
1. Crie uma assinatura de teste
2. Faça um pagamento de teste
3. Verifique os logs do servidor
4. Confirme se a tabela `subscriptions` foi atualizada

#### Testar Verificação Mensal:
```bash
curl -X GET https://seudominio.com/api/cron/check-subscriptions
```

### 📝 Logs e Monitoramento

O sistema gera logs detalhados para monitoramento:
- Notificações recebidas do Mercado Pago
- Atualizações na tabela de assinaturas
- Bloqueios automáticos
- Erros e exceções

### ⚠️ Importante

1. **Teste em ambiente de desenvolvimento** antes de colocar em produção
2. **Configure HTTPS** para o webhook funcionar corretamente
3. **Monitore os logs** regularmente para identificar problemas
4. **Mantenha backup** da tabela subscriptions

### 🆘 Troubleshooting

**Webhook não está funcionando?**
- Verifique se a URL está acessível publicamente
- Confirme se o HTTPS está configurado
- Verifique os logs do servidor

**Assinaturas não estão sendo atualizadas?**
- Verifique se o `external_reference` está correto
- Confirme se as variáveis de ambiente estão configuradas
- Verifique a estrutura da tabela `subscriptions`

---

✅ **Sistema pronto para produção!** 🚀