-- 108_anamnesis.sql
-- Adiciona campos de Anamnese / HPMA à tabela medical_records (1:1 por prontuário).
-- Mesmo padrão do Projeto Terapêutico (migration 102).
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS anamnesis_description TEXT,
  ADD COLUMN IF NOT EXISTS anamnesis_notes TEXT;
