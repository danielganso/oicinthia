-- Tabela de instâncias Evolution por profissional
create table if not exists evolution_instances (
  id                   uuid primary key default gen_random_uuid(),
  professional_id      uuid not null references professionals(id) on delete cascade,
  owner_user_id        uuid not null,                     -- multi-tenant
  instance_name        text not null,                     -- "evo-PRF-8X2K1"
  instance_key         text not null unique,              -- chave/ID da Evolution
  number_e164          text,                              -- +55...
  state                text,                              -- "qr","connecting","connected","disconnected"...
  ignore_groups        boolean not null default true,
  webhook_url          text not null,                     -- seu n8n webhook-test
  webhook_events       text[] not null default '{message.upsert,message.send}',
  connected_at         timestamptz,
  last_qr_at           timestamptz,
  settings_json        jsonb not null default '{}'::jsonb,
  metadata_json        jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint uniq_prof_active unique (professional_id)    -- se quiser garantir 1 ativa por profissional
);

create index if not exists idx_evo_inst_prof on evolution_instances(professional_id);
create index if not exists idx_evo_inst_owner on evolution_instances(owner_user_id);

-- trigger updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_evo_inst_upd on evolution_instances;
create trigger trg_evo_inst_upd before update on evolution_instances
for each row execute procedure set_updated_at();

-- (Opcional) tabela de eventos/logs que chegam pelo webhook
create table if not exists evolution_events (
  id               uuid primary key default gen_random_uuid(),
  evolution_instance_id uuid not null references evolution_instances(id) on delete cascade,
  owner_user_id    uuid not null,
  event_type       text not null,          -- "message.upsert","message.send","status.update"...
  external_event_id text,                  -- se houver um id para idempotência
  payload          jsonb not null,
  created_at       timestamptz not null default now(),
  unique (evolution_instance_id, external_event_id)       -- evita duplicado se vier id externo
);

create index if not exists idx_evo_events_inst on evolution_events(evolution_instance_id);
create index if not exists idx_evo_events_type on evolution_events(event_type);
