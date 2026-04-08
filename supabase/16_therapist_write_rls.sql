-- ============================================================
-- Espaço Casa Amarela — Migração 16
-- Políticas de escrita (INSERT/DELETE) para terapeutas
-- nas tabelas de pacientes e sub-tabelas relacionadas
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── PATIENTS — INSERT ───────────────────────────────────────
-- Terapeuta pode inserir paciente se for da equipe OU se se
-- colocar como gerente de conta (primary_therapist_id = si mesmo)
CREATE POLICY "patients: terapeuta insere"
  ON patients FOR INSERT
  WITH CHECK (
    my_belongs_to_team()
    OR primary_therapist_id = my_therapist_id()
  );

-- ─── PATIENT_SPECIALTIES — INSERT/DELETE ────────────────────
DROP POLICY IF EXISTS "patient_specialties: terapeuta gerencia os seus" ON patient_specialties;
CREATE POLICY "patient_specialties: terapeuta gerencia os seus"
  ON patient_specialties FOR ALL
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id()
          )
        )
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_specialties.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id()
          )
        )
    )
  );

-- ─── PATIENT_CONDITIONS — INSERT/DELETE ─────────────────────
DROP POLICY IF EXISTS "patient_conditions: terapeuta gerencia os seus" ON patient_conditions;
CREATE POLICY "patient_conditions: terapeuta gerencia os seus"
  ON patient_conditions FOR ALL
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_conditions.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id()
          )
        )
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_conditions.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id()
          )
        )
    )
  );

-- ─── PATIENT_EXTERNAL_THERAPISTS — INSERT/DELETE ─────────────
DROP POLICY IF EXISTS "therapist_write_ext_therapists" ON patient_external_therapists;
CREATE POLICY "therapist_write_ext_therapists"
  ON patient_external_therapists FOR ALL
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_external_therapists.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id()
          )
        )
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_external_therapists.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id()
          )
        )
    )
  );

-- ─── PATIENT_INVOLVED_THERAPISTS — INSERT/DELETE ─────────────
-- Terapeuta pode gerenciar envolvidos apenas em pacientes onde
-- é gerente de conta (primary_therapist_id) ou é da equipe.
-- Não referencia patient_involved_therapists no check para
-- evitar recursão após o DELETE no sync.
DROP POLICY IF EXISTS "patient_involved_therapists: terapeuta gerencia os seus" ON patient_involved_therapists;
CREATE POLICY "patient_involved_therapists: terapeuta gerencia os seus"
  ON patient_involved_therapists FOR ALL
  USING (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_involved_therapists.patient_id
        AND p.primary_therapist_id = my_therapist_id()
    )
  )
  WITH CHECK (
    my_belongs_to_team()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_involved_therapists.patient_id
        AND p.primary_therapist_id = my_therapist_id()
    )
  );
