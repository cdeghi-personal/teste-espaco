-- ============================================================
-- Espaço Casa Amarela — Migração 14
-- Corrige RLS de medical_records e patients para terapeutas envolvidos
-- Rodar no Supabase SQL Editor
-- ============================================================

-- ─── PATIENTS ────────────────────────────────────────────────
-- Reaplica policies garantindo cobertura de gerente + envolvido

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

-- ─── MEDICAL RECORDS ─────────────────────────────────────────
-- Cobre gerente de conta + envolvidos, e permite INSERT (getOrCreateMedicalRecord)

DROP POLICY IF EXISTS "therapist_read_medical_records" ON medical_records;
CREATE POLICY "therapist_rw_medical_records"
  ON medical_records FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      JOIN therapists th ON th.user_id = auth.uid()
      WHERE p.id = medical_records.patient_id
        AND (
          p.primary_therapist_id = th.id
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = th.id
          )
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
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id AND pit.therapist_id = th.id
          )
        )
    )
  );

DROP POLICY IF EXISTS "therapist_read_mr_exams" ON medical_record_exams;
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
        )
    )
  );
