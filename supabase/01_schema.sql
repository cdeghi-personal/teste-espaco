-- ============================================================
-- Espaço Casa Amarela — Schema Principal
-- Rodar no Supabase SQL Editor (em ordem)
-- ============================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role         as enum ('admin', 'therapist');
create type sex_type          as enum ('M', 'F', 'O');
create type appt_status       as enum ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
create type session_quality   as enum ('excellent', 'good', 'regular', 'difficult');
create type activity_outcome  as enum ('achieved', 'partial', 'not_achieved');

-- ============================================================
-- PROFILES (vincula auth.users ao role)
-- Criado automaticamente via trigger ao convidar usuário
-- ============================================================

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       user_role not null default 'therapist',
  created_at timestamptz not null default now()
);

-- Trigger: cria profile automaticamente quando um usuário confirma o convite
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role)
  values (
    new.id,
    coalesce((new.raw_app_meta_data->>'role')::user_role, 'therapist')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- TABELAS DE CONFIGURAÇÃO
-- ============================================================

create table specialties (
  id         uuid primary key default uuid_generate_v4(),
  key        text not null unique, -- 'FISIOTERAPIA', 'FONOAUDIOLOGIA', 'TO', 'PSICOLOGIA'
  label      text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table payment_methods (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table patient_statuses (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  color      text not null default 'bg-gray-100 text-gray-700', -- classes Tailwind
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table diagnoses (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table rooms (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- TERAPEUTAS
-- user_id é preenchido quando o terapeuta aceita o convite
-- ============================================================

create table therapists (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid unique references auth.users(id) on delete set null,
  name       text not null,
  specialty  text not null, -- chave do enum de especialidades
  email      text,
  phone      text,
  bio        text,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PACIENTES
-- ============================================================

create table patients (
  id                   uuid primary key default uuid_generate_v4(),
  full_name            text not null,
  date_of_birth        date not null,
  sex                  sex_type not null,
  cpf                  text,
  diagnosis            text,        -- diagnóstico principal (texto livre)
  notes                text,
  status_id            uuid references patient_statuses(id) on delete set null,
  payment_method_id    uuid references payment_methods(id) on delete set null,
  primary_therapist_id uuid references therapists(id) on delete set null,
  deleted              boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Especialidades do paciente (quais terapias recebe)
create table patient_specialties (
  patient_id uuid not null references patients(id) on delete cascade,
  specialty  text not null,
  primary key (patient_id, specialty)
);

-- Terapeutas secundários do paciente
create table patient_secondary_therapists (
  patient_id   uuid not null references patients(id) on delete cascade,
  therapist_id uuid not null references therapists(id) on delete cascade,
  primary key (patient_id, therapist_id)
);

-- Condições/diagnósticos associados ao paciente
create table patient_conditions (
  patient_id   uuid not null references patients(id) on delete cascade,
  diagnosis_id uuid not null references diagnoses(id) on delete cascade,
  primary key (patient_id, diagnosis_id)
);

-- ============================================================
-- RESPONSÁVEIS (Guardiões)
-- ============================================================

create table guardians (
  id           uuid primary key default uuid_generate_v4(),
  full_name    text not null,
  relationship text not null,
  phone        text,
  email        text,
  cpf          text,
  occupation   text,
  notes        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Vínculo paciente ↔ responsável (N:N)
create table patient_guardians (
  patient_id  uuid not null references patients(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  primary key (patient_id, guardian_id)
);

-- ============================================================
-- AGENDAMENTOS
-- ============================================================

create table appointments (
  id              uuid primary key default uuid_generate_v4(),
  patient_id      uuid not null references patients(id) on delete cascade,
  therapist_id    uuid not null references therapists(id) on delete cascade,
  room_id         uuid references rooms(id) on delete set null,
  specialty       text not null,
  date            date not null,
  time            text not null,       -- formato 'HH:MM'
  duration        integer not null default 50, -- minutos
  status          appt_status not null default 'scheduled',
  notes           text,
  consultation_id uuid,                -- preenchido ao converter em consulta
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ============================================================
-- CONSULTAS (Registros de Evolução)
-- ============================================================

create table consultations (
  id               uuid primary key default uuid_generate_v4(),
  patient_id       uuid not null references patients(id) on delete cascade,
  therapist_id     uuid not null references therapists(id) on delete cascade,
  specialty        text not null,
  date             date not null,
  session_number   integer,
  main_objective   text,
  evolution_notes  text,
  next_objectives  text,
  guardian_feedback text,
  session_quality  session_quality,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- FK circular: appointment → consultation (adicionada depois de ambas criadas)
alter table appointments
  add constraint fk_consultation
  foreign key (consultation_id) references consultations(id) on delete set null;

-- Atividades dentro de uma consulta
create table consultation_activities (
  id              uuid primary key default uuid_generate_v4(),
  consultation_id uuid not null references consultations(id) on delete cascade,
  name            text not null,
  description     text,
  outcome         activity_outcome not null,
  sort_order      integer not null default 0
);

-- ============================================================
-- INDEXES úteis para performance
-- ============================================================

create index on appointments (date, therapist_id);
create index on appointments (patient_id);
create index on consultations (patient_id);
create index on consultations (therapist_id);
create index on patients (deleted) where deleted = false;
create index on therapists (user_id);
