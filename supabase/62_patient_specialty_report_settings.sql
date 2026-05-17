-- Migration 62: Tabela patient_specialty_report_settings
-- Persiste o campo "desafios relacionados" do Encaminhamento por paciente + especialidade.
-- Separado de patient_specialties para não quebrar o sync delete+insert dessa tabela.

CREATE TABLE IF NOT EXISTS patient_specialty_report_settings (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  specialty    text NOT NULL,
  referral_challenges text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (patient_id, specialty)
);

ALTER TABLE patient_specialty_report_settings ENABLE ROW LEVEL SECURITY;

-- Admin vê e edita tudo
CREATE POLICY "admin_all_patient_specialty_report_settings"
  ON patient_specialty_report_settings FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Terapeuta: SELECT para pacientes que ele atende (gerente ou envolvido)
CREATE POLICY "therapist_select_patient_specialty_report_settings"
  ON patient_specialty_report_settings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_id
        AND (
          p.primary_therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id
              AND pit.therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
          )
        )
    )
  );

-- Terapeuta: INSERT
CREATE POLICY "therapist_insert_patient_specialty_report_settings"
  ON patient_specialty_report_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_id
        AND (
          p.primary_therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id
              AND pit.therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
          )
        )
    )
  );

-- Terapeuta: UPDATE
CREATE POLICY "therapist_update_patient_specialty_report_settings"
  ON patient_specialty_report_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients p
      WHERE p.id = patient_id
        AND (
          p.primary_therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
          OR EXISTS (
            SELECT 1 FROM patient_involved_therapists pit
            WHERE pit.patient_id = p.id
              AND pit.therapist_id = (SELECT id FROM therapists WHERE user_id = auth.uid() LIMIT 1)
          )
        )
    )
  );
