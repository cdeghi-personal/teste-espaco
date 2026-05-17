-- Etapa 1: histórico de alterações de pagamento por paciente + especialidade

CREATE TABLE IF NOT EXISTS patient_specialty_payment_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  old_payment_type text,
  new_payment_type text,
  old_patient_value numeric(10,2),
  new_patient_value numeric(10,2),
  old_therapist_value numeric(10,2),
  new_therapist_value numeric(10,2),
  old_monthly_patient_value numeric(10,2),
  new_monthly_patient_value numeric(10,2),
  old_monthly_therapist_value numeric(10,2),
  new_monthly_therapist_value numeric(10,2),
  changed_by uuid,
  changed_at timestamptz DEFAULT now(),
  notes text
);

ALTER TABLE patient_specialty_payment_history ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
CREATE POLICY "admin_all" ON patient_specialty_payment_history
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Terapeuta: leitura dos próprios pacientes (Gerente do Caso ou Envolvido)
CREATE POLICY "therapist_select" ON patient_specialty_payment_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM therapists t
      WHERE t.user_id = auth.uid()
        AND (
          EXISTS (
            SELECT 1 FROM patients p
            WHERE p.id = patient_specialty_payment_history.patient_id
              AND (
                p.primary_therapist_id = t.id
                OR EXISTS (
                  SELECT 1 FROM patient_involved_therapists pit
                  WHERE pit.patient_id = p.id AND pit.therapist_id = t.id
                )
              )
          )
        )
    )
  );
