-- 72_patient_needs_convenio_report.sql
-- Adiciona flag needs_convenio_report em patients.
-- Quando true, o paciente aparece na lista do Relatório de Convênio.
-- A seleção de pacientes em /admin/relatorios/convenio filtra por esta flag.

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS needs_convenio_report boolean NOT NULL DEFAULT false;
