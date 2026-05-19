-- 78_consultations_nf_fields.sql
-- Adiciona campos de nota fiscal e status anterior em consultations.

ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS nf_number                    TEXT,
  ADD COLUMN IF NOT EXISTS nf_issue_date                DATE,
  ADD COLUMN IF NOT EXISTS previous_status_before_invoice UUID REFERENCES consultation_statuses(id);

-- Índice para facilitar consultas por NF
CREATE INDEX IF NOT EXISTS consultations_nf_number_idx ON consultations(nf_number) WHERE nf_number IS NOT NULL;
