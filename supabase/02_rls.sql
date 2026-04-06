-- ============================================================
-- Espaço Casa Amarela — Row Level Security (RLS)
-- Rodar APÓS o 01_schema.sql
-- ============================================================

-- ============================================================
-- FUNÇÕES AUXILIARES
-- ============================================================

-- Retorna true se o usuário logado é admin
create or replace function is_admin()
returns boolean as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$ language sql security definer stable;

-- Retorna o UUID do terapeuta vinculado ao usuário logado
create or replace function my_therapist_id()
returns uuid as $$
  select id from public.therapists
  where user_id = auth.uid()
  limit 1
$$ language sql security definer stable;

-- ============================================================
-- ATIVAR RLS EM TODAS AS TABELAS
-- ============================================================

alter table profiles                     enable row level security;
alter table specialties                  enable row level security;
alter table payment_methods              enable row level security;
alter table patient_statuses             enable row level security;
alter table diagnoses                    enable row level security;
alter table rooms                        enable row level security;
alter table therapists                   enable row level security;
alter table patients                     enable row level security;
alter table patient_specialties          enable row level security;
alter table patient_secondary_therapists enable row level security;
alter table patient_conditions           enable row level security;
alter table guardians                    enable row level security;
alter table patient_guardians            enable row level security;
alter table appointments                 enable row level security;
alter table consultations                enable row level security;
alter table consultation_activities      enable row level security;

-- ============================================================
-- PROFILES
-- Usuário vê apenas o próprio perfil; admin vê todos
-- ============================================================

create policy "profiles: admin vê todos"
  on profiles for select
  using (is_admin());

create policy "profiles: usuário vê o próprio"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: apenas admin gerencia roles"
  on profiles for all
  using (is_admin());

-- ============================================================
-- TABELAS DE CONFIGURAÇÃO
-- Admin: CRUD completo | Terapeuta: somente leitura
-- ============================================================

-- Macro que gera políticas para tabelas de config
-- (repetido manualmente para cada tabela para clareza)

-- SPECIALTIES
create policy "specialties: todos leem" on specialties for select using (auth.role() = 'authenticated');
create policy "specialties: admin gerencia" on specialties for all using (is_admin());

-- PAYMENT METHODS
create policy "payment_methods: todos leem" on payment_methods for select using (auth.role() = 'authenticated');
create policy "payment_methods: admin gerencia" on payment_methods for all using (is_admin());

-- PATIENT STATUSES
create policy "patient_statuses: todos leem" on patient_statuses for select using (auth.role() = 'authenticated');
create policy "patient_statuses: admin gerencia" on patient_statuses for all using (is_admin());

-- DIAGNOSES
create policy "diagnoses: todos leem" on diagnoses for select using (auth.role() = 'authenticated');
create policy "diagnoses: admin gerencia" on diagnoses for all using (is_admin());

-- ROOMS
create policy "rooms: todos leem" on rooms for select using (auth.role() = 'authenticated');
create policy "rooms: admin gerencia" on rooms for all using (is_admin());

-- ============================================================
-- TERAPEUTAS
-- Admin: CRUD completo
-- Terapeuta: lê todos (para dropdowns), edita apenas o próprio
-- ============================================================

create policy "therapists: todos leem ativos"
  on therapists for select
  using (auth.role() = 'authenticated' and active = true);

create policy "therapists: admin vê todos (incluindo inativos)"
  on therapists for select
  using (is_admin());

create policy "therapists: admin gerencia"
  on therapists for all
  using (is_admin());

create policy "therapists: terapeuta edita o próprio"
  on therapists for update
  using (user_id = auth.uid());

-- ============================================================
-- PACIENTES
-- Admin: acesso total (não deletados)
-- Terapeuta: acessa apenas pacientes dos quais é terapeuta
--   (principal OU secundário)
-- ============================================================

create policy "patients: admin acessa todos"
  on patients for all
  using (is_admin() and deleted = false);

create policy "patients: terapeuta acessa os seus"
  on patients for select
  using (
    deleted = false
    and (
      primary_therapist_id = my_therapist_id()
      or exists(
        select 1 from patient_secondary_therapists pst
        where pst.patient_id = patients.id
          and pst.therapist_id = my_therapist_id()
      )
    )
  );

