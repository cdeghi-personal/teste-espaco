-- Adiciona colunas de valores por especialidade do paciente
ALTER TABLE patient_specialties ADD COLUMN IF NOT EXISTS patient_value  NUMERIC(10,2);
ALTER TABLE patient_specialties ADD COLUMN IF NOT EXISTS therapist_value NUMERIC(10,2);
