-- ============================================================
-- Espaço Casa Amarela — Migração 15
-- Flag "Pertence Equipe" no terapeuta
-- Permite que terapeutas de equipe vejam todos os pacientes/prontuários
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── Coluna na tabela therapists ─────────────────────────────
ALTER TABLE therapists
  ADD COLUMN IF NOT EXISTS belongs_to_team BOOLEAN NOT NULL DEFAULT false;

-- ─── Função helper ───────────────────────────────────────────
-- Retorna true se o usuário autenticado é um terapeuta da equipe
CREATE OR REPLACE FUNCTION my_belongs_to_team()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM therapists
    WHERE user_id = auth.uid() AND belongs_to_team = true
  );
$$;

-- ─── PATIENTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "patients: terapeuta acessa os seus" ON patients;
CREATE POLICY "patients: terapeuta acessa os seus"
  ON patients FOR SELECT
  USING (
    deleted = false AND (
      my_belongs_to_team()
      OR primary_therapist_id = my_therapist_id()
      OR EXISTS (
        SELECT 1 FROM patient_involved_therapists pit
        WHERE pit.patient_id = patients.id
          AND pit.therapist_id = my_therapist_id()
      )
    )
  );

DROP POLICY IF EXISTS "patients: terapeuta edita os seus" ON patients;
CREATE POLICY "patients: terapeuta edita os seus"
  ON patients FOR UPDATE
  USING (
    deleted = false AND (
      my_belongs_to_team()
      OR primary_therapist_id = my_therapist_id()
      OR EXISTS (
        SELECT 1 FROM patient_involved_therapists pit
        WHERE pit.patient_id = patients.id
          AND pit.therapist_id = my_therapist_id()
      )
    )
  );

-- ─── PATIENT SUB-TABLES ──────────────────────────────────────

DROP POLICY IF EXISTS "patient_specialties: terapeuta lê os seus" ON patient_specialties;
CREATE POLICY "patient_specialties: terapeuta lê os seus"
  ON patient_specialties FOR SELECT
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
        )
    )
  );

DROP POLICY IF EXISTS "patient_conditions: terapeuta lê os seus" ON patient_conditions;
CREATE POLICY "patient_conditions: terapeuta lê os seus"
  ON patient_conditions FOR SELECT
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_conditions.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
        )
    )
  );

DROP POLICY IF EXISTS "guardians: terapeuta lê dos seus pacientes" ON guardians;
CREATE POLICY "guardians: terapeuta lê dos seus pacientes"
  ON guardians FOR SELECT
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1
      FROM patient_guardians pg
      JOIN patients p ON p.id = pg.patient_id
      WHERE pg.guardian_id = guardians.id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
        )
    )
  );

DROP POLICY IF EXISTS "patient_guardians: terapeuta lê dos seus" ON patient_guardians;
CREATE POLICY "patient_guardians: terapeuta lê dos seus"
  ON patient_guardians FOR SELECT
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_guardians.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
        )
    )
  );

DROP POLICY IF EXISTS "therapist_read_ext_therapists" ON patient_external_therapists;
CREATE POLICY "therapist_read_ext_therapists"
  ON patient_external_therapists FOR SELECT
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_external_therapists.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
        )
    )
  );

-- Pertence equipe: pode ver todos os envolvidos de qualquer paciente
-- (sem recursão: my_belongs_to_team só acessa therapists)
DROP POLICY IF EXISTS "patient_involved_therapists: terapeuta lê os seus" ON patient_involved_therapists;
CREATE POLICY "patient_involved_therapists: terapeuta lê os seus"
  ON patient_involved_therapists FOR SELECT
  USING (
    my_belongs_to_team()
    OR therapist_id = my_therapist_id()
  );

-- ─── MEDICAL RECORDS ─────────────────────────────────────────

DROP POLICY IF EXISTS "therapist_rw_medical_records" ON medical_records;
CREATE POLICY "therapist_rw_medical_records"
  ON medical_records FOR ALL TO authenticated
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE p.id = medical_records.patient_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE p.id = medical_records.patient_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  );

DROP POLICY IF EXISTS "therapist_rw_mr_exams" ON medical_record_exams;
CREATE POLICY "therapist_rw_mr_exams"
  ON medical_record_exams FOR ALL TO authenticated
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_exams.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_exams.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  );

DROP POLICY IF EXISTS "therapist_rw_mr_medications" ON medical_record_medications;
CREATE POLICY "therapist_rw_mr_medications"
  ON medical_record_medications FOR ALL TO authenticated
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_medications.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_medications.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  );

DROP POLICY IF EXISTS "therapist_rw_mr_conducts" ON medical_record_conducts;
CREATE POLICY "therapist_rw_mr_conducts"
  ON medical_record_conducts FOR ALL TO authenticated
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_conducts.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_conducts.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
        )
    )
  );
