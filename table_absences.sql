create table if not exists absences (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references professionals(id) on delete cascade,
  owner_user_id   uuid not null,       -- multi-tenant
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  reason          text,                -- "Férias", "Congresso", etc.
  type            text default 'custom', -- opcional: 'day_off','vacation','holiday'
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint chk_absence_time check (end_at > start_at)
);

create index if not exists idx_abs_prof on absences(professional_id, start_at);