create policy "patients: terapeuta edita os seus"
  on patients for update
  using (
    deleted = false
    and (
      primary_therapist_id = my_therapist_id()
      or exists(
        select 1 from patient_secondary_therapists pst
        where pst.patient_id = patients.id
          and pst.therapist_id = my_therapist_id()
      )
    )
  );

-- Tabelas de relação de pacientes — mesma regra de acesso

create policy "patient_specialties: admin" on patient_specialties for all using (is_admin());
create policy "patient_specialties: terapeuta lê os seus"
  on patient_specialties for select
  using (
    exists(
      select 1 from patients p
      where p.id = patient_specialties.patient_id
        and p.deleted = false
        and (
          p.primary_therapist_id = my_therapist_id()
          or exists(select 1 from patient_secondary_therapists pst where pst.patient_id = p.id and pst.therapist_id = my_therapist_id())
        )
    )
  );

create policy "patient_secondary_therapists: admin" on patient_secondary_therapists for all using (is_admin());
create policy "patient_secondary_therapists: terapeuta lê os seus"
  on patient_secondary_therapists for select
  using (therapist_id = my_therapist_id() or exists(
    select 1 from patients p
    where p.id = patient_secondary_therapists.patient_id
      and p.primary_therapist_id = my_therapist_id()
  ));

create policy "patient_conditions: admin" on patient_conditions for all using (is_admin());
create policy "patient_conditions: terapeuta lê os seus"
  on patient_conditions for select
  using (
    exists(
      select 1 from patients p
      where p.id = patient_conditions.patient_id
        and p.deleted = false
        and (
          p.primary_therapist_id = my_therapist_id()
          or exists(select 1 from patient_secondary_therapists pst where pst.patient_id = p.id and pst.therapist_id = my_therapist_id())
        )
    )
  );

-- ============================================================
-- RESPONSÁVEIS
-- Admin: CRUD completo
-- Terapeuta: vê responsáveis dos seus pacientes
-- ============================================================

create policy "guardians: admin gerencia" on guardians for all using (is_admin());

create policy "guardians: terapeuta lê dos seus pacientes"
  on guardians for select
  using (
    exists(
      select 1
      from patient_guardians pg
      join patients p on p.id = pg.patient_id
      where pg.guardian_id = guardians.id
        and p.deleted = false
        and (
          p.primary_therapist_id = my_therapist_id()
          or exists(select 1 from patient_secondary_therapists pst where pst.patient_id = p.id and pst.therapist_id = my_therapist_id())
        )
    )
  );

create policy "patient_guardians: admin" on patient_guardians for all using (is_admin());
create policy "patient_guardians: terapeuta lê dos seus"
  on patient_guardians for select
  using (
    exists(
      select 1 from patients p
      where p.id = patient_guardians.patient_id
        and p.deleted = false
        and (
          p.primary_therapist_id = my_therapist_id()
          or exists(select 1 from patient_secondary_therapists pst where pst.patient_id = p.id and pst.therapist_id = my_therapist_id())
        )
    )
  );

-- ============================================================
-- AGENDAMENTOS
-- Admin: CRUD completo
-- Terapeuta: acessa apenas os seus próprios
-- ============================================================

create policy "appointments: admin gerencia" on appointments for all using (is_admin());

create policy "appointments: terapeuta vê os seus"
  on appointments for select
  using (therapist_id = my_therapist_id());

create policy "appointments: terapeuta gerencia os seus"
  on appointments for all
  using (therapist_id = my_therapist_id());

-- ============================================================
-- CONSULTAS
-- Admin: CRUD completo
-- Terapeuta: acessa apenas as suas próprias
-- ============================================================

create policy "consultations: admin gerencia" on consultations for all using (is_admin());

create policy "consultations: terapeuta vê as suas"
  on consultations for select
  using (therapist_id = my_therapist_id());

create policy "consultations: terapeuta gerencia as suas"
  on consultations for all
  using (therapist_id = my_therapist_id());

-- Atividades das consultas — seguem a mesma regra da consulta pai
create policy "consultation_activities: admin" on consultation_activities for all using (is_admin());

create policy "consultation_activities: terapeuta gerencia as suas"
  on consultation_activities for all
  using (
    exists(
      select 1 from consultations c
      where c.id = consultation_activities.consultation_id
        and c.therapist_id = my_therapist_id()
    )
  );
