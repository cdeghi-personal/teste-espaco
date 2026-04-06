-- ============================================================
-- Espaço Casa Amarela — Migração 06: Novos campos
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── TERAPEUTAS: corrige bug "credential column not found" ───
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS credential     text,
  ADD COLUMN IF NOT EXISTS bank           text,
  ADD COLUMN IF NOT EXISTS agency         text,
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS pix_key        text;

-- ─── TERAPEUTAS: múltiplas especialidades com registro ───────
CREATE TABLE IF NOT EXISTS therapist_specialties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  specialty    text NOT NULL,
  credential   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(therapist_id, specialty)
);

ALTER TABLE therapist_specialties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_therapist_specialties" ON therapist_specialties
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "therapist_read_own_specialties" ON therapist_specialties
  FOR SELECT TO authenticated
  USING (therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid()));

-- ─── PACIENTES: campos extras ─────────────────────────────────
ALTER TABLE patients
  -- Dados pessoais
  ADD COLUMN IF NOT EXISTS rg            text,
  ADD COLUMN IF NOT EXISTS phone         text,
  ADD COLUMN IF NOT EXISTS email         text,
  ADD COLUMN IF NOT EXISTS address       text,
  ADD COLUMN IF NOT EXISTS neighborhood  text,
  ADD COLUMN IF NOT EXISTS city          text,
  ADD COLUMN IF NOT EXISTS state         text,
  ADD COLUMN IF NOT EXISTS zip_code      text,
  ADD COLUMN IF NOT EXISTS indication    text,
  -- Dados escolares
  ADD COLUMN IF NOT EXISTS school_name         text,
  ADD COLUMN IF NOT EXISTS school_phone        text,
  ADD COLUMN IF NOT EXISTS school_address      text,
  ADD COLUMN IF NOT EXISTS school_neighborhood text,
  ADD COLUMN IF NOT EXISTS school_city         text,
  ADD COLUMN IF NOT EXISTS school_state        text,
  ADD COLUMN IF NOT EXISTS school_zip          text,
  ADD COLUMN IF NOT EXISTS school_coordinator  text,
  -- Médico responsável
  ADD COLUMN IF NOT EXISTS doctor_insurance  text,
  ADD COLUMN IF NOT EXISTS doctor_name       text,
  ADD COLUMN IF NOT EXISTS doctor_specialty  text,
  ADD COLUMN IF NOT EXISTS doctor_phone      text;

-- ─── PACIENTES: terapeutas externos ─────────────────────────
CREATE TABLE IF NOT EXISTS patient_external_therapists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name       text NOT NULL,
  specialty  text,
  phone      text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE patient_external_therapists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_ext_therapists" ON patient_external_therapists
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "therapist_read_ext_therapists" ON patient_external_therapists
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE p.id = patient_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (
            SELECT 1 FROM patient_secondary_therapists pst
            WHERE pst.patient_id = p.id AND pst.therapist_id = th.id
          )
        )
    )
  );
