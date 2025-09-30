# Configuração da Evolution API para WhatsApp

## Variáveis de Ambiente

Para configurar a integração com a Evolution API, adicione as seguintes variáveis de ambiente ao arquivo `.env.local` na raiz do projeto:

```
EVOLUTION_API_BASE=https://evolutionapi.tripos.com.br
EVOLUTION_API_KEY=JbZBofBlEPukrmCcSOkZAyzsJZBZAm
```

## Webhook

O webhook para receber notificações da Evolution API está configurado em:

```
/api/evolution/webhook
```

Este endpoint recebe notificações quando mensagens são enviadas ou recebidas e pode ser usado para implementar lógicas como resposta automática, notificações, etc.

## Endpoints da API

### Vincular WhatsApp

```
POST /api/evolution/link
Body: { professionalId: string }
Retorna: { instanceKey: string, qrImage: string }
```

### Verificar Status

```
GET /api/evolution/status?professionalId=<id>
Retorna: { connected: boolean, state: string }
```

## Componente de Interface

O componente `WhatsAppLinkButton` está disponível para ser usado em qualquer página que precise vincular um WhatsApp a um profissional.

```jsx
import WhatsAppLinkButton from '../components/WhatsAppLinkButton';

// Uso
<WhatsAppLinkButton 
  professionalId="123" 
  deviceId="device_123" 
  onSuccess={() => console.log('WhatsApp vinculado!')} 
/>
```