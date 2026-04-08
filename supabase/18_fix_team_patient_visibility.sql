-- ============================================================
-- Espaço Casa Amarela — Migração 18
-- Corrige visibilidade de pacientes para terapeuta da equipe:
-- vê pacientes onde o gerente de conta OU algum terapeuta
-- envolvido também pertence à equipe — NÃO vê pacientes
-- exclusivos de terapeutas fora da equipe.
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── Helper: paciente tem ao menos um terapeuta da equipe ────
-- Usada nas policies de SELECT para evitar repetição
-- Não referencia patient_involved_therapists nas policies de
-- patient_involved_therapists (sem recursão)
CREATE OR REPLACE FUNCTION patient_has_team_therapist(p_patient_id uuid)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM therapists t
    WHERE t.id = (SELECT primary_therapist_id FROM patients WHERE id = p_patient_id)
      AND t.belongs_to_team = true
  )
  OR EXISTS (
    SELECT 1 FROM patient_involved_therapists pit
    JOIN therapists t ON t.id = pit.therapist_id
    WHERE pit.patient_id = p_patient_id
      AND t.belongs_to_team = true
  );
$$;

-- ─── PATIENTS SELECT ─────────────────────────────────────────
DROP POLICY IF EXISTS "patients: terapeuta acessa os seus" ON patients;
CREATE POLICY "patients: terapeuta acessa os seus"
  ON patients FOR SELECT
  USING (
    deleted = false AND (
      primary_therapist_id = my_therapist_id()
      OR EXISTS (
        SELECT 1 FROM patient_involved_therapists pit
        WHERE pit.patient_id = patients.id
          AND pit.therapist_id = my_therapist_id()
      )
      OR (my_belongs_to_team() AND patient_has_team_therapist(patients.id))
    )
  );

-- ─── PATIENTS UPDATE (sem alteração de lógica) ───────────────
DROP POLICY IF EXISTS "patients: terapeuta edita os seus" ON patients;
CREATE POLICY "patients: terapeuta edita os seus"
  ON patients FOR UPDATE
  USING (
    deleted = false AND (
      primary_therapist_id = my_therapist_id()
      OR EXISTS (
        SELECT 1 FROM patient_involved_therapists pit
        WHERE pit.patient_id = patients.id
          AND pit.therapist_id = my_therapist_id()
      )
      OR (my_belongs_to_team() AND patient_has_team_therapist(patients.id))
    )
  );

-- ─── SUB-TABELAS: alinhar visibilidade com patients ──────────

DROP POLICY IF EXISTS "patient_specialties: terapeuta lê os seus" ON patient_specialties;
DROP POLICY IF EXISTS "patient_specialties: terapeuta gerencia os seus" ON patient_specialties;
CREATE POLICY "patient_specialties: terapeuta gerencia os seus"
  ON patient_specialties FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  );

DROP POLICY IF EXISTS "patient_conditions: terapeuta lê os seus" ON patient_conditions;
DROP POLICY IF EXISTS "patient_conditions: terapeuta gerencia os seus" ON patient_conditions;
CREATE POLICY "patient_conditions: terapeuta gerencia os seus"
  ON patient_conditions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_conditions.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_conditions.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  );

DROP POLICY IF EXISTS "guardians: terapeuta lê dos seus pacientes" ON guardians;
CREATE POLICY "guardians: terapeuta lê dos seus pacientes"
  ON guardians FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM patient_guardians pg
      JOIN patients p ON p.id = pg.patient_id
      WHERE pg.guardian_id = guardians.id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
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
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  );

DROP POLICY IF EXISTS "therapist_read_ext_therapists" ON patient_external_therapists;
DROP POLICY IF EXISTS "therapist_write_ext_therapists" ON patient_external_therapists;
CREATE POLICY "therapist_rw_ext_therapists"
  ON patient_external_therapists FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_external_therapists.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_external_therapists.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
          OR (my_belongs_to_team() AND patient_has_team_therapist(p.id))
        )
    )
  );

-- ─── PATIENT_INVOLVED_THERAPISTS — sem alteração (migration 17) ──
-- Já usa apenas my_belongs_to_team() e therapist_id = my_therapist_id()
-- sem referenciar patients → sem risco de recursão

-- ─── MEDICAL RECORDS — atualiza visibilidade ─────────────────
DROP POLICY IF EXISTS "therapist_rw_medical_records" ON medical_records;
CREATE POLICY "therapist_rw_medical_records"
  ON medical_records FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE p.id = medical_records.patient_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE p.id = medical_records.patient_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  );

DROP POLICY IF EXISTS "therapist_rw_mr_exams" ON medical_record_exams;
CREATE POLICY "therapist_rw_mr_exams"
  ON medical_record_exams FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_exams.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_exams.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  );

DROP POLICY IF EXISTS "therapist_rw_mr_medications" ON medical_record_medications;
CREATE POLICY "therapist_rw_mr_medications"
  ON medical_record_medications FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_medications.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_medications.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  );

DROP POLICY IF EXISTS "therapist_rw_mr_conducts" ON medical_record_conducts;
CREATE POLICY "therapist_rw_mr_conducts"
  ON medical_record_conducts FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_conducts.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medical_records mr
      JOIN patients p ON p.id = mr.patient_id
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE mr.id = medical_record_conducts.medical_record_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = th.id)
          OR (th.belongs_to_team = true AND patient_has_team_therapist(p.id))
        )
    )
  );
