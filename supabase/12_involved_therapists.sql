-- ============================================================
-- Espaço Casa Amarela — Migração 12
-- Terapeutas Envolvidos no Atendimento do Paciente
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── Tabela: terapeutas envolvidos no atendimento ────────────
CREATE TABLE IF NOT EXISTS patient_involved_therapists (
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  therapist_id uuid NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
  PRIMARY KEY (patient_id, therapist_id)
);

ALTER TABLE patient_involved_therapists ENABLE ROW LEVEL SECURITY;

-- Admin: gerencia tudo
CREATE POLICY "patient_involved_therapists: admin"
  ON patient_involved_therapists FOR ALL
  USING (is_admin());

-- Terapeuta: lê onde é envolvido OU é gerente de conta do paciente
CREATE POLICY "patient_involved_therapists: terapeuta lê os seus"
  ON patient_involved_therapists FOR SELECT
  USING (
    therapist_id = my_therapist_id()
    OR EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_involved_therapists.patient_id
        AND p.primary_therapist_id = my_therapist_id()
    )
  );

-- ─── Atualiza políticas de pacientes ─────────────────────────
-- Terapeuta acessa pacientes onde é Gerente de Conta OU Envolvido

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
    )
  );

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
    )
  );

DROP POLICY IF EXISTS "patient_specialties: terapeuta lê os seus" ON patient_specialties;
CREATE POLICY "patient_specialties: terapeuta lê os seus"
  ON patient_specialties FOR SELECT
  USING (
    EXISTS (
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
    EXISTS (
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
    EXISTS (
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
    EXISTS (
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
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_external_therapists.patient_id
        AND p.deleted = false
        AND (
          p.primary_therapist_id = my_therapist_id()
          OR EXISTS (SELECT 1 FROM patient_involved_therapists pit WHERE pit.patient_id = p.id AND pit.therapist_id = my_therapist_id())
        )
    )
  );
