create table public.appointments (
  id uuid not null default gen_random_uuid (),
  professional_id uuid not null,
  patient_id uuid null,
  service_name text null,
  city text null,
  clinic_name text null,
  address text null,
  price_cents integer null,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone not null,
  status public.appointment_status not null default 'booked'::appointment_status,
  notes text null,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  ical_uid text null,
  source text null,
  nome_paciente text null,
  email_paciente text null,
  telefone_paciente text null,
  cpf_paciente text null,
  constraint appointments_pkey primary key (id),
  constraint appointments_ical_uid_key unique (ical_uid),
  constraint appointments_patient_id_fkey foreign KEY (patient_id) references patients (id) on delete set null,
  constraint appointments_professional_id_fkey foreign KEY (professional_id) references professionals (id) on delete CASCADE,
  constraint chk_time_order check ((end_at > start_at)),
  constraint app_no_overlap EXCLUDE using gist (
    professional_id
    with
      =,
      tstzrange (start_at, end_at, '[)'::text)
    with
      &&
  )
  where
    ((status = 'booked'::appointment_status))
) TABLESPACE pg_default;

create index IF not exists idx_app_prof_start on public.appointments using btree (professional_id, start_at) TABLESPACE pg_default;

create index IF not exists idx_app_status on public.appointments using btree (status) TABLESPACE pg_default;

create trigger trg_app_updated BEFORE
update on appointments for EACH row
execute FUNCTION set_updated_at ();