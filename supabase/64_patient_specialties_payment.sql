-- Etapa 1: campos de pagamento por paciente + especialidade

-- Novos campos em patient_specialties
ALTER TABLE patient_specialties
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'POST_PER_SESSION',
  ADD COLUMN IF NOT EXISTS monthly_patient_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS monthly_therapist_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS payment_notes text;

-- Constraint de validação dos tipos de pagamento
ALTER TABLE patient_specialties
  DROP CONSTRAINT IF EXISTS patient_specialties_payment_type_check;

ALTER TABLE patient_specialties
  ADD CONSTRAINT patient_specialties_payment_type_check
  CHECK (payment_type IN ('POST_PER_SESSION', 'POST_MONTHLY', 'PREPAID_PACKAGE'));

-- Unique constraint necessária para upsert seguro em edições futuras
ALTER TABLE patient_specialties
  DROP CONSTRAINT IF EXISTS patient_specialties_patient_specialty_unique;

ALTER TABLE patient_specialties
  ADD CONSTRAINT patient_specialties_patient_specialty_unique
  UNIQUE (patient_id, specialty);
