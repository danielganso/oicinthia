PRD – Plataforma CinthIA
1. Visão Geral

CinthIA é uma plataforma web (SaaS) para clínicas odontológicas que desejam automatizar o agendamento de consultas via WhatsApp.
A atendente virtual, CinthIA, utiliza a Evolution API para integrar o número de WhatsApp de cada cliente e responder automaticamente aos pacientes.
O sistema oferece um dashboard completo para gerenciar profissionais, agenda, assinaturas e bloqueios de horários.
Toda a agenda é armazenada no banco próprio e disponibilizada para leitura em Google Calendar/Outlook via feed ICS (.ics) – não há OAuth com Google.

2. Público-Alvo

Clínicas odontológicas de pequeno e médio porte.

Dentistas autônomos que precisam de um agendamento simples e automático via WhatsApp.

3. Objetivos Principais

Permitir que clínicas cadastrem seus profissionais e vinculem um número de WhatsApp para atendimento automático.

Disponibilizar um dashboard moderno e responsivo com todas as funções de agenda.

Garantir bloqueio automático ao final do período de teste gratuito ou se a assinatura não estiver ativa.

Fornecer feed ICS para que a agenda possa ser visualizada em Google Calendar/Outlook.

4. Arquitetura de Tecnologia
Frontend

Framework: Next.js (React)

UI/Estilo: Tailwind CSS + componentes modernos (menu lateral responsivo, dark/light mode opcional)

Páginas:

Landing Page

Cadastro

Login

Dashboard (Home, Profissionais, Agendamentos, Assinaturas)

Backend / API

Linguagem: Node.js

Framework: Express.js

Autenticação: Supabase Auth (email/senha)

Banco de Dados: Supabase (PostgreSQL)

Pagamentos: Pagar.me (planos recorrentes, webhooks para controle de status)

Integração WhatsApp: Evolution API (QR code + webhooks)

Agenda/Calendário: endpoint ICS (/professionals/:id/calendar.ics) gerando feed iCalendar

Hospedagem/Infra: VPS ou Docker + Nginx + SSL (Cloudflare/Let’s Encrypt)

5. Fluxo de Usuário
5.1. Landing Page

Seções:

Hero: apresentação da CinthIA, chamada para teste grátis.

Como funciona: descrição do bot de agendamento.

Funcionalidades: integração WhatsApp, agenda online, feed ICS, bloqueio automático.

Planos e Preços: Autônomo, Até 3 profissionais, Até 5 profissionais.

Call-to-Action: botão “Teste grátis 7 dias”.

Design: moderno, responsivo, animações leves.

5.2. Cadastro / Login

Tela de Cadastro: campos Nome, E-mail, Telefone/WhatsApp, Senha.

Tela de Login: e-mail e senha.

Processo:

Ao cadastrar, gerar client_id único (UUID).

Criar assinatura em trial com expiração em 7 dias.

Enviar e-mail de boas-vindas.

5.3. Teste Gratuito e Bloqueio

Usuário tem 7 dias grátis.

Ao expirar, se não houver pagamento ativo via Pagar.me:

Dashboard bloqueado: exibir tela “Assinatura expirada”.

Webhooks do Pagar.me atualizam status para active quando o pagamento é confirmado.

5.4. Dashboard

Layout: menu lateral fixo, responsivo, padrão dashboard SaaS.

Seções:

Home

Próximas consultas: lista por profissional, cidade/clinica, paciente.

Profissionais

Cadastro de profissional com:

Nome

Especialidade

Nome da clínica de atendimento

Cidades de atendimento (várias possíveis)

Endereço por cidade/clinica

Valor da consulta por cidade/clinica

Geração de professional_id (UUID público)

Integração WhatsApp: botão “Vincular WhatsApp” que exibe QR Code do Evolution API

Token do feed ICS (gerado automaticamente)

Limite de profissionais conforme plano (1, 3 ou 5).

Agendamentos

Listagem de todos os agendamentos, filtro por profissional/cidade.

Cadastro de bloqueios/folgas:

Por dia inteiro (ex: 25/09).

Por intervalo de datas (ex: 25/12 a 02/01).

Por cidade/clinica/dias da semana (ex: “Seg/Qua/Sex na Clínica X”).

Endpoint ICS para assinar no Google/Outlook.

Assinaturas

Mostra plano atual, status, data de vencimento e próximo pagamento.

Botão para atualizar plano/pagamento.

6. Funcionalidades Principais

Controle de Acesso por Assinatura:

Middleware verifica subscriptions.status.

Bloqueio automático quando trial expira ou status != active.

Integração Evolution API:

Geração e exibição do QR code por profissional.

Armazenamento seguro do whatsapp_device_id.

Feed ICS:

Endpoint gera arquivo iCalendar com:

Eventos de consultas (appointments).

Eventos de bloqueio (folgas/exceções).

Segurança: token longo e revogável.

7. Modelo de Dados (principais tabelas)
professionals

id (uuid, pk)

owner_user_id (uuid) – dono da conta

public_code (text) – ID público para Evolution API

name (text)

specialty (text)

whatsapp_device_id (text)

ics_feed_token (text)

locations_json (jsonb) – {city, clinic, address, price}

timezone (text)

created_at / updated_at

appointments

id (uuid, pk)

owner_user_id (uuid)

professional_id (uuid fk)

patient_name (text)

city (text)

clinic_name (text)

address (text)

start_at / end_at (timestamptz)

status (booked/canceled/completed)

notes (text)

ical_uid (text unique)

created_at / updated_at

subscriptions

id (uuid, pk)

owner_user_id (uuid unique)

plan (enum: autonomo, ate_3, ate_5)

pagarme_customer_id (text)

pagarme_subscription_id (text)

status (enum: trial, active, past_due, blocked, canceled)

trial_end (timestamptz)

current_period_end (timestamptz)

created_at / updated_at

users (Supabase Auth)

(gerenciado pelo Supabase)

nome, telefone/whatsapp, e-mail, senha hash.

8. APIs e Endpoints Principais

Autenticação: /auth/* (Supabase)

Profissionais: POST /professionals, GET /professionals, PATCH /professionals/:id

Evolution: GET /professionals/:id/qr

Agendamentos: POST /appointments, GET /appointments, PATCH /appointments/:id

ICS Feed: GET /professionals/:id/calendar.ics?token=...

Assinaturas: GET /subscriptions/me, POST /subscriptions/upgrade

9. Requisitos Não-Funcionais

Segurança: HTTPS obrigatório, tokens e credenciais criptografados.

Escalabilidade: projeto multi-tenant, índices adequados, exclusão de intervalos para evitar overbooking.

Disponibilidade: 99% uptime.

Monitoramento: logs de eventos e falhas.

10. Entrega Esperada

Landing page completa com seções descritas.

Sistema de cadastro/login com Supabase.

Dashboard com menu lateral e todas as telas.

Integração Evolution API (QR code por profissional).

Geração e disponibilização de feed ICS.

Teste grátis 7 dias com bloqueio automático.

Planos de assinatura com Pagar.me.