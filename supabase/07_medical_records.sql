-- ============================================================
-- Espaço Casa Amarela — Migração 07
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── Remove tabelas antigas do prontuário ────────────────────
DROP TABLE IF EXISTS therapeutic_plans;
DROP TABLE IF EXISTS patient_assessments;
DROP TABLE IF EXISTS patient_clinical_history;
DROP TABLE IF EXISTS patient_family_context;

-- ─── Remove tabela de terapeutas secundários ─────────────────
-- CASCADE remove as policies que dependem desta tabela; elas são recriadas abaixo
DROP TABLE IF EXISTS patient_secondary_therapists CASCADE;

-- ─── Recriar policies afetadas pelo CASCADE ───────────────────
-- (terapeuta agora acessa apenas pacientes onde é terapeuta principal)

DROP POLICY IF EXISTS "patients: terapeuta acessa os seus" ON patients;
CREATE POLICY "patients: terapeuta acessa os seus"
  ON patients FOR SELECT
  USING (deleted = false AND primary_therapist_id = my_therapist_id());

DROP POLICY IF EXISTS "patients: terapeuta edita os seus" ON patients;
CREATE POLICY "patients: terapeuta edita os seus"
  ON patients FOR UPDATE
  USING (deleted = false AND primary_therapist_id = my_therapist_id());

DROP POLICY IF EXISTS "patient_specialties: terapeuta lê os seus" ON patient_specialties;
CREATE POLICY "patient_specialties: terapeuta lê os seus"
  ON patient_specialties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND p.primary_therapist_id = my_therapist_id()
    )
  );

DROP POLICY IF EXISTS "patient_conditions: terapeuta lê os seus" ON patient_conditions;
CREATE POLICY "patient_conditions: terapeuta lê os seus"
  ON patient_conditions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_conditions.patient_id
        AND p.deleted = false
        AND p.primary_therapist_id = my_therapist_id()
    )
  );

DROP POLICY IF EXISTS "guardians: terapeuta lê dos seus pacientes" ON guardians;
CREATE POLICY "guardians: terapeuta lê dos seus pacientes"
  ON guardians FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patient_guardians pg
      JOIN patients p ON p.id = pg.patient_id
      WHERE pg.guardian_id = guardians.id
        AND p.deleted = false
        AND p.primary_therapist_id = my_therapist_id()
    )
  );

DROP POLICY IF EXISTS "patient_guardians: terapeuta lê dos seus" ON patient_guardians;
CREATE POLICY "patient_guardians: terapeuta lê dos seus"
  ON patient_guardians FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_guardians.patient_id
        AND p.deleted = false
        AND p.primary_therapist_id = my_therapist_id()
    )
  );

DROP POLICY IF EXISTS "therapist_read_ext_therapists" ON patient_external_therapists;
CREATE POLICY "therapist_read_ext_therapists"
  ON patient_external_therapists FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_external_therapists.patient_id
        AND p.deleted = false
        AND p.primary_therapist_id = my_therapist_id()
    )
  );

-- ─── CPF no terapeuta ─────────────────────────────────────────
ALTER TABLE therapists ADD COLUMN IF NOT EXISTS cpf text;

-- ─── Status da Consulta ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_statuses (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text NOT NULL DEFAULT 'bg-gray-100 text-gray-700',
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consultation_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_consultation_statuses" ON consultation_statuses
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "therapist_read_consultation_statuses" ON consultation_statuses
  FOR SELECT TO authenticated USING (true);

-- Adiciona status_id à tabela de consultas
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS consultation_status_id uuid REFERENCES consultation_statuses(id) ON DELETE SET NULL;

-- Dados iniciais de status de consulta
INSERT INTO consultation_statuses (name, color) VALUES
  ('Realizada',     'bg-green-100 text-green-700'),
  ('Faltou',        'bg-red-100 text-red-700'),
  ('Cancelada',     'bg-yellow-100 text-yellow-700'),
  ('Remarcada',     'bg-blue-100 text-blue-700')
ON CONFLICT DO NOTHING;

-- ─── Prontuário Clínico ───────────────────────────────────────

-- Registro mestre (1:1 com paciente)
CREATE TABLE IF NOT EXISTS medical_records (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES patients(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Exames Complementares
CREATE TABLE IF NOT EXISTS medical_record_exams (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  description       text NOT NULL,
  exam_date         date,
  attachment_url    text,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Medicamentos
CREATE TABLE IF NOT EXISTS medical_record_medications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  medication        text NOT NULL,
  registration_date date NOT NULL DEFAULT CURRENT_DATE,
  status            text NOT NULL DEFAULT 'ativa', -- 'ativa' | 'interrompida'
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Conduta & Objetivo Terapêutico
CREATE TABLE IF NOT EXISTS medical_record_conducts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medical_record_id uuid NOT NULL REFERENCES medical_records(id) ON DELETE CASCADE,
  therapist_id      uuid REFERENCES therapists(id) ON DELETE SET NULL,
  specialty         text,
  conduct           text,
  objective         text,
  start_date        date,
  end_date          date,
  status            text NOT NULL DEFAULT 'nao_iniciada', -- 'nao_iniciada' | 'em_andamento' | 'encerrada' | 'cancelada'
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS para prontuário ──────────────────────────────────────

ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_record_conducts ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_all_medical_records" ON medical_records
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_mr_exams" ON medical_record_exams
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_mr_medications" ON medical_record_medications
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "admin_all_mr_conducts" ON medical_record_conducts
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Terapeuta: lê prontuários dos seus pacientes
CREATE POLICY "therapist_read_medical_records" ON medical_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE p.id = patient_id
        AND (p.primary_therapist_id = th.id)
    )
  );

CREATE POLICY "therapist_read_mr_exams" ON medical_record_exams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_id AND p.primary_therapist_id = th.id
    )
  );

CREATE POLICY "therapist_rw_mr_medications" ON medical_record_medications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_id AND p.primary_therapist_id = th.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_id AND p.primary_therapist_id = th.id
    )
  );

CREATE POLICY "therapist_rw_mr_conducts" ON medical_record_conducts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_id AND p.primary_therapist_id = th.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_id AND p.primary_therapist_id = th.id
    )
  );
