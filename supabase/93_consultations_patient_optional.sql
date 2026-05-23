-- Migration 93: torna patient_id opcional em consultations
-- Necessário para suportar entrevistas (event_type = 'INTERVIEW') sem paciente vinculado.
-- A FK continua existindo — quando preenchido, deve referenciar um paciente válido.

ALTER TABLE public.consultations
  ALTER COLUMN patient_id DROP NOT NULL;
