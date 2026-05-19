-- 74_contact_leads_new_fields.sql
-- Adiciona novos campos ao formulário de contato público:
--   patient_name  — nome do paciente/filho (opcional)
--   contact_reason — motivo do contato (select)
--   referred_by    — nome do indicador (preenchido quando how_found = Indicação)

ALTER TABLE contact_leads
  ADD COLUMN IF NOT EXISTS patient_name  TEXT,
  ADD COLUMN IF NOT EXISTS contact_reason TEXT,
  ADD COLUMN IF NOT EXISTS referred_by   TEXT;
