-- Tipos auxiliares
do $$ begin
  create type professional_status as enum ('active','inactive');
exception when duplicate_object then null; end $$;

create table if not exists professionals (
  id                uuid primary key default gen_random_uuid(),
  owner_user_id     uuid not null,            -- usuário dono (Supabase auth.user.id)
  public_code       text not null unique,     -- ID aleatório público p/ n8n/Evolution (ex.: "PRF-8X2K1")
  name              text not null,
  specialty         text,
  timezone          text not null default 'America/Bahia',
  whatsapp_device_id text,                    -- identificador da instância no Evolution (se usar)
  ics_feed_token    text not null default encode(gen_random_bytes(24),'hex'),
  locations_json    jsonb not null default '[]'::jsonb, 
  -- Exemplo de locations_json:
  -- [
  --   {"city":"Salvador","clinic":"Clínica X","address":"Rua ...","price":180.00},
  --   {"city":"Lauro de Freitas","clinic":"Clínica Y","address":"Av ...","price":200.00}
  -- ]
  status            professional_status not null default 'active',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Gatilho de updated_at
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists trg_prof_updated on professionals;
create trigger trg_prof_updated before update on professionals
for each row execute procedure set_updated_at();

-- Índices úteis
create index if not exists idx_prof_owner on professionals(owner_user_id);
