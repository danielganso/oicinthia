do $$ begin
  create type subscription_status as enum ('active','past_due','blocked','canceled','test');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_tier as enum ('autonomo','ate_3','ate_5');
exception when duplicate_object then null; end $$;

create table if not exists subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  owner_user_id        uuid not null unique,   -- 1 assinatura por conta (pode mudar depois)
  plan                 plan_tier not null,
  pagarme_customer_id  text,
  pagarme_subscription_id text,
  status               subscription_status not null default 'active',
  current_period_end   timestamptz,            -- próximo vencimento
  grace_until          timestamptz,            -- se aplicar
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

drop trigger if exists trg_sub_updated on subscriptions;
create trigger trg_sub_updated before update on subscriptions
for each row execute procedure set_updated_at();
