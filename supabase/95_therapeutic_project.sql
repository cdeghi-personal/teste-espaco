-- Adiciona campos de Projeto Terapêutico à tabela medical_records (1:1 por prontuário)
ALTER TABLE medical_records
  ADD COLUMN IF NOT EXISTS therapeutic_project_description TEXT,
  ADD COLUMN IF NOT EXISTS therapeutic_project_notes TEXT;
